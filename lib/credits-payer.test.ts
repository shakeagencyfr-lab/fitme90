import { describe, it, expect } from "vitest";
import { whoPays, type SupplyFacts } from "./credits";

// Un crédit paie l'IA de quelqu'un d'autre. Le débit doit donc suivre la clé
// qui exécute réellement l'appel, pas la configuration du revendeur : un coach
// avec sa propre clé paie Anthropic en dollars, et personne au-dessus de lui ne
// consomme quoi que ce soit.
const facts = (o: Partial<SupplyFacts> = {}): SupplyFacts => ({
  coachHasOwnKey: false,
  model: "credits",
  supply: "platform_credits",
  ...o,
});

describe("whoPays", () => {
  it("débite les deux étages quand le coach achète ses crédits et le revendeur les siens", () => {
    expect(whoPays(facts())).toEqual({ coach: true, reseller: true });
  });

  it("ne débite personne quand le coach a sa propre clé", () => {
    // Le cœur du correctif : le revendeur perdait un crédit acheté à la
    // plateforme alors qu'aucune requête ne partait de la clé plateforme.
    expect(whoPays(facts({ coachHasOwnKey: true }))).toEqual({ coach: false, reseller: false });
  });

  it("ne fait pas payer deux fois un coach BYOK qui a aussi un solde de crédits", () => {
    expect(whoPays(facts({ coachHasOwnKey: true })).coach).toBe(false);
  });

  it("la clé du coach l'emporte sur tous les réglages du revendeur", () => {
    for (const model of ["subscription", "credits"] as const) {
      for (const supply of ["byok", "platform_credits"] as const) {
        expect(whoPays(facts({ coachHasOwnKey: true, model, supply }))).toEqual({
          coach: false,
          reseller: false,
        });
      }
    }
  });

  it("revendeur avec sa propre clé : le coach paie en crédits, le revendeur en dollars", () => {
    expect(whoPays(facts({ supply: "byok" }))).toEqual({ coach: true, reseller: false });
  });

  it("revendeur en abonnement : il porte seul la consommation plateforme", () => {
    // Il facture ses coachs au forfait, mais consomme bien des crédits en haut.
    expect(whoPays(facts({ model: "subscription" }))).toEqual({ coach: false, reseller: true });
  });

  it("revendeur en abonnement avec sa propre clé : aucun crédit nulle part", () => {
    expect(whoPays(facts({ model: "subscription", supply: "byok" }))).toEqual({
      coach: false,
      reseller: false,
    });
  });

  it("ne débite jamais un étage sans contrepartie d'IA fournie", () => {
    // Invariant : un débit implique que le payeur achète bien de l'IA en amont.
    for (const coachHasOwnKey of [true, false]) {
      for (const model of ["subscription", "credits"] as const) {
        for (const supply of ["byok", "platform_credits"] as const) {
          const r = whoPays({ coachHasOwnKey, model, supply });
          if (r.coach) expect(coachHasOwnKey).toBe(false);
          if (r.reseller) expect(supply).toBe("platform_credits");
        }
      }
    }
  });
});
