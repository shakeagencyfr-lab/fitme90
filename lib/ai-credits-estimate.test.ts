import { describe, it, expect } from "vitest";
import {
  estimateAiMonthlyCredits,
  estimateAiMonthlyCost,
  CREDITS_PER_AI_ACTION,
  AI_REALISTIC_MSG_PER_DAY,
  AI_REALISTIC_ACTIVE_DAYS,
} from "./config";

// En modèle crédits, le coach ne voit pas une facture Anthropic mais un solde
// qui descend. L'estimation doit suivre EXACTEMENT les mêmes hypothèses d'usage
// que la version en dollars, seule l'unité change.

describe("estimateAiMonthlyCredits", () => {
  it("compte 1 crédit par action, sur les jours actifs du mois", () => {
    const { realMonth } = estimateAiMonthlyCredits(0);
    expect(realMonth).toBe(AI_REALISTIC_MSG_PER_DAY * AI_REALISTIC_ACTIVE_DAYS * CREDITS_PER_AI_ACTION);
  });

  it("un plafond plus bas que l'usage réaliste borne l'estimation", () => {
    expect(estimateAiMonthlyCredits(2).realMonth).toBe(2 * AI_REALISTIC_ACTIVE_DAYS);
  });

  it("un plafond plus haut que l'usage réaliste ne le gonfle pas", () => {
    expect(estimateAiMonthlyCredits(500).realMonth).toBe(estimateAiMonthlyCredits(0).realMonth);
  });

  it("borne le plafond de sécurité sur 30 jours", () => {
    expect(estimateAiMonthlyCredits(12).ceilingMonth).toBe(12 * 30);
  });

  it("ne borne rien quand le plafond est sur illimité", () => {
    expect(estimateAiMonthlyCredits(0).ceilingMonth).toBeNull();
  });

  it("suit les mêmes hypothèses que l'estimation en dollars", () => {
    // Les deux estimations doivent être bornées ou non bornées ensemble : un
    // coach ne doit pas voir un plafond garanti d'un côté et pas de l'autre.
    for (const cap of [0, 10, 60]) {
      const euros = estimateAiMonthlyCost(cap).ceilingMonth == null;
      const creds = estimateAiMonthlyCredits(cap).ceilingMonth == null;
      expect(creds, `plafond ${cap}`).toBe(euros);
    }
  });
});
