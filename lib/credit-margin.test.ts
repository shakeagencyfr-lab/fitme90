import { describe, it, expect } from "vitest";
import {
  actionCreditMargin,
  creditPackMargin,
  programGenerationMargin,
  formatEurPrecise,
  formatCentsPrecise,
  AI_COST_CREDIT_USD,
  usdToEur,
} from "./config";

// Ces chiffres sont ceux que le revendeur lit pour fixer son prix de revente.
// Ils doivent refléter la conso RÉELLE mesurée, et rester lisibles sous le
// centime : c'est la condition pour qu'une simulation de marge ait un sens.
describe("marges du crédit IA côté revendeur", () => {
  it("se base sur le coût mesuré d'un crédit, pas sur l'action la plus chère", () => {
    expect(actionCreditMargin(40).costEur).toBeCloseTo(usdToEur(AI_COST_CREDIT_USD), 6);
  });

  it("donne une marge de l'ordre de 98 % au tarif par défaut de 0,40 €", () => {
    const m = actionCreditMargin(40);
    expect(m.priceEur).toBe(0.4);
    expect(m.marginPct).toBeGreaterThan(97);
    expect(m.marginPct).toBeLessThan(100);
  });

  it("reste cohérent quand le revendeur change son prix", () => {
    expect(actionCreditMargin(10).marginPct).toBeLessThan(actionCreditMargin(40).marginPct);
    expect(actionCreditMargin(100).marginEur).toBeGreaterThan(actionCreditMargin(40).marginEur);
  });

  it("signale une marge négative si le prix descend sous le coût", () => {
    expect(actionCreditMargin(0).marginEur).toBeLessThan(0);
  });

  it("chiffre la génération de programme sur son vrai coût Opus", () => {
    // 10 crédits à 0,40 € couvrent largement les 0,76 $ d'un programme livré
    // (génération Opus et photos de salle).
    const p = programGenerationMargin(10, 40);
    expect(p.priceEur).toBe(4);
    expect(p.marginPct).toBeGreaterThan(80);
    // À UN seul crédit, la génération est déficitaire sur Opus : 0,40 €
    // encaissés contre 0,70 € de coût. Le réglage du nombre de crédits par
    // génération n'est pas cosmétique, la marge affichée doit le montrer.
    expect(programGenerationMargin(1, 40).marginEur).toBeLessThan(0);
    // Deux crédits suffisent tout juste à ce prix.
    expect(programGenerationMargin(2, 40).marginEur).toBeGreaterThan(0);
  });

  it("chiffre un pack au coût réel du crédit", () => {
    expect(creditPackMargin(100, 4000).costEur).toBeCloseTo(100 * usdToEur(AI_COST_CREDIT_USD), 6);
  });
});

describe("formatEurPrecise", () => {
  it("garde 4 décimales sous le centime, sinon le coût disparaît", () => {
    // Le défaut corrigé : 0,0055 et 0,0092 s'affichaient tous deux « 0.01 € ».
    expect(formatEurPrecise(0.0055)).toBe("0.0055 €");
    expect(formatEurPrecise(0.0092)).toBe("0.0092 €");
    expect(formatEurPrecise(0.0055)).not.toBe(formatEurPrecise(0.0092));
  });

  it("reste en 2 décimales pour les montants courants", () => {
    expect(formatEurPrecise(4)).toBe("4.00 €");
    expect(formatEurPrecise(0.37)).toBe("0.37 €");
  });

  it("gère zéro et les négatifs", () => {
    expect(formatEurPrecise(0)).toBe("0.00 €");
    expect(formatEurPrecise(-0.0055)).toBe("-0.0055 €");
  });
});

/**
 * Le piège qui s'est refermé une fois : un prix unitaire de crédit est stocké
 * en CENTIMES, et le passer tel quel à `formatEurPrecise` affichait « 4.00 € »
 * là où il fallait lire « 0.0400 € ». Un forfait à 40 € les 1 000 crédits se
 * présentait donc comme cent fois plus cher, sur l'écran même où le coach
 * décide de son prix de vente.
 */
describe("formatCentsPrecise", () => {
  it("lit un montant en centimes, pas en euros", () => {
    // 40 € les 1 000 crédits, soit 4 centimes le crédit.
    expect(formatCentsPrecise(4)).toBe("0.0400 €");
    expect(formatCentsPrecise(4)).not.toBe(formatEurPrecise(4));
  });

  it("garde assez de décimales sous le centime", () => {
    // 50 € les 20 000 crédits : un quart de centime.
    expect(formatCentsPrecise(0.25)).toBe("0.0025 €");
  });

  it("repasse à deux décimales au-dessus de dix centimes", () => {
    expect(formatCentsPrecise(25)).toBe("0.25 €");
    expect(formatCentsPrecise(0)).toBe("0.00 €");
  });
});
