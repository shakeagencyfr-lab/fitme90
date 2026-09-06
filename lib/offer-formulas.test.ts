import { describe, it, expect } from "vitest";
import { coachAiOf, formulaCopy, formulaOf, isOfferFormula, OFFER_FORMULAS } from "./offer-formulas";

describe("formules d'un plan", () => {
  it("n'accepte que Mini et Max", () => {
    expect(isOfferFormula("mini")).toBe(true);
    expect(isOfferFormula("max")).toBe(true);
    expect(isOfferFormula("")).toBe(false);
    expect(isOfferFormula("on")).toBe(false);
    expect(isOfferFormula(null)).toBe(false);
    expect(isOfferFormula(true)).toBe(false);
  });

  it("Max inclut le Coach IA, Mini non, dans les deux sens", () => {
    expect(coachAiOf("max")).toBe(true);
    expect(coachAiOf("mini")).toBe(false);
    expect(formulaOf({ coach_ai: true })).toBe("max");
    expect(formulaOf({ coach_ai: false })).toBe("mini");
    // Aller-retour : lire un plan puis le réécrire ne change rien.
    for (const f of OFFER_FORMULAS) expect(formulaOf({ coach_ai: coachAiOf(f) })).toBe(f);
  });

  it("dit dans les deux langues ce que chaque formule contient et ce qu'elle coûte", () => {
    for (const locale of ["fr", "en"]) {
      for (const f of OFFER_FORMULAS) {
        const c = formulaCopy(f, locale);
        for (const champ of [c.name, c.tagline, c.body, c.cost, c.fit]) {
          expect(champ.length).toBeGreaterThan(0);
          // Règle de style du produit : jamais de tiret cadratin.
          expect(champ).not.toMatch(/[—–]/);
        }
      }
    }
    expect(formulaCopy("mini", "fr").name).toBe("Mini");
    expect(formulaCopy("max", "fr").name).toBe("Max");
    // Mini dit ce qu'il n'y a PAS, Max ce qui est débité : ce sont les deux
    // phrases qui décident de la marge du coach.
    expect(formulaCopy("mini", "fr").body).toMatch(/PAS le Coach IA/);
    expect(formulaCopy("mini", "fr").cost).toMatch(/génération du programme/);
    expect(formulaCopy("max", "fr").cost).toMatch(/débité/);
    // Une langue inconnue retombe sur le français plutôt que sur du vide.
    expect(formulaCopy("mini", "de").name).toBe("Mini");
  });
});
