import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeAdmin, eqValue, type FakeAdmin } from "@/test/fake-supabase";

/**
 * Cloisonnement multi-tenant.
 *
 * C'est la garantie la plus critique du produit : un coach ne doit jamais
 * pouvoir lire les clients, les ventes ou les prospects d'un autre. Elle ne
 * tenait jusqu'ici qu'à la discipline du code, un `.eq("tenant_id", …)` répété
 * à la main dans chaque requête. Une omission serait passée inaperçue jusqu'à
 * ce qu'un client la découvre.
 *
 * Ces tests vérifient la CONTRAINTE, pas le résultat : ils regardent quels
 * filtres partent vers la base. Un test qui comparerait des lignes renvoyées
 * passerait tout aussi bien sans le moindre filtre.
 */

const TENANT = "11111111-1111-1111-1111-111111111111";
const AUTRE = "22222222-2222-2222-2222-222222222222";

/** Tables dont chaque ligne appartient à un tenant précis. */
const TABLES_CLOISONNEES = ["profiles", "offers", "prospects", "orders", "plans"];

let fake: FakeAdmin;

beforeEach(() => {
  vi.resetModules();
});

function install(rows: Record<string, unknown[]> = {}) {
  fake = fakeAdmin(rows);
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
  return fake;
}

/** Aucune lecture d'une table cloisonnée ne doit sortir du tenant demandé. */
function attendreCloisonnement(f: FakeAdmin, tenantId: string) {
  const fautives: string[] = [];
  for (const q of f.queries) {
    if (!TABLES_CLOISONNEES.includes(q.table)) continue;
    // Une requête peut cibler des lignes précises par identifiant (`id`), ou
    // un lot déjà restreint en amont (`in`) : dans ces cas le cloisonnement
    // est porté par la sélection elle-même.
    const parId = q.filters.some((x) => x.op === "eq" && x.column === "id");
    const parLot = q.filters.some((x) => x.op === "in");
    if (parId || parLot) continue;
    const t = eqValue(q, "tenant_id");
    if (t !== tenantId) fautives.push(`${q.table} (tenant_id=${String(t)})`);
  }
  expect(fautives, "requêtes non cloisonnées").toEqual([]);
}

describe("tableau de bord coach", () => {
  it("ne lit que les données du tenant appelant", async () => {
    const f = install({
      profiles: [{ created_at: "2026-09-01T00:00:00Z", paid: true, selected_offer_id: null, selected_interval: null, subscription_interval: null, subscription_status: null }],
      offers: [],
      prospects: [],
      orders: [],
      tenants: [{ client_limit: 10 }],
      credit_wallets: [{ credits: 0 }],
      ai_calls: [],
    });
    const { coachDashboard } = await import("@/lib/dashboard");
    await coachDashboard(TENANT);
    attendreCloisonnement(f, TENANT);
    // Et le tableau interroge bien les tables attendues, sinon le test
    // passerait sur un dashboard qui ne lit rien.
    expect(f.on("profiles").length).toBeGreaterThan(0);
    expect(f.on("orders").length).toBeGreaterThan(0);
  });

  it("ne mélange pas deux tenants entre deux appels", async () => {
    const f = install({ profiles: [], offers: [], prospects: [], orders: [], tenants: [{ client_limit: null }], credit_wallets: [], ai_calls: [] });
    const { coachDashboard } = await import("@/lib/dashboard");
    await coachDashboard(TENANT);
    const avant = f.queries.length;
    await coachDashboard(AUTRE);
    // Les requêtes du second appel portent toutes le second tenant.
    const secondes = { ...f, queries: f.queries.slice(avant), on: (t: string) => f.queries.slice(avant).filter((q) => q.table === t) };
    attendreCloisonnement(secondes as FakeAdmin, AUTRE);
  });
});

describe("journal des ventes", () => {
  it("ne rend que les ventes du tenant demandé", async () => {
    const f = install({ orders: [] });
    const { tenantOrders } = await import("@/lib/orders");
    await tenantOrders(TENANT);
    expect(eqValue(f.on("orders")[0], "tenant_id")).toBe(TENANT);
  });

  it("écrit la vente sous le tenant fourni, pas sous un autre", async () => {
    const f = install({ orders: [] });
    const { recordOrder } = await import("@/lib/orders");
    await recordOrder({ tenantId: TENANT, userId: "u1", kind: "one_time", amountCents: 100, stripeRef: "cs_1" });
    const insert = f.on("orders").find((q) => q.filters.some((x) => x.op === "insert"));
    const payload = insert?.filters.find((x) => x.op === "insert")?.value as Record<string, unknown>;
    expect(payload.tenant_id).toBe(TENANT);
  });

  it("refuse une référence Stripe qui ne ressemble pas à un identifiant", async () => {
    // Le remboursement construit un filtre PostgREST par concaténation : une
    // référence contenant une virgule ou une parenthèse pourrait détourner le
    // filtre et toucher des lignes d'autres comptes.
    install({ orders: [] });
    const { markOrderRefunded } = await import("@/lib/orders");
    expect(await markOrderRefunded("pi_1,tenant_id.neq.x")).toBe(false);
    expect(await markOrderRefunded("pi_1)")).toBe(false);
    expect(await markOrderRefunded("")).toBe(false);
  });
});

describe("capacité et comptage des clients", () => {
  it("compte les clients du seul tenant demandé", async () => {
    const f = install({ profiles: [], tenants: [{ client_limit: 5 }] });
    const { tenantCapacity } = await import("@/lib/entitlements");
    await tenantCapacity(TENANT);
    for (const q of f.on("profiles")) expect(eqValue(q, "tenant_id")).toBe(TENANT);
  });
});

describe("réseau du revendeur", () => {
  it("ne descend que d'un cran, sur les enfants du parent demandé", async () => {
    const f = install({ tenants: [], profiles: [] });
    const { listChildTenants } = await import("@/lib/hierarchy");
    await listChildTenants(TENANT);
    expect(eqValue(f.on("tenants")[0], "parent_id")).toBe(TENANT);
  });
});

describe("réconciliation des paiements", () => {
  it("refuse de débloquer un client qui appartient à un autre coach", async () => {
    // Une session Stripe porte un identifiant de client dans ses métadonnées.
    // Si ce client est rattaché à un AUTRE tenant, le rattrapage doit passer
    // son chemin plutôt que de le marquer payé sur la foi d'une métadonnée.
    const f = install({
      tenant_secrets: [{ tenant_id: TENANT }],
      profiles: [{ paid: false, tenant_id: AUTRE, selected_offer_id: null }],
      orders: [],
    });
    vi.doMock("@/lib/crypto", () => ({
      decryptSecret: () => "sk_test_x",
      encryptSecret: (v: string) => v,
      keyHint: () => "x",
      secretsEncryptionReady: () => true,
    }));
    vi.doMock("stripe", () => ({
      default: class {
        checkout = {
          sessions: {
            list: async () => ({
              data: [
                {
                  id: "cs_1",
                  payment_status: "paid",
                  mode: "payment",
                  amount_total: 14900,
                  currency: "eur",
                  created: 1_780_000_000,
                  metadata: { user_id: "client-d-un-autre" },
                },
              ],
            }),
          },
        };
      },
    }));
    const { reconcileTenantPayments } = await import("@/lib/coach-payments");
    const res = await reconcileTenantPayments();
    expect(res.activated).toBe(0);
    // Rien n'a été écrit : ni activation, ni vente.
    const ecritures = f.queries.filter((q) => q.filters.some((x) => x.op === "update" || x.op === "insert"));
    expect(ecritures).toEqual([]);
  });
});

describe("palette de recherche", () => {
  async function chercher(terme: string) {
    const f = install({ profiles: [], prospects: [] });
    vi.doMock("@/lib/admin", () => ({
      getAdminOrNull: async () => ({ userId: "coach", email: "c@x.fr", profile: { tenant_id: TENANT, role: "owner" } }),
    }));
    const { GET } = await import("@/app/api/admin/search/route");
    const res = await GET(new Request(`http://x/api/admin/search?q=${encodeURIComponent(terme)}`));
    return { f, res };
  }

  it("cloisonne clients et prospects au tenant de l'appelant", async () => {
    const { f } = await chercher("dupont");
    expect(eqValue(f.on("profiles")[0], "tenant_id")).toBe(TENANT);
    expect(eqValue(f.on("prospects")[0], "tenant_id")).toBe(TENANT);
  });

  it("neutralise les caractères qui feraient sortir le motif de recherche", async () => {
    // Sans échappement, « % » ramènerait tout le fichier client, et une
    // virgule ajouterait une CONDITION au filtre `or` au lieu de rester du
    // texte recherché. Le mot « neq » peut subsister tel quel : à l'intérieur
    // du motif ce n'est qu'une suite de lettres à chercher.
    const { f } = await chercher("%,tenant_id.neq.0");
    const filtre = f.on("profiles")[0].filters.find((x) => x.op === "or")?.value as string;
    // Deux clauses attendues, nom et e-mail. Une troisième signifierait qu'une
    // virgule du terme saisi a été prise pour un séparateur.
    expect(filtre.split(",")).toHaveLength(2);
    for (const clause of filtre.split(",")) {
      const motif = clause.replace(/^\w+\.ilike\./, "");
      // Le motif est encadré de deux « % », et ne doit en contenir aucun autre.
      expect(motif.startsWith("%") && motif.endsWith("%")).toBe(true);
      expect(motif.slice(1, -1)).not.toMatch(/[%_,()]/);
    }
  });

  it("refuse de répondre à un appelant sans tenant", async () => {
    install({});
    vi.doMock("@/lib/admin", () => ({ getAdminOrNull: async () => null }));
    const { GET } = await import("@/app/api/admin/search/route");
    const res = await GET(new Request("http://x/api/admin/search?q=dupont"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ people: [] });
  });
});

describe("mode assistance d'un coach sur son client", () => {
  // Cette garde ouvre la session de quelqu'un d'autre. Elle doit refuser tout
  // ce qui n'est pas exactement « un compte de rôle client, dans MON tenant ».
  async function autorise(row: Record<string, unknown> | undefined) {
    install({ profiles: row ? [row] : [] });
    const { isOwnClient } = await import("@/lib/support-access");
    return isOwnClient(TENANT, "cible");
  }

  it("autorise un client de son propre tenant", async () => {
    expect(await autorise({ tenant_id: TENANT, role: "client" })).toBe(true);
  });

  it("refuse le client d'un autre coach", async () => {
    expect(await autorise({ tenant_id: AUTRE, role: "client" })).toBe(false);
  });

  it("refuse le compte propriétaire, même dans son tenant", async () => {
    // Sinon un coach salarié d'une salle prendrait la main sur le compte du
    // gérant, avec sa facturation et ses réglages.
    expect(await autorise({ tenant_id: TENANT, role: "owner" })).toBe(false);
    expect(await autorise({ tenant_id: TENANT, role: "coach" })).toBe(false);
  });

  it("refuse un compte introuvable ou sans tenant", async () => {
    expect(await autorise(undefined)).toBe(false);
    expect(await autorise({ tenant_id: null, role: "client" })).toBe(false);
  });

  it("refuse quand l'appelant n'a pas de tenant", async () => {
    install({ profiles: [{ tenant_id: TENANT, role: "client" }] });
    const { isOwnClient } = await import("@/lib/support-access");
    expect(await isOwnClient("", "cible")).toBe(false);
    expect(await isOwnClient(TENANT, "")).toBe(false);
  });
});
