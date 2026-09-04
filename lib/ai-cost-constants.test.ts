import { describe, it, expect } from "vitest";
import {
  estimateAiMonthlyCost,
  estimateAiMonthlyCredits,
  AI_COST_COACH_MSG_USD,
  AI_COST_ACTION_USD,
  AI_COST_MEMORY_USD,
  AI_COST_PROGRAM_USD,
} from "./config";

// Ces constantes alimentent ce que le coach et le revendeur voient dans leur
// dashboard, et la promesse commerciale des landings. Elles sont calées sur la
// conso RÉELLE mesurée dans ai_calls : ces tests bloquent une dérive silencieuse.
describe("constantes de coût IA", () => {
  it("colle à la mesure : environ 1,1 $ par client actif et par mois", () => {
    // Usage réaliste : 8 messages par jour, 26 jours actifs, plus la mémoire.
    // Les recettes et les alternatives ne comptent plus : elles sont calculées.
    const { realMonth } = estimateAiMonthlyCost(0);
    expect(realMonth).toBeGreaterThan(0.9);
    expect(realMonth).toBeLessThan(1.3);
  });

  it("tient la promesse de 1 à 2 € affichée sur les landings", () => {
    const eur = estimateAiMonthlyCost(0).realMonth * 0.92;
    expect(eur).toBeGreaterThan(0.5);
    expect(eur).toBeLessThan(2);
  });

  it("garde une borne haute prudente, au dessus de l'usage réaliste", () => {
    const { realMonth, ceilingMonth } = estimateAiMonthlyCost(60);
    expect(ceilingMonth).not.toBeNull();
    expect(ceilingMonth!).toBeGreaterThan(realMonth);
  });

  it("laisse la borne haute ouverte quand le plafond est illimité", () => {
    expect(estimateAiMonthlyCost(0).ceilingMonth).toBeNull();
    expect(estimateAiMonthlyCredits(0).ceilingMonth).toBeNull();
  });

  it("compte la mémoire, qui n'est débitée à aucun crédit", () => {
    // Sans elle, l'estimation sous-évaluerait la charge réelle du coach.
    expect(AI_COST_MEMORY_USD).toBeGreaterThan(0);
    const avecMemoire = estimateAiMonthlyCost(0).realMonth;
    const sansMemoire = 8 * AI_COST_COACH_MSG_USD * 26;
    expect(avecMemoire).toBeGreaterThan(sansMemoire);
  });

  it("aligne le crédit action sur la seule action facturée qui reste", () => {
    expect(AI_COST_ACTION_USD).toBe(AI_COST_COACH_MSG_USD);
  });

  it("garde la génération de programme au tarif Sonnet, pas Opus", () => {
    // Opus 5 mesuré à 0,3882 $ ; Sonnet 5 coûte 2,5 fois moins par jeton.
    expect(AI_COST_PROGRAM_USD).toBeLessThan(0.2);
    expect(AI_COST_PROGRAM_USD).toBeGreaterThan(0.15);
  });

  it("compte les crédits indépendamment des tarifs", () => {
    // 8 messages par jour sur 26 jours = 208 crédits.
    expect(estimateAiMonthlyCredits(0).realMonth).toBe(208);
  });
});
