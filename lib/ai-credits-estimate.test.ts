import { describe, it, expect } from "vitest";
import {
  estimateAiMonthlyCredits,
  estimateAiMonthlyCost,
  CREDITS_PER_AI_ACTION,
  AI_REALISTIC_MSG_PER_DAY,
  AI_REALISTIC_RECIPES_PER_DAY,
  AI_REALISTIC_ACTIVE_DAYS,
} from "./config";

// En modèle crédits, le coach ne voit pas une facture Anthropic mais un solde
// qui descend. L'estimation doit suivre EXACTEMENT les mêmes hypothèses d'usage
// que la version en dollars, seule l'unité change.

describe("estimateAiMonthlyCredits", () => {
  it("compte 1 crédit par action, sur les jours actifs du mois", () => {
    const { realMonth } = estimateAiMonthlyCredits(0, 0);
    const actions = (AI_REALISTIC_MSG_PER_DAY + AI_REALISTIC_RECIPES_PER_DAY) * AI_REALISTIC_ACTIVE_DAYS;
    expect(realMonth).toBe(actions * CREDITS_PER_AI_ACTION);
  });

  it("un plafond plus bas que l'usage réaliste borne l'estimation", () => {
    // 2 messages/jour au lieu de 8, 1 recette : 3 actions par jour actif.
    expect(estimateAiMonthlyCredits(2, 1).realMonth).toBe(3 * AI_REALISTIC_ACTIVE_DAYS);
  });

  it("un plafond plus haut que l'usage réaliste ne le gonfle pas", () => {
    expect(estimateAiMonthlyCredits(500, 50).realMonth).toBe(estimateAiMonthlyCredits(0, 0).realMonth);
  });

  it("borne le plafond de sécurité sur 30 jours quand les DEUX plafonds sont fixés", () => {
    expect(estimateAiMonthlyCredits(10, 2).ceilingMonth).toBe(12 * 30);
  });

  it("ne borne rien si un seul plafond est sur illimité", () => {
    expect(estimateAiMonthlyCredits(0, 2).ceilingMonth).toBeNull();
    expect(estimateAiMonthlyCredits(10, 0).ceilingMonth).toBeNull();
    expect(estimateAiMonthlyCredits(0, 0).ceilingMonth).toBeNull();
  });

  it("suit les mêmes hypothèses que l'estimation en dollars", () => {
    // Les deux estimations doivent être bornées ou non bornées ensemble : un
    // coach ne doit pas voir un plafond garanti d'un côté et pas de l'autre.
    for (const [msg, rec] of [[0, 0], [10, 0], [0, 2], [10, 2]] as const) {
      const euros = estimateAiMonthlyCost(msg, rec).ceilingMonth == null;
      const creds = estimateAiMonthlyCredits(msg, rec).ceilingMonth == null;
      expect(creds).toBe(euros);
    }
  });
});
