import { describe, it, expect } from "vitest";
import { FOODS, RECIPES, RAYON_ORDRE } from "./recipe-catalog";
import { RECIPE_STEPS } from "./recipe-steps";
import {
  apport, buildMenu, convient, menuForDay, partsPour, poolServable, profilDepuisQuiz,
  repasDuJour, scaleRecipe, shoppingEntries, termes, type Macros, type Profil,
} from "./recipe-engine";

const PROFIL_LIBRE: Profil = {
  allergies: [], regime: "omnivore", bannis: [], sansCrustaces: false,
  sansMelangeCarneLaitier: false, refuses: [], aimes: [], coutMax: 3, effortMax: 2,
};

const JOUR: Macros = { kcal: 2580, p: 148, c: 276, f: 78 };

describe("catalogue", () => {
  it("ne référence que des aliments qui existent", () => {
    const inconnus = RECIPES.flatMap((r) =>
      r.ingredients.filter((i) => !FOODS[i.food]).map((i) => `${r.id}: ${i.food}`),
    );
    expect(inconnus).toEqual([]);
  });

  it("donne à chaque recette une ancre de protéines et une de glucides", () => {
    const incomplets = RECIPES.filter((r) => {
      const roles = new Set(r.ingredients.map((i) => i.role));
      return !roles.has("proteine") || !roles.has("glucide");
    }).map((r) => r.id);
    expect(incomplets).toEqual([]);
  });

  it("n'ancre jamais une macro sur un aliment qui n'en contient pas", () => {
    const mauvais: string[] = [];
    for (const r of RECIPES) {
      for (const i of r.ingredients) {
        if (!i.role) continue;
        const cle = i.role === "proteine" ? "p" : i.role === "glucide" ? "c" : "f";
        // Un seuil bas suffit : on écarte les aliments qui ne portent
        // visiblement pas la macro (une carotte comme source de glucides).
        if (FOODS[i.food][cle] < 5) mauvais.push(`${r.id}: ${i.food} (${i.role})`);
      }
    }
    expect(mauvais).toEqual([]);
  });

  it("a des identifiants uniques", () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });

  it("donne une fiche de préparation à chaque recette, et aucune orpheline", () => {
    const sansEtapes = RECIPES.filter((r) => !RECIPE_STEPS[r.id]).map((r) => r.id);
    const ids = new Set(RECIPES.map((r) => r.id));
    const orphelines = Object.keys(RECIPE_STEPS).filter((k) => !ids.has(k));
    expect(sansEtapes).toEqual([]);
    expect(orphelines).toEqual([]);
  });

  it("range chaque aliment dans un rayon connu", () => {
    const mauvais = Object.entries(FOODS)
      .filter(([, f]) => !RAYON_ORDRE.includes(f.rayon))
      .map(([k]) => k);
    expect(mauvais).toEqual([]);
  });

  it("n'utilise pas de tiret cadratin dans les textes", () => {
    const fautes = RECIPES.filter((r) => {
      const st = RECIPE_STEPS[r.id];
      return [r.nom, st?.astuce ?? "", ...(st?.etapes ?? [])].some((t) => t.includes("—") || t.includes("–"));
    }).map((r) => r.id);
    expect(fautes).toEqual([]);
  });

  it("écrit des étapes sans quantité chiffrée en grammes", () => {
    // Une étape qui citerait « 80 g de riz » mentirait dès la première mise à
    // l'échelle : les quantités vivent dans les ingrédients, pas dans le texte.
    const fautes = RECIPES.filter((r) =>
      (RECIPE_STEPS[r.id]?.etapes ?? []).some((e) => /\d+\s?g\b/.test(e)),
    ).map((r) => r.id);
    expect(fautes).toEqual([]);
  });

  it("couvre les quatre repas", () => {
    for (const repas of ["petit-dejeuner", "dejeuner", "diner", "collation"]) {
      expect(RECIPES.filter((r) => r.repas === repas).length, repas).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("scaleRecipe", () => {
  it("annonce les macros réellement contenues dans les quantités", () => {
    const r = scaleRecipe(RECIPES[0], { kcal: 700, p: 40, c: 80, f: 20 });
    const recalcul = r.ingredients.reduce(
      (a, i) => {
        const m = apport(FOODS[i.food], i.grammes);
        return { kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f };
      },
      { kcal: 0, p: 0, c: 0, f: 0 },
    );
    expect(r.macros.kcal).toBeCloseTo(recalcul.kcal, 6);
    expect(r.macros.p).toBeCloseTo(recalcul.p, 6);
  });

  it("approche la cible de protéines de chaque repas principal", () => {
    const parts = partsPour(["petit-dejeuner", "dejeuner", "diner"]);
    const ecarts: string[] = [];
    for (const tpl of RECIPES) {
      const part = parts[tpl.repas];
      if (!part) continue;
      const cible = { kcal: JOUR.kcal * part, p: JOUR.p * part, c: JOUR.c * part, f: JOUR.f * part };
      const r = scaleRecipe(tpl, cible);
      const ecart = Math.abs(r.macros.p - cible.p) / cible.p;
      if (ecart > 0.25) ecarts.push(`${tpl.id}: ${Math.round(r.macros.p)} g pour ${Math.round(cible.p)} g`);
    }
    expect(ecarts).toEqual([]);
  });

  it("reste dans une fourchette raisonnable de calories sur tout le catalogue", () => {
    const parts = partsPour(["petit-dejeuner", "dejeuner", "diner", "collation"]);
    const ecarts: string[] = [];
    for (const tpl of RECIPES) {
      const part = parts[tpl.repas];
      const cible = { kcal: JOUR.kcal * part, p: JOUR.p * part, c: JOUR.c * part, f: JOUR.f * part };
      const r = scaleRecipe(tpl, cible);
      const ecart = Math.abs(r.macros.kcal - cible.kcal) / cible.kcal;
      if (ecart > 0.3) ecarts.push(`${tpl.id}: ${Math.round(r.macros.kcal)} kcal pour ${Math.round(cible.kcal)}`);
    }
    expect(ecarts).toEqual([]);
  });

  it("tient sur un petit objectif comme sur un gros", () => {
    for (const jour of [{ kcal: 1600, p: 110, c: 150, f: 55 }, { kcal: 3400, p: 190, c: 400, f: 95 }]) {
      const menu = buildMenu({ repas: ["petit-dejeuner", "dejeuner", "diner"], jour, profil: PROFIL_LIBRE });
      const total = menu.reduce((a, r) => a + r.macros.kcal, 0);
      expect(Math.abs(total - jour.kcal) / jour.kcal).toBeLessThan(0.2);
    }
  });

  it("écrit les œufs à la pièce, pas au gramme", () => {
    const omelette = RECIPES.find((r) => r.id === "pdj-omelette-pain")!;
    const r = scaleRecipe(omelette, { kcal: 650, p: 35, c: 60, f: 25 });
    const oeufs = r.ingredients.find((i) => i.food === "oeuf")!;
    expect(oeufs.libelle).toMatch(/^\d+ œufs?$/);
  });

  it("ne descend jamais à une quantité absurde", () => {
    for (const tpl of RECIPES) {
      const r = scaleRecipe(tpl, { kcal: 200, p: 8, c: 20, f: 5 });
      for (const i of r.ingredients) expect(i.grammes, `${tpl.id} ${i.food}`).toBeGreaterThan(0);
    }
  });
});

describe("filtrage", () => {
  it("écarte toute recette contenant un allergène déclaré", () => {
    const profil = { ...PROFIL_LIBRE, allergies: ["gluten", "lactose"] as const };
    for (const r of RECIPES.filter((x) => convient(x, { ...profil, allergies: [...profil.allergies] }))) {
      for (const i of r.ingredients) {
        expect(FOODS[i.food].allerg ?? [], `${r.id}/${i.food}`).not.toContain("gluten");
        expect(FOODS[i.food].allerg ?? [], `${r.id}/${i.food}`).not.toContain("lactose");
      }
    }
  });

  it("ne sert que du végétal à un régime végétalien", () => {
    const profil: Profil = { ...PROFIL_LIBRE, regime: "vegetalien" };
    const servables = RECIPES.filter((r) => convient(r, profil));
    expect(servables.length).toBeGreaterThan(0);
    for (const r of servables) {
      for (const i of r.ingredients) expect(FOODS[i.food].regime, `${r.id}/${i.food}`).toBe("vegetal");
    }
  });

  it("laisse le flexitarien manger de tout", () => {
    const flexi = RECIPES.filter((r) => convient(r, { ...PROFIL_LIBRE, regime: "flexitarien" }));
    const omni = RECIPES.filter((r) => convient(r, PROFIL_LIBRE));
    expect(flexi.length).toBe(omni.length);
  });

  it("exclut le porc en cadre halal", () => {
    const profil = profilDepuisQuiz({ religion: "Halal" });
    for (const r of RECIPES.filter((x) => convient(x, profil))) {
      for (const i of r.ingredients) expect(FOODS[i.food].regime, `${r.id}/${i.food}`).not.toBe("porc");
    }
  });

  it("interdit viande et laitage dans la même assiette en cadre casher", () => {
    const profil = profilDepuisQuiz({ religion: "Casher" });
    for (const r of RECIPES.filter((x) => convient(x, profil))) {
      const foods = r.ingredients.map((i) => FOODS[i.food]);
      const carne = foods.some((f) => f.regime === "viande" || f.regime === "porc");
      const laitier = foods.some((f) => (f.allerg ?? []).includes("lactose"));
      expect(carne && laitier, r.id).toBe(false);
      expect(foods.some((f) => (f.allerg ?? []).includes("shell")), r.id).toBe(false);
    }
  });

  it("respecte un aliment refusé, ingrédient comme titre", () => {
    const profil: Profil = { ...PROFIL_LIBRE, refuses: termes("brocoli, saumon") };
    for (const r of RECIPES.filter((x) => convient(x, profil))) {
      const noms = r.ingredients.map((i) => FOODS[i.food].nom.toLowerCase()).join(" ");
      expect(noms, r.id).not.toContain("brocoli");
      expect(noms, r.id).not.toContain("saumon");
    }
  });

  it("ne propose que de l'assemblage à qui ne cuisine pas", () => {
    const profil = profilDepuisQuiz({ cook_time: "Non" });
    expect(profil.effortMax).toBe(0);
    for (const r of RECIPES.filter((x) => convient(x, profil))) expect(r.effort, r.id).toBe(0);
  });

  it("réduit le catalogue quand le budget est serré", () => {
    const serre = RECIPES.filter((r) => convient(r, profilDepuisQuiz({ budget: "Serré" })));
    const large = RECIPES.filter((r) => convient(r, profilDepuisQuiz({ budget: "Confortable" })));
    expect(serre.length).toBeGreaterThan(0);
    expect(serre.length).toBeLessThan(large.length);
  });
});

describe("profilDepuisQuiz", () => {
  it("lit les allergies du questionnaire", () => {
    expect(profilDepuisQuiz({ allerg: ["Gluten", "Œuf", "Aucune"] }).allergies.sort())
      .toEqual(["egg", "gluten"]);
  });

  it("tolère un questionnaire vide", () => {
    const p = profilDepuisQuiz({});
    expect(p.regime).toBe("omnivore");
    expect(p.allergies).toEqual([]);
    expect(p.effortMax).toBe(2);
  });

  it("ajoute une collation quand le client mange 4 fois par jour", () => {
    expect(repasDuJour({ meals_per_day: "3" })).toHaveLength(3);
    expect(repasDuJour({ meals_per_day: "5 et +" })).toContain("collation");
  });
});

describe("buildMenu", () => {
  it("sert un plat par repas demandé", () => {
    const menu = buildMenu({ repas: ["petit-dejeuner", "dejeuner", "diner"], jour: JOUR, profil: PROFIL_LIBRE });
    expect(menu.map((r) => r.repas)).toEqual(["petit-dejeuner", "dejeuner", "diner"]);
  });

  it("est déterministe", () => {
    const a = buildMenu({ repas: ["dejeuner"], jour: JOUR, profil: PROFIL_LIBRE });
    const b = buildMenu({ repas: ["dejeuner"], jour: JOUR, profil: PROFIL_LIBRE });
    expect(a[0].id).toBe(b[0].id);
  });

  it("change de recettes quand on régénère", () => {
    const repas = ["petit-dejeuner", "dejeuner", "diner"] as const;
    const premier = buildMenu({ repas: [...repas], jour: JOUR, profil: PROFIL_LIBRE });
    const second = buildMenu({
      repas: [...repas], jour: JOUR, profil: PROFIL_LIBRE, exclure: premier.map((r) => r.id),
    });
    expect(second.map((r) => r.id)).not.toEqual(premier.map((r) => r.id));
    for (const r of second) expect(premier.map((x) => x.id)).not.toContain(r.id);
  });

  it("privilégie les aliments que le client aime", () => {
    const menu = buildMenu({
      repas: ["dejeuner"], jour: JOUR,
      profil: { ...PROFIL_LIBRE, aimes: termes("tofu") },
    });
    expect(menu[0].ingredients.some((i) => i.food === "tofu")).toBe(true);
  });

  it("sert quand même un menu à un profil très contraint", () => {
    const profil = profilDepuisQuiz({
      allerg: ["Gluten", "Lactose", "Fruits à coque"],
      diet: "Végétalien",
      budget: "Serré",
      cook_time: "De temps en temps",
    });
    const menu = buildMenu({ repas: ["petit-dejeuner", "dejeuner", "diner"], jour: JOUR, profil });
    expect(menu.length).toBeGreaterThanOrEqual(2);
  });
});

describe("couverture des profils du questionnaire", () => {
  // Chaque ligne est une combinaison de réponses réellement possible. Le seuil
  // est bas volontairement : il ne dit pas « le choix est large », il dit
  // « cet écran n'est jamais vide ». Un client végétalien qui ne cuisine pas
  // n'avait, avant ce test, aucun déjeuner ni aucun dîner à se mettre sous la
  // dent : l'onglet nutrition lui affichait deux repas sur quatre.
  const CAS: [string, Record<string, unknown>][] = [
    ["omnivore sans contrainte", {}],
    ["végétalien", { diet: "Végétalien" }],
    ["végétarien", { diet: "Végétarien" }],
    ["végétalien sans gluten", { diet: "Végétalien", allerg: ["Gluten"] }],
    [
      "tous les allergènes du questionnaire",
      { allerg: ["Gluten", "Lactose", "Fruits à coque", "Œuf", "Poisson", "Crustacés", "Soja"] },
    ],
    ["budget serré", { budget: "Serré" }],
    ["ne cuisine pas", { cook_time: "Non" }],
    ["ne cuisine pas, budget serré", { cook_time: "Non", budget: "Serré" }],
    ["végétalien, budget serré", { diet: "Végétalien", budget: "Serré" }],
    ["végétalien, ne cuisine pas", { diet: "Végétalien", cook_time: "Non" }],
    ["casher", { religion: "Casher" }],
    ["halal", { religion: "Halal" }],
    ["sans lactose ni gluten", { allerg: ["Gluten", "Lactose"] }],
    ["refus larges", { dislikes: "poulet, poisson, brocoli, tomate" }],
  ];

  it.each(CAS)("sert au moins trois recettes par repas : %s", (_nom, quiz) => {
    const profil = profilDepuisQuiz(quiz);
    const maigres = (["petit-dejeuner", "dejeuner", "diner", "collation"] as const)
      .map((r) => [r, poolServable(r, profil).length] as const)
      .filter(([, n]) => n < 3)
      .map(([r, n]) => `${r}: ${n}`);
    expect(maigres).toEqual([]);
  });
});

describe("menuForDay — la journée servie, et donc la liste de courses", () => {
  const JOUR_LIBRE = { jour: 1, repas: ["petit-dejeuner", "dejeuner", "diner", "collation"] as const, macros: JOUR, profil: PROFIL_LIBRE };

  it("est stable pour un jour donné et change d'un jour à l'autre", () => {
    const a = menuForDay(JOUR_LIBRE).map((r) => r.id);
    expect(menuForDay(JOUR_LIBRE).map((r) => r.id)).toEqual(a);
    expect(menuForDay({ ...JOUR_LIBRE, jour: 2 }).map((r) => r.id)).not.toEqual(a);
  });

  it("fait tourner le catalogue au lieu de resservir la même semaine", () => {
    const vus = new Set<string>();
    for (let j = 1; j <= 30; j++) for (const r of menuForDay({ ...JOUR_LIBRE, jour: j })) vus.add(r.id);
    expect(vus.size).toBeGreaterThanOrEqual(20);
  });

  it("ne sert jamais deux fois la même recette dans la journée", () => {
    const repas = repasDuJour({ meals_per_day: "5 et +" });
    for (let j = 1; j <= 30; j++) {
      const ids = menuForDay({ ...JOUR_LIBRE, jour: j, repas }).map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("n'agrège dans les courses que ce que les recettes demandent", () => {
    const jours = [1, 2, 3].map((j) => menuForDay({ ...JOUR_LIBRE, jour: j }));
    const entrees = shoppingEntries(jours);
    const attendus = new Set(jours.flat().flatMap((r) => r.ingredients.map((i) => i.food)));
    expect(new Set(entrees.map((e) => e.food))).toEqual(attendus);
    // Les quantités s'additionnent, elles ne se remplacent pas.
    for (const e of entrees) {
      const somme = jours
        .flat()
        .flatMap((r) => r.ingredients)
        .filter((i) => i.food === e.food)
        .reduce((a, i) => a + i.grammes, 0);
      expect(e.grammes).toBeCloseTo(somme, 5);
    }
  });
});
