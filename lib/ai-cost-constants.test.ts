import { describe, it, expect } from "vitest";
import {
  estimateAiMonthlyCost,
  estimateAiMonthlyCredits,
  AI_COST_COACH_MSG_USD,
  AI_COST_RECIPE_USD,
  AI_COST_ACTION_USD,
  AI_COST_MEMORY_USD,
} from "./config";

// Ces constantes alimentent ce que le coach et le revendeur voient dans leur
// dashboard, et la promesse commerciale des landings. Elles sont calées sur la
// conso RÉELLE mesurée dans ai_calls : ces tests bloquent une dérive silencieuse.
describe("constantes de coût IA", () => {
  it("colle à la mesure : 1,36 $ par client actif et par mois", () => {
    // Usage réaliste : 8 messages + 1 recette par jour, 26 jours actifs.
    const { realMonth } = estimateAiMonthlyCost(0, 0);
    expect(realMonth).toBeGreaterThan(1.2);
    expect(realMonth).toBeLessThan(1.5);
  });

  it("tient la promesse de 1 à 2 € affichée sur les landings", () => {
    const eur = estimateAiMonthlyCost(0, 0).realMonth * 0.92;
    expect(eur).toBeGreaterThan(0.8);
    expect(eur).toBeLessThan(2);
  });

  it("garde une borne haute prudente, au dessus de l'usage réaliste", () => {
    const { realMonth, ceilingMonth } = estimateAiMonthlyCost(60, 1);
    expect(ceilingMonth).not.toBeNull();
    expect(ceilingMonth!).toBeGreaterThan(realMonth);
  });

  it("laisse la borne haute ouverte quand un plafond est illimité", () => {
    expect(estimateAiMonthlyCost(0, 1).ceilingMonth).toBeNull();
    expect(estimateAiMonthlyCost(60, 0).ceilingMonth).toBeNull();
  });

  it("compte la mémoire, qui n'est débitée à aucun crédit", () => {
    // Sans elle, l'estimation sous-évaluerait la charge réelle du coach.
    expect(AI_COST_MEMORY_USD).toBeGreaterThan(0);
    const avecMemoire = estimateAiMonthlyCost(0, 0).realMonth;
    const sansMemoire = (8 * AI_COST_COACH_MSG_USD + 1 * AI_COST_RECIPE_USD) * 26;
    expect(avecMemoire).toBeGreaterThan(sansMemoire);
  });

  it("aligne le crédit action sur l'action courante la plus chère", () => {
    expect(AI_COST_ACTION_USD).toBeGreaterThanOrEqual(AI_COST_COACH_MSG_USD);
    expect(AI_COST_ACTION_USD).toBeGreaterThanOrEqual(AI_COST_RECIPE_USD);
  });

  it("compte les crédits indépendamment des tarifs", () => {
    // 8 messages + 1 recette par jour sur 26 jours = 234 crédits.
    expect(estimateAiMonthlyCredits(0, 0).realMonth).toBe(234);
  });
});
