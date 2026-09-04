import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeAdmin, eqValue, type FakeAdmin } from "@/test/fake-supabase";

/**
 * Comptage du réseau, et paliers posés par le parent.
 *
 * Deux corrections tenues par ces tests. Un revendeur n'a aucun client en
 * direct : la plateforme lui affichait « 0 client » alors que son réseau en
 * comptait. Et un parent doit pouvoir offrir un palier sans que ce geste
 * ouvre une porte : il ne s'applique qu'à ses propres enfants, avec ses
 * propres paliers.
 */

const PLATEFORME = "11111111-1111-1111-1111-111111111111";
const REVENDEUR = "22222222-2222-2222-2222-222222222222";
const COACH = "33333333-3333-3333-3333-333333333333";
const ETRANGER = "99999999-9999-9999-9999-999999999999";

let fake: FakeAdmin;

beforeEach(() => {
  vi.resetModules();
});

function install(rows: Record<string, unknown[]> = {}) {
  fake = fakeAdmin(rows);
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
  return fake;
}

describe("comptage des comptes du réseau", () => {
  it("attribue au revendeur les clients de ses coachs, pas les siens", async () => {
    // La plateforme liste ses enfants : un revendeur, qui n'a lui-même aucun
    // profil client, mais dont le coach en a deux.
    // Deux lectures successives de `tenants` (les enfants, puis leurs propres
    // enfants) et de `profiles` (ceux des enfants, puis ceux des petits-enfants).
    const f = fakeAdmin(
      {},
      {
        tenants: [
          [{ id: REVENDEUR, name: "Revendeur", slug: "rev", kind: "reseller", client_limit: 1, plan_id: null, sub_status: null, suspended_at: null, suspended_reason: null, ai_supply: "byok", ai_mode: null }],
          [{ id: COACH, parent_id: REVENDEUR }],
        ],
        profiles: [[], [{ tenant_id: COACH }, { tenant_id: COACH }]],
      },
    );
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => f.client }));
    const { listChildTenants } = await import("@/lib/hierarchy");
    const [rev] = await listChildTenants(PLATEFORME);
    expect(rev.clientCount).toBe(0);
    expect(rev.networkClientCount).toBe(2);
    expect(rev.childCount).toBe(1);
  });

  it("ne descend pas sous un coach, qui n'a pas d'enfants", async () => {
    const f = fakeAdmin(
      {},
      {
        tenants: [[{ id: COACH, name: "Coach", slug: "c", kind: "coach", client_limit: 5, plan_id: null, sub_status: null, suspended_at: null, suspended_reason: null, ai_supply: "byok", ai_mode: null }]],
        profiles: [[{ tenant_id: COACH, id: "u1", role: "client" }]],
      },
    );
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => f.client }));
    const { listChildTenants } = await import("@/lib/hierarchy");
    const [c] = await listChildTenants(REVENDEUR);
    expect(c.clientCount).toBe(1);
    expect(c.networkClientCount).toBe(1);
    expect(c.childCount).toBe(0);
    // Une seule lecture de `tenants` : celle des enfants. Pas de descente.
    expect(f.on("tenants").length).toBe(1);
  });
});

describe("palier posé par le parent", () => {
  async function poser(cible: { parent_id: string | null; sub_id?: string | null }, planId: string | null, planOwner = PLATEFORME) {
    const f = install({
      tenants: [{ parent_id: cible.parent_id, sub_id: cible.sub_id ?? null }],
      plans: planId ? [{ id: planId, tenant_id: planOwner, client_limit: 25, name: "Pro" }] : [],
    });
    const { grantTenantPlan } = await import("@/lib/tenant-billing");
    const res = await grantTenantPlan(PLATEFORME, REVENDEUR, planId);
    const write = f.on("tenants").find((q) => q.filters.some((x) => x.op === "update"));
    const payload = write?.filters.find((x) => x.op === "update")?.value as Record<string, unknown> | undefined;
    return { res, payload, write, f };
  }

  it("refuse un compte qui n'est pas son enfant direct", async () => {
    const { res, write } = await poser({ parent_id: ETRANGER }, "plan-1");
    expect(res.ok).toBe(false);
    expect(write).toBeUndefined();
  });

  it("refuse un palier qui appartient à quelqu'un d'autre", async () => {
    // Sinon la plateforme pourrait poser le palier d'un revendeur concurrent,
    // et donner une capacité que personne ne facture.
    const { res, write } = await poser({ parent_id: PLATEFORME }, "plan-1", ETRANGER);
    expect(res.ok).toBe(false);
    expect(write).toBeUndefined();
  });

  it("pose le palier, sa capacité, et le marque offert", async () => {
    const { res, payload } = await poser({ parent_id: PLATEFORME }, "plan-1");
    expect(res.ok).toBe(true);
    expect(payload).toMatchObject({ plan_id: "plan-1", client_limit: 25, sub_status: "granted", sub_id: null });
  });

  it("lève un compte désactivé quand on lui offre un palier", async () => {
    // Offrir un palier à un compte gelé pour impayé tout en le laissant gelé
    // n'aurait aucun sens : il n'y a plus rien à régulariser.
    const { payload } = await poser({ parent_id: PLATEFORME }, "plan-1");
    expect(payload?.suspended_at).toBeNull();
    expect(payload?.suspended_reason).toBeNull();
  });

  it("ramène au palier gratuit quand aucun palier n'est choisi", async () => {
    const { res, payload } = await poser({ parent_id: PLATEFORME }, null);
    expect(res.ok).toBe(true);
    expect(payload).toMatchObject({ plan_id: null, client_limit: 1, sub_status: null });
    // Retirer un palier ne réactive PAS un compte désactivé : ce sont deux
    // décisions distinctes.
    expect(payload).not.toHaveProperty("suspended_at");
  });

  it("écrit sur le compte visé, et sur lui seul", async () => {
    const { write } = await poser({ parent_id: PLATEFORME }, "plan-1");
    expect(eqValue(write!, "id")).toBe(REVENDEUR);
  });
});

describe("un palier offert vaut « en règle »", () => {
  it("compte comme actif dans l'état de facturation", async () => {
    install({ tenants: [{ plan_id: "plan-1", sub_status: "granted", sub_current_period_end: null, sub_cancel_at_period_end: false }], plans: [{ id: "plan-1", name: "Pro", tenant_id: PLATEFORME }] });
    const { tenantBillingState } = await import("@/lib/tenant-billing");
    const st = await tenantBillingState(REVENDEUR);
    expect(st.active).toBe(true);
    expect(st.granted).toBe(true);
    expect(st.planName).toBe("Pro");
  });

  it("ne gèle jamais le compte : il n'y a pas d'abonnement en échec", async () => {
    install({ tenants: [{ sub_id: null, sub_status: "granted", suspended_at: null }] });
    const { tenantFreezeState } = await import("@/lib/freeze");
    expect((await tenantFreezeState(REVENDEUR)).frozen).toBe(false);
  });
});
