import { describe, it, expect } from "vitest";
import {
  actionCreditMargin,
  creditPackMargin,
  programGenerationMargin,
  formatEurPrecise,
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
    // 10 crédits à 0,40 € couvrent largement les 0,39 $ de la génération.
    const p = programGenerationMargin(10, 40);
    expect(p.priceEur).toBe(4);
    expect(p.marginPct).toBeGreaterThan(85);
    // À 1 seul crédit, la marge fond : 0,40 € encaissés contre 0,37 € de coût
    // Opus. C'est précisément ce que le revendeur doit voir avant de baisser
    // le nombre de crédits d'une génération.
    expect(programGenerationMargin(1, 40).marginPct).toBeLessThan(10);
    // Et elle devient déficitaire dès que le crédit passe sous le coût Opus.
    expect(programGenerationMargin(1, 30).marginEur).toBeLessThan(0);
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
