import { describe, it, expect } from "vitest";
import {
  creditPackContents,
  creditPackMargin,
  suggestedPackPriceCents,
  programGenerationMargin,
  actionCreditMargin,
  planMaxCredits,
  DEFAULT_PROGRAM_CREDITS,
} from "./config";

// UN SEUL crédit IA : les helpers ne connaissent plus deux types. Une
// génération de programme vaut N crédits, réglable par le fournisseur.

describe("creditPackContents", () => {
  it("accorde le singulier et le pluriel", () => {
    expect(creditPackContents(1)).toBe("1 crédit IA");
    expect(creditPackContents(100)).toBe("100 crédits IA");
  });
  it("ne décrit rien pour un pack vide", () => {
    expect(creditPackContents(0)).toBe("");
    expect(creditPackContents(-3)).toBe("");
  });
});

describe("creditPackMargin", () => {
  it("compte un coût d'action par crédit", () => {
    const m = creditPackMargin(100, 3900);
    expect(m.costEur).toBeCloseTo(actionCreditMargin(0).costEur * 100, 10);
    expect(m.priceEur).toBe(39);
  });
  it("signale une marge négative plutôt que de la borner", () => {
    expect(creditPackMargin(1000, 100).marginEur).toBeLessThan(0);
  });
  it("ignore les valeurs négatives ou non entières", () => {
    expect(creditPackMargin(-10, 1000).costEur).toBe(0);
    expect(creditPackMargin(10.7, 1000).costEur).toBeCloseTo(actionCreditMargin(0).costEur * 10, 10);
  });
});

describe("suggestedPackPriceCents", () => {
  it("multiplie les crédits par le prix unitaire", () => {
    expect(suggestedPackPriceCents(100, 40)).toBe(4000);
    expect(suggestedPackPriceCents(0, 40)).toBe(0);
    expect(suggestedPackPriceCents(10, -40)).toBe(0);
  });
});

describe("programGenerationMargin", () => {
  it("rapporte le coût Opus d'une génération aux crédits qu'elle consomme", () => {
    const m = programGenerationMargin(DEFAULT_PROGRAM_CREDITS, 40);
    expect(m.priceEur).toBe(4);
    expect(m.marginEur).toBeGreaterThan(0);
  });
  it("montre une perte si le fournisseur règle trop peu de crédits", () => {
    expect(programGenerationMargin(1, 10).marginEur).toBeLessThan(0);
  });
});

describe("planMaxCredits", () => {
  it("un 3 mois = 1 génération + quota × 90 jours", () => {
    const r = planMaxCredits({ programDays: 90, dailyQuota: 20, programCredits: 10 });
    expect(r.generations).toBe(1);
    expect(r.generationCredits).toBe(10);
    expect(r.chatCredits).toBe(1800);
    expect(r.total).toBe(1810);
  });
  it("un 12 mois = 4 générations (une par bloc)", () => {
    const r = planMaxCredits({ programDays: 360, dailyQuota: 0, programCredits: 10 });
    expect(r.generations).toBe(4);
    expect(r.total).toBe(40);
  });
  it("un quota illimité (0) ne chiffre que les générations", () => {
    expect(planMaxCredits({ programDays: 90, dailyQuota: 0, programCredits: 10 }).chatCredits).toBe(0);
  });
});
