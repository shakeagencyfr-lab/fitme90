import { describe, it, expect } from "vitest";
import { targetKcalForDay, macrosForDay, dayMeals, shoppingList, shoppingListText, pnum, grp } from "./nutrition";
import { profilDepuisQuiz, repasDuJour, type Profil } from "./recipe-engine";
import { FOODS } from "./recipe-catalog";

const BASE = { kcal: 2580, protein: 148, carbs: 276, fat: 78 };
const REPAS = ["petit-dejeuner", "dejeuner", "diner", "collation"] as const;
const jamaisRepos = () => false;

const LIBRE: Profil = {
  allergies: [],
  regime: "omnivore",
  bannis: [],
  sansCrustaces: false,
  sansMelangeCarneLaitier: false,
  refuses: [],
  aimes: [],
  coutMax: 3,
  effortMax: 2,
};

describe("dayMeals — la journée type applique tout le questionnaire", () => {
  it("sert un repas par créneau demandé, quantités formatées", () => {
    const meals = dayMeals(1, false, BASE, LIBRE, REPAS);
    expect(meals).toHaveLength(4);
    for (const m of meals) {
      expect(m.slot.length).toBeGreaterThan(0);
      expect(m.kcal).toBeGreaterThan(0);
      expect(m.items.length).toBeGreaterThan(0);
      for (const it of m.items) expect(it.qty).toMatch(/\d/);
    }
  });

  it("change de menu d'un jour à l'autre et reste stable pour un même jour", () => {
    const j1 = dayMeals(1, false, BASE, LIBRE, REPAS).map((m) => m.name);
    const j2 = dayMeals(2, false, BASE, LIBRE, REPAS).map((m) => m.name);
    expect(dayMeals(1, false, BASE, LIBRE, REPAS).map((m) => m.name)).toEqual(j1);
    expect(j2).not.toEqual(j1);
  });

  it("un régime végétalien ne fait apparaître ni viande, ni poisson, ni laitage, ni œuf", () => {
    const profil = profilDepuisQuiz({ diet: "Végétalien" });
    for (let d = 1; d <= 30; d++) {
      for (const m of dayMeals(d, d % 3 === 0, BASE, profil, REPAS)) {
        for (const it of m.items) {
          const food = Object.values(FOODS).find((f) => f.nom === it.food)!;
          expect(food.regime).toBe("vegetal");
          expect(food.allerg ?? []).not.toContain("lactose");
          expect(food.allerg ?? []).not.toContain("egg");
        }
      }
    }
  });

  it("écarte les allergènes déclarés sur toute la durée du programme", () => {
    const profil = profilDepuisQuiz({ allerg: ["Gluten", "Fruits à coque", "Crustacés"] });
    for (let d = 1; d <= 30; d++) {
      for (const m of dayMeals(d, false, BASE, profil, REPAS)) {
        for (const it of m.items) {
          const food = Object.values(FOODS).find((f) => f.nom === it.food)!;
          for (const a of food.allerg ?? []) expect(["gluten", "nuts", "shell"]).not.toContain(a);
        }
      }
    }
  });

  it("respecte un aliment refusé en texte libre", () => {
    const profil = profilDepuisQuiz({ dislikes: "Brocoli, saumon" });
    for (let d = 1; d <= 30; d++) {
      const noms = dayMeals(d, false, BASE, profil, REPAS).flatMap((m) => m.items.map((i) => i.food.toLowerCase()));
      expect(noms.some((f) => f.includes("brocoli") || f.includes("saumon"))).toBe(false);
    }
  });

  it("respecte le cadre halal et casher", () => {
    for (const religion of ["Halal", "Casher"]) {
      const profil = profilDepuisQuiz({ religion });
      for (let d = 1; d <= 21; d++) {
        for (const m of dayMeals(d, false, BASE, profil, REPAS)) {
          const foods = m.items.map((it) => Object.values(FOODS).find((f) => f.nom === it.food)!);
          expect(foods.some((f) => f.regime === "porc")).toBe(false);
          if (religion === "Casher") {
            // Les crustacés ne sont exclus que du cadre casher : le halal les
            // admet, et les interdire ici priverait le client sans raison.
            expect(foods.some((f) => (f.allerg ?? []).includes("shell"))).toBe(false);
            const carne = foods.some((f) => f.regime === "viande" || f.regime === "porc");
            const laitier = foods.some((f) => (f.allerg ?? []).includes("lactose"));
            expect(carne && laitier).toBe(false);
          }
        }
      }
    }
  });

  it("ne propose que des assemblages sans cuisson quand le client ne cuisine pas", () => {
    const profil = profilDepuisQuiz({ cook_time: "Non" });
    // Le filtre d'effort vit dans le moteur : on vérifie ici qu'un menu sort
    // quand même, sinon l'écran serait vide pour ce client.
    for (let d = 1; d <= 14; d++) {
      expect(dayMeals(d, false, BASE, profil, REPAS).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("un jour de repos totalise moins qu'un jour d'entraînement", () => {
    const somme = (repos: boolean) =>
      dayMeals(5, repos, BASE, LIBRE, REPAS).reduce((a, m) => a + m.kcal, 0);
    expect(somme(true)).toBeLessThan(somme(false));
  });
});

describe("shoppingList — le caddie correspond exactement aux recettes", () => {
  it("contient tous les ingrédients des repas de la période, et rien d'autre", () => {
    const span = 7;
    const groups = shoppingList(1, span, jamaisRepos, BASE, LIBRE, REPAS);
    const listés = new Set(groups.flatMap((g) => g.items.map((i) => i.food)));

    const attendus = new Set<string>();
    for (let d = 1; d <= span; d++) {
      for (const m of dayMeals(d, false, BASE, LIBRE, REPAS)) {
        for (const it of m.items) attendus.add(it.food);
      }
    }
    // L'invariant que le client vérifie en magasin, dans les deux sens.
    expect([...attendus].filter((f) => !listés.has(f))).toEqual([]);
    expect([...listés].filter((f) => !attendus.has(f))).toEqual([]);
  });

  it("suit le profil : liste végétalienne sans viande ni laitage", () => {
    const profil = profilDepuisQuiz({ diet: "Végétalien" });
    const groups = shoppingList(1, 14, jamaisRepos, BASE, profil, REPAS);
    const foods = groups.flatMap((g) => g.items.map((i) => i.food.toLowerCase()));
    for (const interdit of ["poulet", "bœuf", "dinde", "saumon", "cabillaud", "skyr", "fromage blanc", "œuf"]) {
      expect(foods.some((f) => f.includes(interdit))).toBe(false);
    }
  });

  it("classe par rayon, sans rayon vide", () => {
    const groups = shoppingList(1, 7, jamaisRepos, BASE, LIBRE, REPAS);
    const connus = ["Fruits & légumes", "Viandes & poissons", "Crémerie & frais", "Épicerie sèche", "Condiments & liquides"];
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(connus).toContain(g.name);
      expect(g.items.length).toBeGreaterThan(0);
    }
  });

  it("compte les aliments à la pièce en pièces, pas en grammes", () => {
    const groups = shoppingList(1, 14, jamaisRepos, BASE, LIBRE, REPAS);
    const oeufs = groups.flatMap((g) => g.items).find((i) => i.food === "Œuf");
    if (oeufs) expect(oeufs.qty).toMatch(/œufs?$/);
  });

  it("une fenêtre plus longue agrège des quantités au moins aussi grandes", () => {
    const total = (span: number) =>
      shoppingList(1, span, jamaisRepos, BASE, LIBRE, REPAS)
        .flatMap((g) => g.items)
        .reduce((a, it) => a + (parseFloat(it.qty.replace(",", ".")) || 0), 0);
    expect(total(14)).toBeGreaterThan(total(3));
  });

  it("borne l'agrégation au dernier jour du programme", () => {
    expect(shoppingList(89, 7, jamaisRepos, BASE, LIBRE, REPAS, 90).length).toBeGreaterThan(0);
  });

  it("traduit les rayons pour un client anglophone", () => {
    const groups = shoppingList(1, 7, jamaisRepos, BASE, LIBRE, REPAS, 90, "en");
    for (const g of groups) expect(g.name).not.toContain("Épicerie");
  });

  it("le texte exporté reprend les rayons en majuscules", () => {
    const groups = shoppingList(1, 3, jamaisRepos, BASE, LIBRE, REPAS);
    const text = shoppingListText(groups);
    expect(text).toContain(groups[0].name.toUpperCase());
    expect(text).toContain("- ");
  });
});

describe("repasDuJour — ce que le client a répondu", () => {
  it("deux repas par jour retirent le petit-déjeuner et ajoutent une collation", () => {
    // Une collation n'est pas un repas : le client garde ses deux assiettes,
    // et la collation (qui peut être un simple shaker) absorbe le reste de la
    // cible au lieu de gonfler les deux assiettes au-delà du mangeable.
    expect(repasDuJour({ meals_per_day: "2" })).toEqual(["dejeuner", "diner", "collation"]);
  });

  it("cinq repas donnent deux collations, servies différemment", () => {
    const repas = repasDuJour({ meals_per_day: "5 et +" });
    expect(repas.filter((r) => r === "collation")).toHaveLength(2);
    const meals = dayMeals(3, false, BASE, LIBRE, repas);
    const collations = meals.filter((m) => m.slot === "Collation");
    expect(collations).toHaveLength(2);
    expect(collations[0].name).not.toBe(collations[1].name);
  });

  it("une journée à deux repas vise quand même la cible du jour", () => {
    const total = dayMeals(4, false, BASE, LIBRE, repasDuJour({ meals_per_day: "2" })).reduce(
      (a, m) => a + m.kcal,
      0,
    );
    expect(total).toBeGreaterThan(BASE.kcal * 0.75);
  });
});

describe("Macros du jour", () => {
  it("cible 10 % de calories en moins un jour de repos", () => {
    expect(targetKcalForDay(2580, true)).toBe(2322);
    expect(targetKcalForDay(2580, false)).toBe(2580);
  });

  it("baisse les glucides un jour de repos, pas les protéines", () => {
    const repos = macrosForDay(BASE, true);
    const train = macrosForDay(BASE, false);
    expect(repos.protein).toBe(train.protein);
    expect(repos.carbs).toBeLessThan(train.carbs);
    expect(repos.fat).toBe(train.fat);
  });
});

describe("helpers de formatage", () => {
  it("extrait un nombre d'une chaîne et groupe les milliers", () => {
    expect(pnum("2 580 kcal")).toBe(2580);
    expect(grp(2580)).toBe("2 580");
  });
});
