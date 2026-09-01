import { describe, it, expect } from "vitest";
import { creditPackContents, creditPackMargin, actionCreditMargin, programCreditMargin } from "./config";

// Packs HYBRIDES : un pack peut contenir des crédits IA ET des crédits
// programme, vendus en un seul paiement. Le coût du revendeur est la somme des
// deux coûts unitaires, jamais celui d'un seul type.

describe("creditPackContents", () => {
  it("décrit un pack mono-type sans mentionner l'autre", () => {
    expect(creditPackContents(100, 0)).toBe("100 crédits IA");
    expect(creditPackContents(0, 5)).toBe("5 crédits programme");
  });

  it("réunit les deux types pour un pack hybride", () => {
    expect(creditPackContents(100, 5)).toBe("100 crédits IA + 5 crédits programme");
  });

  it("accorde le singulier", () => {
    expect(creditPackContents(1, 1)).toBe("1 crédit IA + 1 crédit programme");
  });

  it("ne décrit rien quand le pack est vide", () => {
    expect(creditPackContents(0, 0)).toBe("");
  });
});

describe("creditPackMargin", () => {
  it("additionne le coût des deux types", () => {
    const ai = actionCreditMargin(0).costEur;
    const prog = programCreditMargin(0).costEur;
    const m = creditPackMargin(100, 5, 3900);
    expect(m.costEur).toBeCloseTo(100 * ai + 5 * prog, 10);
    expect(m.priceEur).toBe(39);
    expect(m.marginEur).toBeCloseTo(39 - (100 * ai + 5 * prog), 10);
  });

  it("retombe sur le coût d'un seul type quand l'autre est à zéro", () => {
    expect(creditPackMargin(100, 0, 2900).costEur).toBeCloseTo(actionCreditMargin(0).costEur * 100, 10);
    expect(creditPackMargin(0, 5, 2900).costEur).toBeCloseTo(programCreditMargin(0).costEur * 5, 10);
  });

  it("signale une marge négative plutôt que de la borner à zéro", () => {
    const m = creditPackMargin(0, 50, 100);
    expect(m.marginEur).toBeLessThan(0);
  });

  it("ignore les valeurs négatives ou non entières", () => {
    expect(creditPackMargin(-10, 0, 1000).costEur).toBe(0);
    expect(creditPackMargin(10.7, 0, 1000).costEur).toBeCloseTo(actionCreditMargin(0).costEur * 10, 10);
  });

  it("un pack vide n'a aucun coût et sa marge est le prix entier", () => {
    const m = creditPackMargin(0, 0, 1000);
    expect(m.costEur).toBe(0);
    expect(m.marginEur).toBe(10);
  });
});
