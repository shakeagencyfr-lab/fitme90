import { describe, it, expect, beforeEach, vi } from "vitest";
import { fakeAdmin, type FakeAdmin } from "@/test/fake-supabase";

/**
 * Unité de compte d'une génération de programme.
 *
 * Le nombre de crédits d'une génération n'est pas un prix : c'est une unité,
 * définie par celui qui paie l'IA en euros. Quand un revendeur pouvait en
 * choisir une autre pour ses coachs, il vendait dans une unité différente de
 * celle qu'on lui facturait et perdait la différence à chaque génération, avec
 * une marge affichée POSITIVE. Ces tests fixent la règle.
 */

const PLATEFORME = "11111111-1111-1111-1111-111111111111";
const REVENDEUR = "22222222-2222-2222-2222-222222222222";
const COACH = "33333333-3333-3333-3333-333333333333";

let fake: FakeAdmin;

beforeEach(() => {
  vi.resetModules();
});

/** @param sequences réponses successives sur `tenants`, dans l'ordre des lectures. */
async function charge(fn: "supplier" | "buyer" | "peutChoisir", cible: string, sequences: unknown[][]) {
  fake = fakeAdmin({}, { tenants: sequences });
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake.client }));
  const m = await import("@/lib/credits");
  if (fn === "supplier") return m.supplierProgramCredits(cible);
  if (fn === "peutChoisir") return m.canSetProgramCredits(cible);
  return m.programCreditCost(cible);
}

describe("qui définit l'unité", () => {
  it("la plateforme définit la sienne", async () => {
    expect(await charge("supplier", PLATEFORME, [[{ parent_id: null, ai_supply: "byok", ai_program_credits: 30 }]])).toBe(30);
  });

  it("un revendeur avec sa PROPRE clé définit la sienne", async () => {
    // Il paie Anthropic en dollars : personne ne lui impose d'unité.
    expect(await charge("supplier", REVENDEUR, [[{ parent_id: PLATEFORME, ai_supply: "byok", ai_program_credits: 10 }]])).toBe(10);
  });

  it("un revendeur qui ACHÈTE ses crédits reçoit celle de son fournisseur", async () => {
    // C'est le cas qui faisait perdre de l'argent : réglé sur 10, débité 30.
    const n = await charge("supplier", REVENDEUR, [
      [{ parent_id: PLATEFORME, ai_supply: "platform_credits", ai_program_credits: 10 }],
      [{ parent_id: null, ai_supply: "byok", ai_program_credits: 30 }],
    ]);
    expect(n).toBe(30);
  });

  it("remonte la chaîne aussi loin qu'il le faut", async () => {
    const n = await charge("supplier", COACH, [
      [{ parent_id: REVENDEUR, ai_supply: "platform_credits", ai_program_credits: 5 }],
      [{ parent_id: PLATEFORME, ai_supply: "platform_credits", ai_program_credits: 10 }],
      [{ parent_id: null, ai_supply: "byok", ai_program_credits: 30 }],
    ]);
    expect(n).toBe(30);
  });

  it("ne tourne pas en rond sur une parenté circulaire", async () => {
    // Une boucle en base ne doit pas bloquer une génération de programme.
    const boucle = Array.from({ length: 12 }, () => [
      { parent_id: REVENDEUR, ai_supply: "platform_credits", ai_program_credits: 7 },
    ]);
    await expect(charge("supplier", REVENDEUR, boucle)).resolves.toBeTypeOf("number");
  });

  it("retombe sur le défaut quand le compte est introuvable ou mal réglé", async () => {
    expect(await charge("supplier", REVENDEUR, [[]])).toBe(10);
    expect(await charge("supplier", REVENDEUR, [[{ parent_id: null, ai_supply: "byok", ai_program_credits: 0 }]])).toBe(10);
    expect(await charge("supplier", null as unknown as string, [[]])).toBe(10);
  });
});

describe("ce que paie un acheteur", () => {
  it("paie dans l'unité de son fournisseur, résolue jusqu'à sa source", async () => {
    // Le coach est débité 30, et son revendeur aussi : plus d'écart possible.
    const n = await charge("buyer", COACH, [
      [{ parent_id: REVENDEUR }],
      [{ parent_id: PLATEFORME, ai_supply: "platform_credits", ai_program_credits: 10 }],
      [{ parent_id: null, ai_supply: "byok", ai_program_credits: 30 }],
    ]);
    expect(n).toBe(30);
  });

  it("retombe sur le défaut pour un compte sans parent", async () => {
    expect(await charge("buyer", PLATEFORME, [[{ parent_id: null }]])).toBe(10);
  });
});

describe("qui a le droit de régler l'unité", () => {
  it("refuse le réglage à un revendeur qui achète ses crédits", async () => {
    // La garde est côté serveur : masquer le champ n'empêche pas de le poster.
    expect(await charge("peutChoisir", REVENDEUR, [[{ parent_id: PLATEFORME, ai_supply: "platform_credits" }]])).toBe(false);
  });

  it("l'autorise à qui paie l'IA lui-même", async () => {
    expect(await charge("peutChoisir", REVENDEUR, [[{ parent_id: PLATEFORME, ai_supply: "byok" }]])).toBe(true);
    expect(await charge("peutChoisir", PLATEFORME, [[{ parent_id: null, ai_supply: "byok" }]])).toBe(true);
  });
});
