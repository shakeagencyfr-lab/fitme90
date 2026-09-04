import { describe, it, expect } from "vitest";
import {
  planMaxCostEur,
  planMaxCredits,
  programDaysForMonths,
  estimateAiMonthlyCost,
  usdToEur,
  AI_COST_RECIPE_USD,
  AI_COST_COACH_MSG_USD,
} from "./config";

// Ce que le coach lit en cochant « Coach IA » sur une offre. C'est le chiffre
// sur lequel il décide son prix de vente : une estimation trop basse le fait
// vendre à perte, une estimation absurde lui fait refuser un plan viable.
describe("coût maximum d'un plan en euros (BYOK)", () => {
  const days3 = programDaysForMonths(3);
  const days12 = programDaysForMonths(12);

  it("borne un plan à quota fermé", () => {
    const c = planMaxCostEur({ programDays: days12, dailyQuota: 20 });
    expect(c.totalEur).not.toBeNull();
    expect(c.actionsEur).toBeGreaterThan(0);
    expect(c.totalEur).toBeCloseTo(c.programEur + c.memoryEur + c.actionsEur!, 6);
  });

  it("chiffre les actions au prix de la plus chère, la recette", () => {
    // Le quota est unique : rien n'empêche un client de passer ses vingt
    // actions du jour à régénérer des recettes. Un plafond qu'un usage réel
    // peut dépasser n'en est pas un.
    const c = planMaxCostEur({ programDays: days3, dailyQuota: 20 });
    expect(c.actionsEur).toBeCloseTo(usdToEur(20 * days3 * AI_COST_RECIPE_USD), 6);
    expect(AI_COST_RECIPE_USD).toBeGreaterThan(AI_COST_COACH_MSG_USD);
  });

  it("laisse le total ouvert quand le quota est illimité", () => {
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 0 }).totalEur).toBeNull();
    // Le poste programme reste chiffrable : il ne dépend d'aucun plafond.
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 0 }).programEur).toBeGreaterThan(0);
  });

  it("compte une génération par bloc de 3 mois", () => {
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 20 }).generations).toBe(1);
    expect(planMaxCostEur({ programDays: days12, dailyQuota: 20 }).generations).toBe(4);
  });

  it("croît avec le quota et avec la durée", () => {
    const petit = planMaxCostEur({ programDays: days3, dailyQuota: 10 }).totalEur!;
    const gros = planMaxCostEur({ programDays: days3, dailyQuota: 40 }).totalEur!;
    const long = planMaxCostEur({ programDays: days12, dailyQuota: 10 }).totalEur!;
    expect(gros).toBeGreaterThan(petit);
    expect(long).toBeGreaterThan(petit);
  });

  it("reste au-dessus de la dépense réaliste, sans être délirant", () => {
    // Le plafond doit majorer l'usage réel, sinon il ne protège de rien ; mais
    // s'il le majorait de 100x le coach refuserait un plan parfaitement sain.
    const c = planMaxCostEur({ programDays: days3, dailyQuota: 20 });
    const reel = usdToEur(estimateAiMonthlyCost(0, 0).realMonth) * 3;
    expect(c.totalEur!).toBeGreaterThan(reel);
    expect(c.totalEur!).toBeLessThan(reel * 60);
  });

  it("chiffre la mémoire, que rien ne plafonne", () => {
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 20 }).memoryEur).toBeGreaterThan(0);
  });
});

describe("coût maximum d'un plan en crédits", () => {
  const days = programDaysForMonths(3);

  it("compte une action par crédit, quelle que soit l'action", () => {
    // Message, recette et alternative valent un crédit chacun : il n'y a plus
    // deux postes à additionner, seulement le quota multiplié par les jours.
    const c = planMaxCredits({ programDays: days, dailyQuota: 20, programCredits: 40 });
    expect(c.actionCredits).toBe(20 * days);
    expect(c.total).toBe(c.generationCredits + c.actionCredits);
  });

  it("laisse les générations seules quand le quota est illimité", () => {
    const c = planMaxCredits({ programDays: days, dailyQuota: 0, programCredits: 40 });
    expect(c.actionCredits).toBe(0);
    expect(c.total).toBe(c.generationCredits);
  });

  it("compte une génération par bloc de 3 mois", () => {
    expect(planMaxCredits({ programDays: days, dailyQuota: 20, programCredits: 40 }).generations).toBe(1);
    const an = programDaysForMonths(12);
    expect(planMaxCredits({ programDays: an, dailyQuota: 20, programCredits: 40 }).generations).toBe(4);
  });
});
