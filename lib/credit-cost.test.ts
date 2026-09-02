import { describe, it, expect } from "vitest";
import { averagePurchaseCostCents } from "./credits";

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
