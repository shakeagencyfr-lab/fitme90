// Moteur de recettes : filtrage, mise à l'échelle, sélection. PUR et testable.
//
// Il remplace un appel à un modèle de langage par trois opérations que le
// calcul fait mieux :
//
//  1. FILTRER. Allergies, régime, cadre religieux, aliments refusés, budget,
//     temps de cuisine. Un filtre ne se trompe pas et ne « oublie » pas une
//     allergie au milieu d'un prompt de quinze lignes, ce qui, sur des
//     allergènes, n'est pas un détail de confort.
//  2. METTRE À L'ÉCHELLE. Les quantités des ingrédients porteurs sont
//     CALCULÉES pour atteindre les macros du repas. Les macros affichées sont
//     ensuite la somme réelle de ces quantités : elles ne peuvent pas mentir.
//  3. CHOISIR. Un tri déterministe sur les goûts déclarés, en écartant ce qui
//     vient d'être servi pour que « régénérer » change vraiment le menu.

import {
  FOODS,
  RECIPES,
  RAYON_ORDRE,
  type Food,
  type Ingredient,
  type Rayon,
  type Repas,
  type RecipeTemplate,
  type Allergene,
  type Regime,
} from "@/lib/recipe-catalog";

export interface Macros {
  kcal: number;
  p: number;
  c: number;
  f: number;
}

/**
 * Part des macros du jour attribuée à chaque repas. Somme = 1 sur les trois
 * repas principaux ; la collation vient EN PLUS et retire sa part aux autres
 * (voir `partsPour`).
 */
const PART_BASE: Record<Repas, number> = {
  "petit-dejeuner": 0.26,
  dejeuner: 0.38,
  diner: 0.36,
  collation: 0,
};

/** Les parts effectives selon qu'on sert une collation ou non. */
export function partsPour(repas: readonly Repas[]): Record<string, number> {
  const collations = repas.filter((r) => r === "collation").length;
  const part = collations ? 0.15 : 0;
  const reste = 1 - part * collations;
  // Les repas principaux servis peuvent ne pas être les trois : deux repas par
  // jour, c'est une réponse possible du questionnaire. Sans cette
  // renormalisation, la journée ne totaliserait que 74 % de la cible et le
  // client mangerait structurellement trop peu.
  const base = repas.filter((r) => r !== "collation").reduce((a, r) => a + PART_BASE[r], 0) || 1;
  const out: Record<string, number> = {};
  for (const r of repas) out[r] = r === "collation" ? part : (PART_BASE[r] / base) * reste;
  return out;
}

// ───────────────────────────────────────────────────────── mise à l'échelle

/** Bornes par défaut d'un ingrédient ajustable : de 40 % à 250 % de la base. */
function bornes(ing: Ingredient): [number, number] {
  return [ing.min ?? Math.round(ing.qty * 0.4), ing.max ?? Math.round(ing.qty * 2.5)];
}

/** Pas d'arrondi : à la pièce pour les œufs, à 5 g pour le gras, 10 g sinon. */
function pas(food: Food, role: "proteine" | "glucide" | "lipide"): number {
  if (food.piece) return food.piece;
  if (role === "lipide") return 5;
  return 10;
}

function arrondi(v: number, step: number): number {
  return Math.max(step, Math.round(v / step) * step);
}

/** Macros apportées par `g` grammes d'un aliment. */
export function apport(food: Food, g: number): Macros {
  const k = g / 100;
  return { kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k };
}

function somme(parts: Macros[]): Macros {
  return parts.reduce(
    (a, b) => ({ kcal: a.kcal + b.kcal, p: a.p + b.p, c: a.c + b.c, f: a.f + b.f }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
}

export interface ScaledIngredient {
  food: string;
  nom: string;
  /** Quantité retenue, en grammes. */
  grammes: number;
  /** Ce qu'on écrit sur la fiche : « 180 g », « 2 œufs ». */
  libelle: string;
  /** Rayon du magasin, repris tel quel dans la liste de courses. */
  rayon: Rayon;
}

export interface ScaledRecipe {
  id: string;
  nom: string;
  repas: Repas;
  minutes: number;
  effort: 0 | 1 | 2;
  ingredients: ScaledIngredient[];
  macros: Macros;
}

/** « 2 œufs » plutôt que « 110 g d'œuf » : personne ne pèse ses œufs. */
function libelleQuantite(food: Food, grammes: number): string {
  if (food.piece) {
    const n = Math.max(1, Math.round(grammes / food.piece));
    const [un, plusieurs] = food.pieceLabel ?? ["", ""];
    return `${n} ${n > 1 ? plusieurs : un}`.trim();
  }
  return `${Math.round(grammes)} ${food.unite ?? "g"}`;
}

/**
 * Ajuste les ingrédients porteurs pour atteindre `cible`, puis rend la recette
 * avec ses macros RÉELLES.
 *
 * L'ordre de résolution n'est pas indifférent : protéines d'abord (la
 * contrainte la plus dure d'un plan sportif), lipides ensuite, glucides en
 * dernier parce qu'ils absorbent le reliquat de calories. Deux passes
 * suffisent à converger, chaque ancre apportant un peu des deux autres macros.
 */
export function scaleRecipe(tpl: RecipeTemplate, cible: Macros): ScaledRecipe {
  const qty = new Map<string, number>();
  for (const ing of tpl.ingredients) qty.set(ing.food, ing.qty);

  const ordre: Array<"proteine" | "glucide" | "lipide"> = ["proteine", "lipide", "glucide"];
  for (let passe = 0; passe < 2; passe++) {
    for (const role of ordre) {
      const ancre = tpl.ingredients.find((i) => i.role === role);
      if (!ancre) continue;
      const food = FOODS[ancre.food];
      const macro = role === "proteine" ? "p" : role === "glucide" ? "c" : "f";
      const parGramme = food[macro] / 100;
      // Une ancre qui n'apporte pas sa propre macro ne peut rien régler.
      if (parGramme <= 0) continue;

      const autres = somme(
        tpl.ingredients
          .filter((i) => i.food !== ancre.food)
          .map((i) => apport(FOODS[i.food], qty.get(i.food) ?? i.qty)),
      );
      const besoin = cible[macro] - autres[macro];
      const [min, max] = bornes(ancre);
      const brut = Math.min(max, Math.max(min, besoin / parGramme));
      qty.set(ancre.food, Math.min(max, Math.max(min, arrondi(brut, pas(food, role)))));
    }
  }

  const ingredients = tpl.ingredients.map((i) => {
    const food = FOODS[i.food];
    const g = qty.get(i.food) ?? i.qty;
    return { food: i.food, nom: food.nom, grammes: g, libelle: libelleQuantite(food, g), rayon: food.rayon };
  });
  const macros = somme(ingredients.map((i) => apport(FOODS[i.food], i.grammes)));

  return {
    id: tpl.id,
    nom: tpl.nom,
    repas: tpl.repas,
    minutes: tpl.minutes,
    effort: tpl.effort,
    ingredients,
    macros,
  };
}

// ────────────────────────────────────────────────────────────── filtrage

/** Le profil alimentaire du client, tel qu'il ressort du questionnaire. */
export interface Profil {
  allergies: Allergene[];
  /** Régime le plus permissif accepté. */
  regime: "omnivore" | "flexitarien" | "vegetarien" | "vegetalien";
  /** Étiquettes d'aliments bannis : « porc », « boeuf », « alcool ». */
  bannis: string[];
  /** Crustacés exclus (cadre casher, ou allergie). */
  sansCrustaces: boolean;
  /** Pas de viande et de produits laitiers dans la même assiette (casher). */
  sansMelangeCarneLaitier: boolean;
  /** Termes d'aliments refusés (texte libre du questionnaire, normalisé). */
  refuses: string[];
  /** Termes d'aliments appréciés (texte libre). */
  aimes: string[];
  /** Coût moyen maximum d'une recette (1 économique à 3 cher). */
  coutMax: number;
  /** Effort de cuisine maximum toléré. */
  effortMax: 0 | 1 | 2;
}

const REGIME_ORDRE: Record<Regime, number> = {
  vegetal: 0,
  oeuf_lait: 1,
  poisson: 2,
  viande: 3,
  porc: 4,
};

const REGIME_MAX: Record<Profil["regime"], number> = {
  vegetalien: 0,
  vegetarien: 1,
  // Un flexitarien mange de tout : la nuance porte sur la fréquence, pas sur
  // l'interdit. La traiter comme un régime d'exclusion l'aurait privé de la
  // moitié du catalogue sans qu'il l'ait demandé.
  flexitarien: 4,
  omnivore: 4,
};

/** Normalise un mot pour la comparaison de goûts (minuscules, sans accents). */
export function normalise(s: string): string {
  return (s || "")
    .toLowerCase()
    // Les ligatures ne se décomposent pas en NFD : sans cette ligne, « Œuf »
    // devient « uf » et l'allergie à l'œuf n'est jamais reconnue.
    .replace(/\u0153/g, "oe")
    .replace(/\u00e6/g, "ae")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Découpe une saisie libre (« Brocoli, fromage bleu ») en termes utiles. */
export function termes(raw: string | string[] | null | undefined): string[] {
  const texte = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  return texte
    .split(/[,;\n/]+/)
    .map((t) => normalise(t))
    // Les mots de moins de trois lettres feraient des faux positifs partout.
    .filter((t) => t.length >= 3);
}

/** Un terme du client vise-t-il cet ingrédient ? (comparaison par inclusion) */
function vise(terme: string, nom: string): boolean {
  const n = normalise(nom);
  return n.includes(terme) || terme.includes(n);
}

/** La recette est-elle servable à ce profil ? */
export function convient(tpl: RecipeTemplate, profil: Profil): boolean {
  if (tpl.effort > profil.effortMax) return false;

  const foods = tpl.ingredients.map((i) => FOODS[i.food]);

  for (const f of foods) {
    if ((f.allerg ?? []).some((a) => profil.allergies.includes(a))) return false;
    if (REGIME_ORDRE[f.regime] > REGIME_MAX[profil.regime]) return false;
    if ((f.tags ?? []).some((t) => profil.bannis.includes(t))) return false;
    if (profil.sansCrustaces && (f.allerg ?? []).includes("shell")) return false;
    if (profil.refuses.some((t) => vise(t, f.nom))) return false;
  }
  if (profil.refuses.some((t) => vise(t, tpl.nom))) return false;

  if (profil.sansMelangeCarneLaitier) {
    const carne = foods.some((f) => f.regime === "viande" || f.regime === "porc");
    const laitier = foods.some((f) => (f.allerg ?? []).includes("lactose"));
    if (carne && laitier) return false;
  }

  const coutMoyen = foods.reduce((a, f) => a + f.cout, 0) / foods.length;
  return coutMoyen <= profil.coutMax + 0.001;
}

/**
 * Score de préférence. Sert uniquement à ORDONNER des recettes déjà jugées
 * servables : aucune recette n'est écartée à cause d'un score.
 */
export function scoreRecette(tpl: RecipeTemplate, profil: Profil): number {
  const foods = tpl.ingredients.map((i) => FOODS[i.food]);
  let s = 0;
  for (const f of foods) if (profil.aimes.some((t) => vise(t, f.nom))) s += 10;
  if (profil.aimes.some((t) => vise(t, tpl.nom))) s += 6;
  // À goûts égaux, la recette la plus proche du temps de cuisine déclaré.
  s -= Math.abs(profil.effortMax - tpl.effort) * 2;
  return s;
}

// ───────────────────────────────────────────────────────────── sélection

export interface PlanRepas {
  /** Repas à servir, dans l'ordre d'affichage. */
  repas: readonly Repas[];
  /** Macros du jour entier. */
  jour: Macros;
  profil: Profil;
  /** Identifiants déjà servis : on les évite pour que « régénérer » change. */
  exclure?: readonly string[];
}

/**
 * Les recettes servables à ce profil pour ce repas, de la plus proche de ses
 * goûts à la plus éloignée. Aucune n'est écartée par le score : le tri ne fait
 * qu'ordonner ce que le filtre a déjà jugé sûr.
 */
export function poolServable(repas: Repas, profil: Profil): RecipeTemplate[] {
  return RECIPES.filter((r) => r.repas === repas && convient(r, profil)).sort((a, b) => {
    const d = scoreRecette(b, profil) - scoreRecette(a, profil);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
}

/**
 * Combien de recettes entrent dans la rotation d'un repas. Tourner sur tout le
 * catalogue servirait un jour sur trois une recette mal notée ; n'en garder que
 * trois donnerait la même semaine pendant trois mois. Une quinzaine tient les
 * deux bouts.
 */
const ROTATION = 15;

/** Décalage propre à chaque repas, pour que les créneaux ne tournent pas en bloc. */
const DECALAGE: Record<Repas, number> = {
  "petit-dejeuner": 0,
  dejeuner: 5,
  diner: 9,
  collation: 2,
};

export interface MenuDuJour {
  /** Numéro du jour de programme (1 pour le premier jour). */
  jour: number;
  repas: readonly Repas[];
  /** Macros du jour entier, déjà ajustées jour d'entraînement / de repos. */
  macros: Macros;
  profil: Profil;
}

/**
 * Le menu d'un jour précis, mis à l'échelle des macros de ce jour.
 *
 * C'est la SEULE source de la journée type et de la liste de courses. Les deux
 * sortaient auparavant de banques différentes : le client lisait des recettes
 * dont les ingrédients n'étaient pas dans sa liste, et achetait des aliments
 * qu'aucune recette ne lui demandait. Une rotation déterministe sur le numéro
 * de jour donne à la fois la variété (le menu change chaque jour) et la
 * stabilité (revenir sur un jour affiche le même menu, et la liste de courses
 * de la semaine correspond exactement à ce qui sera servi).
 */
export function menuForDay(plan: MenuDuJour): ScaledRecipe[] {
  const parts = partsPour(plan.repas);
  const out: ScaledRecipe[] = [];
  // Un même créneau peut revenir (deux collations) : la seconde prend la
  // recette suivante de la rotation, sinon le client verrait deux fois la même.
  const rang = new Map<Repas, number>();
  for (const repas of plan.repas) {
    const pool = poolServable(repas, plan.profil);
    if (pool.length === 0) continue;
    const n = rang.get(repas) ?? 0;
    rang.set(repas, n + 1);
    const fenetre = Math.min(pool.length, ROTATION);
    const i = (((plan.jour - 1 + DECALAGE[repas] + n) % fenetre) + fenetre) % fenetre;
    const part = parts[repas] ?? 0;
    out.push(
      scaleRecipe(pool[i], {
        kcal: plan.macros.kcal * part,
        p: plan.macros.p * part,
        c: plan.macros.c * part,
        f: plan.macros.f * part,
      }),
    );
  }
  return out;
}

/** Une ligne de la liste de courses : un aliment, tous repas et jours cumulés. */
export interface ShoppingEntry {
  food: string;
  nom: string;
  grammes: number;
  rayon: Rayon;
  /** Masse d'une pièce si l'aliment se compte (œuf, banane), sinon 0. */
  piece: number;
  pieceLabel?: [string, string];
  unite: "g" | "ml";
}

/**
 * Additionne les ingrédients de plusieurs journées, classés par rayon.
 *
 * L'invariant tenu ici est celui que le client vérifie en magasin : tout ce
 * qu'une recette de la période demande figure dans la liste, et rien d'autre.
 */
export function shoppingEntries(jours: ScaledRecipe[][]): ShoppingEntry[] {
  const acc = new Map<string, ShoppingEntry>();
  for (const jour of jours) {
    for (const recette of jour) {
      for (const ing of recette.ingredients) {
        const food = FOODS[ing.food];
        const e = acc.get(ing.food);
        if (e) e.grammes += ing.grammes;
        else
          acc.set(ing.food, {
            food: ing.food,
            nom: ing.nom,
            grammes: ing.grammes,
            rayon: ing.rayon,
            piece: food.piece ?? 0,
            pieceLabel: food.pieceLabel,
            unite: food.unite ?? "g",
          });
      }
    }
  }
  const rang = new Map(RAYON_ORDRE.map((r, i) => [r, i]));
  return [...acc.values()].sort(
    (a, b) => (rang.get(a.rayon)! - rang.get(b.rayon)!) || a.nom.localeCompare(b.nom, "fr"),
  );
}

/**
 * Le menu du jour : une recette par repas demandé, mise à l'échelle.
 *
 * Un repas sans aucune recette servable est SAUTÉ plutôt que rempli de force :
 * mieux vaut deux recettes justes que trois dont une contient un allergène.
 */
export function buildMenu(plan: PlanRepas): ScaledRecipe[] {
  const parts = partsPour(plan.repas);
  const exclus = new Set(plan.exclure ?? []);
  const deja = new Set<string>();
  const out: ScaledRecipe[] = [];

  for (const repas of plan.repas) {
    const trie = poolServable(repas, plan.profil).filter((r) => !deja.has(r.id));
    if (trie.length === 0) continue;
    // On saute ce qui vient d'être servi, SAUF si tout l'est : le client aura
    // alors la meilleure recette plutôt qu'un repas vide.
    const choix = trie.find((r) => !exclus.has(r.id)) ?? trie[0];

    const part = parts[repas] ?? 0;
    out.push(
      scaleRecipe(choix, {
        kcal: plan.jour.kcal * part,
        p: plan.jour.p * part,
        c: plan.jour.c * part,
        f: plan.jour.f * part,
      }),
    );
    deja.add(choix.id);
  }
  return out;
}

// ──────────────────────────────────────────── lecture du questionnaire

const ALLERGENES_QUIZ: Record<string, Allergene> = {
  gluten: "gluten",
  lactose: "lactose",
  "fruits a coque": "nuts",
  oeuf: "egg",
  poisson: "fish",
  crustaces: "shell",
  soja: "soy",
};

/**
 * Traduit les réponses du questionnaire en profil alimentaire.
 *
 * Tout y est optionnel : un questionnaire incomplet doit donner un menu
 * correct, pas une erreur. Les valeurs par défaut sont les plus permissives,
 * SAUF sur les allergies, où l'absence de réponse ne vaut évidemment pas
 * autorisation (il n'y a alors simplement rien à exclure).
 */
export function profilDepuisQuiz(a: Record<string, unknown>): Profil {
  const brutAllerg = Array.isArray(a.allerg) ? (a.allerg as string[]) : [];
  const allergies = brutAllerg
    .map((x) => ALLERGENES_QUIZ[normalise(x)])
    .filter((x): x is Allergene => Boolean(x));

  const diet = normalise(String(a.diet ?? ""));
  const regime: Profil["regime"] = /vegetalien|vegan/.test(diet)
    ? "vegetalien"
    : /vegetarien/.test(diet)
      ? "vegetarien"
      : /flexitarien/.test(diet)
        ? "flexitarien"
        : "omnivore";

  const religion = normalise(String(a.religion ?? ""));
  const casher = religion.includes("casher");
  const halal = religion.includes("halal");

  const bannis: string[] = [];
  if (/sans porc/.test(diet) || halal || casher) bannis.push("porc");
  if (/sans boeuf/.test(diet)) bannis.push("boeuf");
  if (halal || casher) bannis.push("alcool");

  const budget = normalise(String(a.budget ?? ""));
  const coutMax = budget.includes("serre") ? 1.7 : budget.includes("confortable") ? 3 : 2.3;

  const cuisine = normalise(String(a.cook_time ?? ""));
  const effortMax: 0 | 1 | 2 = cuisine === "non" ? 0 : cuisine.includes("temps en temps") ? 1 : 2;

  return {
    allergies,
    regime,
    bannis,
    sansCrustaces: casher || allergies.includes("shell"),
    sansMelangeCarneLaitier: casher,
    refuses: termes(a.dislikes as string | undefined),
    aimes: termes(a.loved_foods as string | undefined),
    coutMax,
    effortMax,
  };
}

/**
 * Combien de repas afficher, d'après « repas par jour » du questionnaire.
 *
 * Deux repas par jour est une réponse possible : c'est alors le petit-déjeuner
 * qui saute, parce que c'est celui que sautent réellement les gens qui
 * répondent cela. Cinq repas, c'est deux collations, pas une.
 */
export function repasDuJour(a: Record<string, unknown>): Repas[] {
  const n = parseInt(String(a.meals_per_day ?? "3"), 10);
  if (!Number.isFinite(n)) return ["petit-dejeuner", "dejeuner", "diner"];
  if (n <= 2) return ["dejeuner", "diner"];
  const base: Repas[] = ["petit-dejeuner", "dejeuner", "diner"];
  if (n === 3) return base;
  if (n === 4) return [...base, "collation"];
  return [...base, "collation", "collation"];
}

/** Libellé français d'un repas, pour l'étiquette de la fiche. */
export const REPAS_LABEL: Record<Repas, string> = {
  "petit-dejeuner": "Petit-déjeuner",
  dejeuner: "Déjeuner",
  diner: "Dîner",
  collation: "Collation",
};
