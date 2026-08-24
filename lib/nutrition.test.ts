import { describe, it, expect } from "vitest";
import {
  bannedTags,
  scaleFactor,
  targetKcalForDay,
  dayMeals,
  shoppingList,
  shoppingListText,
  BANK,
} from "./nutrition";

const DIET_TAGS = ["meat", "fish", "egg", "lactose"] as const;

describe("bannedTags — filtrage allergènes & régimes", () => {
  it("mappe les libellés d'allergies vers les étiquettes internes", () => {
    expect(bannedTags(["Gluten", "Lactose"])).toEqual({ gluten: 1, lactose: 1 });
    expect(bannedTags(["Fruits à coque", "Œuf", "Poisson"])).toEqual({
      nuts: 1,
      egg: 1,
      fish: 1,
    });
  });

  it("ignore « Aucune » et les valeurs inconnues", () => {
    expect(bannedTags(["Aucune"])).toEqual({});
    expect(bannedTags(null)).toEqual({});
    expect(bannedTags(undefined)).toEqual({});
  });

  it("végétarien exclut viande et poisson", () => {
    expect(bannedTags([], "Végétarien")).toEqual({ meat: 1, fish: 1 });
  });

  it("végétalien exclut viande, poisson, œuf et lactose", () => {
    expect(bannedTags([], "Végétalien")).toEqual({
      meat: 1,
      fish: 1,
      egg: 1,
      lactose: 1,
    });
  });

  it("combine allergies et régime", () => {
    expect(bannedTags(["Gluten"], "Végétarien")).toEqual({
      gluten: 1,
      meat: 1,
      fish: 1,
    });
  });
});

describe("dayMeals — respect des exclusions", () => {
  it("un menu végétalien ne contient aucune viande/poisson/œuf/lactose", () => {
    const banned = bannedTags([], "Végétalien");
    // Sur plusieurs jours (rotation déterministe des variantes).
    for (let d = 1; d <= 14; d++) {
      const meals = dayMeals(d, false, 2580, banned);
      const slotVariants = meals.map((m) => m.name);
      for (const slot of BANK) {
        const chosenName = slotVariants[BANK.indexOf(slot)];
        const variant = slot.v.find((v) => v.name === chosenName)!;
        for (const tag of DIET_TAGS) {
          expect(variant.tags).not.toContain(tag);
        }
      }
    }
  });

  it("écarte les allergènes déclarés (sans gluten → aucune variante gluten)", () => {
    const banned = bannedTags(["Gluten"]);
    for (let d = 1; d <= 14; d++) {
      const meals = dayMeals(d, false, 2580, banned);
      for (let i = 0; i < BANK.length; i++) {
        const variant = BANK[i].v.find((v) => v.name === meals[i].name)!;
        // Le petit-déjeuner n'a qu'une option sans gluten ; on vérifie le fallback :
        // si au moins une variante sans gluten existe, la choisie n'a pas de gluten.
        const hasSafe = BANK[i].v.some((v) => !v.tags.includes("gluten"));
        if (hasSafe) expect(variant.tags).not.toContain("gluten");
      }
    }
  });

  it("produit 4 repas (un par créneau) avec quantités formatées", () => {
    const meals = dayMeals(1, false, 2580, {});
    expect(meals).toHaveLength(4);
    expect(meals[0].items[0].qty).toMatch(/^\d+( (g|ml))?$/);
    expect(meals.map((m) => m.slot)).toEqual([
      "Petit-déjeuner",
      "Déjeuner",
      "Collation",
      "Dîner",
    ]);
  });
});

describe("Ajustement jour de repos (−10 %)", () => {
  it("cible 10 % de calories en moins un jour de repos", () => {
    expect(targetKcalForDay(2580, false)).toBe(2580);
    expect(targetKcalForDay(2580, true)).toBe(2322);
  });

  it("les repas d'un jour de repos totalisent moins qu'un jour d'entraînement", () => {
    const banned = {};
    const train = dayMeals(5, false, 2580, banned);
    const rest = dayMeals(5, true, 2580, banned);
    const sum = (arr: typeof train) => arr.reduce((a, m) => a + m.kcal, 0);
    expect(sum(rest)).toBeLessThan(sum(train));
  });
});

describe("scaleFactor — bornage", () => {
  it("borne le facteur entre 0,7 et 1,45", () => {
    expect(scaleFactor(100, 100000)).toBe(0.7);
    expect(scaleFactor(100000, 100)).toBe(1.45);
    expect(scaleFactor(2580, 2580)).toBe(1);
  });
});

describe("shoppingList — agrégation par rayon", () => {
  const restNever = () => false;

  it("agrège sur N jours et classe par rayon connu", () => {
    const groups = shoppingList(1, 7, restNever, 2580, {});
    expect(groups.length).toBeGreaterThan(0);
    const known = [
      "Fruits & légumes",
      "Viandes & poissons",
      "Crémerie & œufs",
      "Épicerie sèche",
      "Liquides & condiments",
      "Autres",
    ];
    for (const g of groups) {
      expect(known).toContain(g.name);
      expect(g.items.length).toBeGreaterThan(0);
    }
  });

  it("une fenêtre plus longue agrège des quantités au moins aussi grandes", () => {
    const totalG = (span: number) => {
      const groups = shoppingList(1, span, restNever, 2580, {});
      // Somme grossière des grammes/quantités numériques déclarés.
      return groups
        .flatMap((g) => g.items)
        .reduce((a, it) => a + (parseFloat(it.qty.replace(",", ".")) || 0), 0);
    };
    expect(totalG(14)).toBeGreaterThan(totalG(3));
  });

  it("un régime végétalien ne fait apparaître ni viande ni produit laitier", () => {
    const banned = bannedTags([], "Végétalien");
    const groups = shoppingList(1, 14, restNever, 2580, banned);
    const foods = groups.flatMap((g) => g.items.map((i) => i.food.toLowerCase()));
    for (const forbidden of ["poulet", "bœuf", "dinde", "saumon", "cabillaud", "skyr", "fromage blanc", "œufs"]) {
      expect(foods.some((f) => f.includes(forbidden))).toBe(false);
    }
  });

  it("borne l'agrégation au 90e jour", () => {
    const groups = shoppingList(89, 7, restNever, 2580, {});
    // Ne couvre que J89 et J90 → liste non vide mais bornée.
    expect(groups.length).toBeGreaterThan(0);
  });

  it("le texte exporté reprend les rayons en majuscules", () => {
    const groups = shoppingList(1, 3, restNever, 2580, {});
    const text = shoppingListText(groups);
    expect(text).toContain(groups[0].name.toUpperCase());
    expect(text).toContain("- ");
  });
});
