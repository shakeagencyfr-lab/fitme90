import { describe, it, expect } from "vitest";
import {
  planMaxCostEur,
  planMaxCredits,
  programDaysForMonths,
  estimateAiMonthlyCost,
  usdToEur,
} from "./config";

// Ce que le coach lit en cochant « Coach IA » sur une offre. C'est le chiffre
// sur lequel il décide son prix de vente : une estimation trop basse le fait
// vendre à perte, une estimation absurde lui fait refuser un plan viable.
describe("coût maximum d'un plan en euros (BYOK)", () => {
  const days3 = programDaysForMonths(3);
  const days12 = programDaysForMonths(12);

  it("borne un plan à quota fermé", () => {
    const c = planMaxCostEur({ programDays: days12, dailyQuota: 20, recipeQuota: 1 });
    expect(c.totalEur).not.toBeNull();
    expect(c.messagesEur).toBeGreaterThan(0);
    expect(c.recipesEur).toBeGreaterThan(0);
    expect(c.totalEur).toBeCloseTo(c.programEur + c.memoryEur + c.messagesEur! + c.recipesEur!, 6);
  });

  it("laisse le total ouvert dès qu'un plafond est illimité", () => {
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 0, recipeQuota: 1 }).totalEur).toBeNull();
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 20, recipeQuota: 0 }).totalEur).toBeNull();
    // Le poste programme reste chiffrable : il ne dépend d'aucun plafond.
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 0, recipeQuota: 0 }).programEur).toBeGreaterThan(0);
  });

  it("compte une génération par bloc de 3 mois", () => {
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 20, recipeQuota: 1 }).generations).toBe(1);
    expect(planMaxCostEur({ programDays: days12, dailyQuota: 20, recipeQuota: 1 }).generations).toBe(4);
  });

  it("croît avec le quota et avec la durée", () => {
    const petit = planMaxCostEur({ programDays: days3, dailyQuota: 10, recipeQuota: 1 }).totalEur!;
    const gros = planMaxCostEur({ programDays: days3, dailyQuota: 40, recipeQuota: 1 }).totalEur!;
    const long = planMaxCostEur({ programDays: days12, dailyQuota: 10, recipeQuota: 1 }).totalEur!;
    expect(gros).toBeGreaterThan(petit);
    expect(long).toBeGreaterThan(petit);
  });

  it("reste au-dessus de la dépense réaliste, sans être délirant", () => {
    // Le plafond doit majorer l'usage réel, sinon il ne protège de rien ; mais
    // s'il le majorait de 100x le coach refuserait un plan parfaitement sain.
    const quota = 20;
    const c = planMaxCostEur({ programDays: days3, dailyQuota: quota, recipeQuota: 1 });
    const reel = usdToEur(estimateAiMonthlyCost(0, 0).realMonth) * 3;
    expect(c.totalEur!).toBeGreaterThan(reel);
    expect(c.totalEur!).toBeLessThan(reel * 30);
  });

  it("chiffre la mémoire, que rien ne plafonne", () => {
    expect(planMaxCostEur({ programDays: days3, dailyQuota: 20, recipeQuota: 1 }).memoryEur).toBeGreaterThan(0);
  });
});

describe("coût maximum d'un plan en crédits", () => {
  it("facture les recettes comme les messages", () => {
    const days = programDaysForMonths(3);
    const sans = planMaxCredits({ programDays: days, dailyQuota: 20, programCredits: 40 });
    const avec = planMaxCredits({ programDays: days, dailyQuota: 20, programCredits: 40, recipeQuota: 1 });
    expect(sans.recipeCredits).toBe(0);
    expect(avec.recipeCredits).toBe(days);
    expect(avec.total).toBe(sans.total + days);
  });
});
