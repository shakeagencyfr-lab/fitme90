import { describe, expect, it } from "vitest";
import {
  barcodeCandidates,
  clampGrams,
  defaultGrams,
  groupBySlot,
  journalDigest,
  kcalFromMacros,
  macrosFor,
  manualProduct,
  normalizeBarcode,
  parseOffProduct,
  ratio,
  slotForHour,
  sumEntries,
  type FoodEntry,
} from "./food-log";

const entry = (over: Partial<FoodEntry> = {}): FoodEntry => ({
  id: "e1",
  day: 12,
  slot: "dejeuner",
  name: "Skyr nature",
  brand: "Danone",
  barcode: "3033490004743",
  grams: 150,
  per100: { kcal: 63, protein: 10.5, carbs: 3.9, fat: 0.2 },
  ...over,
});

describe("code-barres", () => {
  it("ne garde que les chiffres et rejette les longueurs absurdes", () => {
    expect(normalizeBarcode(" 3033-490 004743 ")).toBe("3033490004743");
    expect(normalizeBarcode("12")).toBe("");
    expect(normalizeBarcode("123456789012345678")).toBe("");
    expect(normalizeBarcode("abc")).toBe("");
  });

  it("propose la forme EAN-13 d'un UPC-A, et l'inverse, sans doublon", () => {
    expect(barcodeCandidates("012345678905")).toEqual(["012345678905", "0012345678905"]);
    expect(barcodeCandidates("0012345678905")).toEqual(["0012345678905", "012345678905"]);
    expect(barcodeCandidates("3033490004743")).toEqual(["3033490004743"]);
    expect(barcodeCandidates("nope")).toEqual([]);
  });
});

describe("parseOffProduct", () => {
  const nutella = {
    code: "3017620422003",
    product_name: "Nutella",
    product_name_fr: "Nutella pâte à tartiner",
    brands: "Ferrero, Nutella",
    nutriments: { "energy-kcal_100g": 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9 },
    serving_quantity: 15,
    serving_quantity_unit: "g",
    image_front_small_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_fr.jpg",
    nutriscore_grade: "e",
  };

  it("lit une fiche complète, dans la langue demandée", () => {
    const p = parseOffProduct(nutella, "fr");
    expect(p).toMatchObject({
      barcode: "3017620422003",
      name: "Nutella pâte à tartiner",
      brand: "Ferrero",
      per100: { kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
      servingG: 15,
      nutriscore: "e",
      source: "off",
    });
    expect(p?.image).toContain("openfoodfacts.org");
    expect(parseOffProduct(nutella, "en")?.name).toBe("Nutella");
  });

  it("convertit les kJ quand seule l'énergie en kJ est donnée", () => {
    const p = parseOffProduct({ product_name: "Riz", nutriments: { energy_100g: 1500, proteins_100g: 7, carbohydrates_100g: 78, fat_100g: 1 } });
    expect(p?.per100.kcal).toBe(359);
  });

  it("recalcule les kcal (4-4-9) quand l'énergie manque", () => {
    const p = parseOffProduct({ product_name: "Blanc de poulet", nutriments: { proteins_100g: "23", carbohydrates_100g: "0", fat_100g: "1.5" } });
    expect(p?.per100.kcal).toBe(kcalFromMacros({ protein: 23, carbs: 0, fat: 1.5 }));
    expect(p?.per100.kcal).toBe(106);
  });

  it("refuse une fiche sans nom ou sans aucune valeur", () => {
    expect(parseOffProduct({ nutriments: { "energy-kcal_100g": 100 } })).toBeNull();
    expect(parseOffProduct({ product_name: "Mystère", nutriments: {} })).toBeNull();
    expect(parseOffProduct(null)).toBeNull();
  });

  it("ignore une portion en unité inconnue et une image non https", () => {
    const p = parseOffProduct({ product_name: "X", nutriments: { "energy-kcal_100g": 50 }, serving_quantity: 2, serving_quantity_unit: "pièces", image_small_url: "http://x/y.jpg" });
    expect(p?.servingG).toBeNull();
    expect(p?.image).toBeNull();
  });
});

describe("arithmétique", () => {
  it("met à l'échelle sur la quantité", () => {
    expect(macrosFor({ kcal: 63, protein: 10.5, carbs: 3.9, fat: 0.2 }, 150)).toEqual({ kcal: 95, protein: 15.8, carbs: 5.9, fat: 0.3 });
    expect(macrosFor({ kcal: 100, protein: 1, carbs: 1, fat: 1 }, 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("additionne les lignes", () => {
    const tot = sumEntries([entry(), entry({ id: "e2", grams: 100, per100: { kcal: 539, protein: 6.3, carbs: 57.5, fat: 30.9 } })]);
    expect(tot).toEqual({ kcal: 634, protein: 22.1, carbs: 63.4, fat: 31.2 });
    expect(sumEntries([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it("borne la jauge à 0..1", () => {
    expect(ratio(50, 100)).toBe(0.5);
    expect(ratio(130, 100)).toBe(1);
    expect(ratio(10, 0)).toBe(0);
  });

  it("regroupe par repas dans l'ordre de la journée, sans repas vide", () => {
    const g = groupBySlot([entry({ slot: "diner" }), entry({ id: "e2", slot: "petit-dejeuner" }), entry({ id: "e3", slot: "diner" })]);
    expect(g.map((x) => x.slot)).toEqual(["petit-dejeuner", "diner"]);
    expect(g[1].entries).toHaveLength(2);
  });

  it("propose la portion du fabricant, sinon 100 g", () => {
    expect(defaultGrams({ servingG: 30 })).toBe(30);
    expect(defaultGrams({ servingG: null })).toBe(100);
  });

  it("borne les quantités saisies", () => {
    expect(clampGrams("150")).toBe(150);
    expect(clampGrams("150,7")).toBe(151);
    expect(clampGrams(0)).toBeNull();
    expect(clampGrams("abc")).toBeNull();
    expect(clampGrams(99999)).toBe(5000);
  });

  it("devine le repas d'après l'heure", () => {
    expect(slotForHour(8)).toBe("petit-dejeuner");
    expect(slotForHour(12)).toBe("dejeuner");
    expect(slotForHour(16)).toBe("collation");
    expect(slotForHour(20)).toBe("diner");
  });
});

describe("saisie à la main", () => {
  it("construit une fiche depuis des champs libres, kcal recalculées si absentes", () => {
    const p = manualProduct({ name: " Poulet rôti ", protein: "25", carbs: "0", fat: "5" });
    expect(p).toMatchObject({ name: "Poulet rôti", source: "manual", per100: { kcal: 145, protein: 25, carbs: 0, fat: 5 } });
  });

  it("refuse sans nom ou sans aucune valeur", () => {
    expect(manualProduct({ name: "" , kcal: 100 })).toBeNull();
    expect(manualProduct({ name: "Eau" })).toBeNull();
  });

  it("garde le code-barres scanné pour une fiche absente de la base", () => {
    expect(manualProduct({ name: "Produit local", kcal: 200, barcode: "2000000000012" })?.barcode).toBe("2000000000012");
  });
});

describe("journalDigest (pour le coach)", () => {
  const target = { kcal: 2300, protein: 150, carbs: 260, fat: 70 };

  it("dit qu'il n'y a rien", () => {
    expect(journalDigest([], target)).toBe("Rien de noté aujourd'hui.");
    expect(journalDigest([], target, "en")).toBe("Nothing logged today.");
  });

  it("résume les totaux et chaque repas", () => {
    const d = journalDigest([entry(), entry({ id: "e2", slot: "petit-dejeuner", name: "Flocons d'avoine", brand: null, grams: 60, per100: { kcal: 370, protein: 13, carbs: 60, fat: 7 } })], target);
    expect(d).toContain("Consommé jusqu'ici : 317 kcal sur 2300");
    expect(d).toContain("- Petit-déjeuner : Flocons d'avoine 60 g, 222 kcal");
    expect(d).toContain("- Déjeuner : Skyr nature (Danone) 150 g, 95 kcal");
    expect(d.indexOf("Petit-déjeuner")).toBeLessThan(d.indexOf("Déjeuner"));
  });
});
