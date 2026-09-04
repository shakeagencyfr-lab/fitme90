import { describe, it, expect } from "vitest";
import { averagePurchaseCostCents, bestPackByUnit } from "./credits";

// Le prix unitaire affiché par le fournisseur n'est qu'un prix CONSEILLÉ : le
// montant facturé vient du pack, remisable au volume. L'acheteur doit simuler
// sa marge sur ce qu'il a réellement payé, pas sur le prix affiché.
describe("averagePurchaseCostCents", () => {
  it("renvoie le prix unitaire d'un achat unique", () => {
    // 1000 crédits payés 300 € = 0,30 € le crédit, et non les 0,40 € affichés.
    expect(averagePurchaseCostCents([{ credits: 1000, priceCents: 30000 }])).toBe(30);
  });

  it("pondère par les crédits, pas par le nombre d'achats", () => {
    // 100 crédits à 0,40 € puis 1000 à 0,30 € : la moyenne penche vers le gros pack.
    const avg = averagePurchaseCostCents([
      { credits: 100, priceCents: 4000 },
      { credits: 1000, priceCents: 30000 },
    ]);
    expect(avg).toBeCloseTo(30.909, 2);
    expect(avg!).toBeLessThan(40);
    expect(avg!).toBeGreaterThan(30);
  });

  it("renvoie null sans achat chiffré, pour que l'appelant garde son repli", () => {
    expect(averagePurchaseCostCents([])).toBeNull();
  });

  it("ignore les lignes inexploitables plutôt que de fausser la moyenne", () => {
    const avg = averagePurchaseCostCents([
      { credits: 0, priceCents: 5000 },
      { credits: -10, priceCents: 100 },
      { credits: 100, priceCents: 3000 },
    ]);
    expect(avg).toBe(30);
  });

  it("gère un pack offert à zéro euro sans planter", () => {
    expect(averagePurchaseCostCents([{ credits: 100, priceCents: 0 }])).toBe(0);
  });
});

/**
 * Le forfait « le plus intéressant » n'est pas le moins cher.
 *
 * Un gros forfait coûte davantage à l'achat mais fait baisser le prix du
 * crédit, et c'est ce prix-là qui décide de ce qu'un plan coûtera vraiment.
 * Comparer les prix affichés désignerait toujours le plus petit forfait.
 */
describe("bestPackByUnit", () => {
  it("retient le meilleur prix du crédit, pas le forfait le moins cher", () => {
    const best = bestPackByUnit([
      { name: "Découverte", credits: 500, priceCents: 2500 },
      { name: "Pro", credits: 5000, priceCents: 15000 },
      { name: "Volume", credits: 20000, priceCents: 50000 },
    ]);
    expect(best?.name).toBe("Volume");
    expect(best?.unitCents).toBe(2.5);
  });

  it("ignore un forfait sans crédits ou au prix négatif", () => {
    const best = bestPackByUnit([
      { name: "Cassé", credits: 0, priceCents: 100 },
      { name: "Négatif", credits: 100, priceCents: -50 },
      { name: "Bon", credits: 100, priceCents: 400 },
    ]);
    expect(best?.name).toBe("Bon");
  });

  it("ne rend rien quand aucun forfait n'est exploitable", () => {
    expect(bestPackByUnit([])).toBeNull();
    expect(bestPackByUnit([{ name: "x", credits: 0, priceCents: 0 }])).toBeNull();
  });

  it("accepte un forfait offert, à zéro euro", () => {
    // Un revendeur peut offrir un premier lot : le prix du crédit est alors
    // nul, et c'est évidemment le meilleur tarif.
    expect(bestPackByUnit([{ name: "Offert", credits: 100, priceCents: 0 }])?.unitCents).toBe(0);
  });
});
