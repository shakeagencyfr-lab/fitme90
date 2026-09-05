import { describe, it, expect } from "vitest";
import { totalsOf, type RevenueLine } from "./platform-revenue";

/**
 * Marge de la revente d'IA.
 *
 * C'est un tableau financier : une erreur de signe ou un coût compté au mauvais
 * endroit ne casse rien, ne lève rien, et se lit comme un vrai chiffre. On
 * décide dessus. D'où des tests sur ce qui NE doit PAS y entrer.
 */

const ligne = (p: Partial<RevenueLine> = {}): RevenueLine => ({
  tenantId: "t",
  name: "Compte",
  kind: "reseller",
  onCredits: true,
  creditsSold: 0,
  revenueCents: 0,
  creditsSpent: 0,
  costUsd: 0,
  upstreamCredits: 0,
  ...p,
});

describe("base d'achat : un revendeur en crédits plateforme", () => {
  it("mesure son coût sur les crédits que la plateforme lui a pris, jamais en dollars", () => {
    // Le coût Anthropic est renseigné exprès : il ne doit rien changer.
    const t = totalsOf([ligne({ revenueCents: 2000, creditsSpent: 50, costUsd: 3, upstreamCredits: 40 })], 25);
    expect(t.basis).toBe("purchase");
    expect(t.costEur).toBeCloseTo(10, 6);
    expect(t.marginEur).toBeCloseTo(10, 6);
    expect(t.costPerCreditEur).toBeCloseTo(0.2, 6);
  });

  it("sans prix d'achat, reste sur la base Anthropic", () => {
    const t = totalsOf([ligne({ costUsd: 1, upstreamCredits: 40 })]);
    expect(t.basis).toBe("anthropic");
    expect(t.costEur).toBeCloseTo(0.92, 6);
  });
});

describe("totaux", () => {
  it("fait la marge en euros à partir d'une recette en centimes et d'un coût en dollars", () => {
    // Trois unités différentes dans le même calcul : c'est exactement là qu'on
    // se trompe d'un facteur cent.
    const t = totalsOf([ligne({ revenueCents: 1000, costUsd: 1 })]);
    expect(t.revenueCents).toBe(1000);
    expect(t.marginEur).toBeCloseTo(10 - 0.92, 4);
  });

  it("dit ce qu'un crédit consommé a réellement coûté", () => {
    // Le chiffre qui révèle si le crédit est une unité honnête.
    const t = totalsOf([ligne({ creditsSpent: 100, costUsd: 1 })]);
    expect(t.costPerCreditEur).toBeCloseTo(0.0092, 6);
  });

  it("ne divise pas par zéro quand rien n'a été consommé", () => {
    expect(totalsOf([ligne({ revenueCents: 500 })]).costPerCreditEur).toBeNull();
  });

  it("annonce une marge négative plutôt que de la masquer", () => {
    // Si un revendeur consomme plus qu'il n'achète, il faut que ça se voie.
    const t = totalsOf([ligne({ revenueCents: 100, costUsd: 10 })]);
    expect(t.marginEur).toBeLessThan(0);
  });

  it("additionne plusieurs comptes", () => {
    const t = totalsOf([
      ligne({ creditsSold: 100, revenueCents: 500, creditsSpent: 40, costUsd: 0.2 }),
      ligne({ creditsSold: 300, revenueCents: 1500, creditsSpent: 60, costUsd: 0.3 }),
    ]);
    expect(t.creditsSold).toBe(400);
    expect(t.revenueCents).toBe(2000);
    expect(t.creditsSpent).toBe(100);
    expect(t.costUsd).toBeCloseTo(0.5, 6);
  });

  it("part de zéro sans aucune ligne", () => {
    const t = totalsOf([]);
    expect(t.marginEur).toBe(0);
    expect(t.costPerCreditEur).toBeNull();
  });
});

// Un coût nul en face de crédits consommés n'est pas un crédit gratuit : c'est
// une absence de mesure. Confondre les deux affichait « ×Infinity de marge ».
describe("totalsOf : coût par crédit non mesurable", () => {
  const ligne = (o: Partial<RevenueLine> = {}): RevenueLine => ({
    tenantId: "t1",
    name: "Revendeur",
    kind: "reseller",
    onCredits: true,
    creditsSold: 0,
    revenueCents: 0,
    creditsSpent: 0,
    upstreamCredits: 0,
    costUsd: 0,
    ...o,
  });

  it("ne renvoie aucun coût par crédit quand rien n'a été consommé", () => {
    expect(totalsOf([ligne()]).costPerCreditEur).toBeNull();
  });

  it("ne renvoie aucun coût par crédit quand la conso n'a rien coûté au vendeur", () => {
    // 14 crédits partis, aucune dépense imputable : la conso tournait sur des
    // clés perso. Diviser le prix de vente par ce zéro donnait l'infini.
    expect(totalsOf([ligne({ creditsSpent: 14, costUsd: 0 })]).costPerCreditEur).toBeNull();
  });

  it("renvoie un coût par crédit dès qu'une dépense est mesurée", () => {
    const t = totalsOf([ligne({ creditsSpent: 10, costUsd: 1 })]);
    expect(t.costPerCreditEur).not.toBeNull();
    expect(Number.isFinite(t.costPerCreditEur!)).toBe(true);
    expect(t.costPerCreditEur!).toBeGreaterThan(0);
  });

  it("ne produit jamais un rapport prix/coût infini", () => {
    for (const [spent, usd] of [[0, 0], [14, 0], [10, 1], [1, 0.0001]] as const) {
      const c = totalsOf([ligne({ creditsSpent: spent, costUsd: usd })]).costPerCreditEur;
      if (c != null) expect(Number.isFinite(0.05 / c)).toBe(true);
    }
  });
});

describe("totalsOf : le coût par crédit ne compte que les comptes en crédits", () => {
  const ligne = (p: Partial<RevenueLine> = {}): RevenueLine => ({
    tenantId: "t",
    name: "Compte",
    kind: "coach",
    onCredits: true,
    creditsSold: 0,
    revenueCents: 0,
    creditsSpent: 0,
    costUsd: 0,
    upstreamCredits: 0,
    ...p,
  });

  it("ignore la consommation des comptes en clé perso au dénominateur", () => {
    // 10 crédits à 1 $ chez le compte en crédits ; 990 crédits chez un compte
    // en clé perso qui ne coûte rien. Diviser par 1 000 donnait un coût
    // unitaire cent fois trop bas.
    const t = totalsOf([
      ligne({ creditsSpent: 10, costUsd: 1 }),
      ligne({ tenantId: "b", onCredits: false, creditsSpent: 990, costUsd: 0 }),
    ]);
    expect(t.creditsSpent).toBe(1000);
    expect(t.costPerCreditEur).toBeCloseTo(t.costEur / 10, 9);
  });
});
