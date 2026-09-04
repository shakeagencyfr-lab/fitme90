import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeAdmin, type FakeAdmin } from "@/test/fake-supabase";
import type { ChildTenant } from "@/lib/hierarchy";

/**
 * Chiffre IA affiché sur chaque ligne du réseau.
 *
 * Le piège est de montrer le mauvais nombre : un solde de crédits à quelqu'un
 * qui paie Anthropic lui-même ne veut rien dire, et une dépense en dollars à
 * quelqu'un qui achète des crédits non plus. Ces tests portent donc d'abord sur
 * le CHOIX du chiffre, ensuite sur son calcul.
 */

const ACTEUR = "11111111-1111-1111-1111-111111111111";
const REVENDEUR = "22222222-2222-2222-2222-222222222222";
const COACH = "33333333-3333-3333-3333-333333333333";

let fake: FakeAdmin;

beforeEach(() => {
  vi.resetModules();
});

function enfant(p: Partial<ChildTenant> & Pick<ChildTenant, "id" | "kind">): ChildTenant {
  return {
    name: "X", slug: "x", clientCount: 0, networkClientCount: 0, childCount: 0,
    clientLimit: null, planId: null, subStatus: null, ownerUserId: null,
    suspendedAt: null, suspendedReason: null, aiSupply: "byok", aiMode: null, aiSelfManaged: false,
    ...p,
  };
}

/** @param sequences réponses successives, table par table. */
async function figures(children: ChildTenant[], sequences: Record<string, unknown[][]>) {
  fake = fakeAdmin({}, sequences);
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
  const { networkAiFigures } = await import("@/lib/network-ai");
  return networkAiFigures(ACTEUR, children);
}

describe("choix du chiffre", () => {
  it("montre un solde à un revendeur qui achète ses crédits", async () => {
    const m = await figures([enfant({ id: REVENDEUR, kind: "reseller", aiSupply: "platform_credits" })], {
      // La lecture de `tenants` porte les trois faits de facturation de
      // l'acteur : fournit-il l'IA, à quel modèle, avec quelle source.
      tenants: [[{ ai_mode: "provider", reseller_model: "subscription", ai_supply: "byok" }]],
      credit_wallets: [[{ tenant_id: REVENDEUR, credits: 420 }]],
    });
    expect(m.get(REVENDEUR)).toEqual({ mode: "credits", credits: 420, costUsd: null });
  });

  it("montre une dépense à un revendeur en clé perso", async () => {
    const m = await figures([enfant({ id: REVENDEUR, kind: "reseller", aiSupply: "byok" })], {
      tenants: [[{ ai_mode: "provider", reseller_model: "subscription", ai_supply: "byok" }], []],
      profiles: [[]],
    });
    expect(m.get(REVENDEUR)?.mode).toBe("byok");
    expect(m.get(REVENDEUR)?.credits).toBeNull();
  });

  it("ne montre un solde que si l'acteur FOURNIT vraiment l'IA", async () => {
    // Modèle « crédits » mais coachs autonomes : chacun tourne sur sa clé, il
    // n'y a aucun crédit à dépenser. Afficher un solde ici faisait dire à cet
    // écran l'inverse du dashboard du coach.
    const m = await figures([enfant({ id: COACH, kind: "coach" })], {
      tenants: [[{ ai_mode: "byok", reseller_model: "credits", ai_supply: "byok" }]],
      profiles: [[]],
    });
    expect(m.get(COACH)?.mode).toBe("byok");
    expect(m.get(COACH)?.credits).toBeNull();
  });

  it("suit le modèle de l'acteur pour ses coachs, pas leur propre réglage", async () => {
    // Un coach n'a pas de fourniture à lui : c'est son revendeur qui décide si
    // l'IA lui est vendue en crédits ou s'il branche sa propre clé.
    const enCredits = await figures([enfant({ id: COACH, kind: "coach" })], {
      tenants: [[{ ai_mode: "provider", reseller_model: "credits", ai_supply: "byok" }]],
      credit_wallets: [[{ tenant_id: COACH, credits: 12 }]],
    });
    expect(enCredits.get(COACH)).toEqual({ mode: "credits", credits: 12, costUsd: null });

    const enByok = await figures([enfant({ id: COACH, kind: "coach" })], {
      tenants: [[{ ai_mode: "provider", reseller_model: "subscription", ai_supply: "byok" }]],
      profiles: [[]],
    });
    expect(enByok.get(COACH)?.mode).toBe("byok");
  });

  it("affiche zéro plutôt que rien quand le portefeuille n'existe pas encore", async () => {
    const m = await figures([enfant({ id: COACH, kind: "coach" })], {
      tenants: [[{ ai_mode: "provider", reseller_model: "credits", ai_supply: "byok" }]],
      credit_wallets: [[]],
    });
    expect(m.get(COACH)?.credits).toBe(0);
  });
});

describe("calcul de la dépense", () => {
  const appel = (user: string) => ({
    user_id: user, route: "coach", model: "claude-sonnet-4-5",
    input_tokens: 1000, output_tokens: 1000, cache_read_tokens: 0, cache_write_tokens: 0,
  });

  it("impute au coach la conso de ses propres clients", async () => {
    const m = await figures([enfant({ id: COACH, kind: "coach" })], {
      tenants: [[{ ai_mode: "provider", reseller_model: "subscription", ai_supply: "byok" }]],
      profiles: [[{ id: "u1", tenant_id: COACH }]],
      ai_calls: [[appel("u1"), appel("u1")]],
    });
    expect(m.get(COACH)!.costUsd!).toBeGreaterThan(0);
  });

  it("impute au revendeur la conso de TOUT son sous-réseau", async () => {
    // C'est lui qui fournit l'IA à ses coachs : leur dépense est la sienne.
    const m = await figures([enfant({ id: REVENDEUR, kind: "reseller", aiSupply: "byok" })], {
      tenants: [[{ reseller_model: "subscription" }], [{ id: COACH, parent_id: REVENDEUR }]],
      profiles: [[{ id: "u1", tenant_id: COACH }]],
      ai_calls: [[appel("u1")]],
    });
    expect(m.get(REVENDEUR)!.costUsd!).toBeGreaterThan(0);
  });

  it("ne compte pas la conso d'un compte étranger au réseau", async () => {
    const m = await figures([enfant({ id: COACH, kind: "coach" })], {
      tenants: [[{ ai_mode: "provider", reseller_model: "subscription", ai_supply: "byok" }]],
      profiles: [[{ id: "u1", tenant_id: COACH }]],
      // Un appel d'un utilisateur qui n'a pas été retenu : il doit être ignoré.
      ai_calls: [[appel("inconnu")]],
    });
    expect(m.get(COACH)!.costUsd).toBe(0);
  });

  it("ne fait aucune requête quand le réseau est vide", async () => {
    fake = fakeAdmin({});
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
    const { networkAiFigures } = await import("@/lib/network-ai");
    expect((await networkAiFigures(ACTEUR, [])).size).toBe(0);
    expect(fake.queries).toEqual([]);
  });
});
