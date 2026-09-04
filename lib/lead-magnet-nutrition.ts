// Chiffrage nutritionnel du mini-programme. Arithmétique pure, aucune IA.
//
// POURQUOI DES CHIFFRES ET PAS DES PRINCIPES.
//
// « Vise un déficit léger » ne se met pas en pratique : personne ne sait ce
// qu'est son besoin. Un document qui annonce 2 040 kcal, 145 g de protéines et
// 2,3 L d'eau se suit dès le lendemain, et il montre au passage ce que le
// programme complet sait faire. C'est le poste où un mini-programme gratuit
// peut se hisser au niveau d'un accompagnement payant, parce que le calcul est
// le même.
//
// HONNÊTETÉ DU CALCUL.
//
// La formule est celle de Mifflin-St Jeor, la référence des recommandations
// actuelles, appliquée telle quelle. Elle a besoin du sexe, de l'âge, de la
// taille et du poids : s'il en manque une, on ne rend RIEN plutôt qu'un chiffre
// bâti sur des moyennes. Un chiffre faux est pire qu'un chiffre absent, parce
// qu'il sera suivi.

import type { Activity, Goal, Sex } from "@/lib/lead-magnet-types";

export interface Macros {
  /** Métabolisme de base, en kcal. */
  bmr: number;
  /** Dépense quotidienne estimée, entraînement compris. */
  tdee: number;
  /** Cible du jour, ajustée à l'objectif. */
  target: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  /** Eau, en litres, arrondie au dixième. */
  waterL: number;
  /** Indice de masse corporelle, quand la taille est connue. */
  bmi: number | null;
}

/**
 * Facteurs d'activité, entraînement compris.
 *
 * Les valeurs classiques (1,2 à 1,9) sont notoirement généreuses : appliquées
 * telles quelles à quelqu'un qui s'entraîne trois fois par semaine, elles
 * surestiment la dépense de plusieurs centaines de kcal et font échouer une
 * perte de gras. On reste dans le bas de chaque fourchette.
 */
const BASE_FACTOR: Record<Activity, number> = {
  sedentaire: 1.2,
  modere: 1.35,
  actif: 1.5,
};

/** Chaque séance hebdomadaire ajoute un peu, sans jamais faire exploser le total. */
const PER_SESSION = 0.02;

/**
 * Ajustement de la cible selon l'objectif, en proportion de la dépense.
 *
 * En pourcentage plutôt qu'en kcal fixes : 400 kcal de déficit ne pèsent pas
 * la même chose pour une dépense de 1 700 et pour une de 3 200.
 */
const ADJUST: Record<Goal, number> = {
  perte: -0.18,
  muscle: 0.1,
  force: 0.05,
  forme: 0,
};

/** Protéines par kilo de poids de corps. */
const PROTEIN_PER_KG: Record<Goal, number> = {
  perte: 2.0, // le plus haut : c'est ce qui protège le muscle en déficit
  muscle: 1.8,
  force: 1.8,
  forme: 1.6,
};

/** Lipides par kilo : plancher hormonal, jamais en dessous. */
const FAT_PER_KG = 0.8;

export interface MacroInput {
  sex: Sex;
  age: number | null | undefined;
  heightCm: number | null | undefined;
  weightKg: number | null | undefined;
  activity: Activity | null | undefined;
  goal: Goal;
  /** Séances par semaine, pour affiner la dépense. */
  days: number;
}

/** Une mesure plausible, ou null. Les bornes écartent les fautes de frappe. */
function borne(v: number | null | undefined, min: number, max: number): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= min && n <= max ? n : null;
}

/**
 * Le chiffrage complet, ou `null` si une donnée manque.
 *
 * Le sexe « je préfère ne pas préciser » est traité comme une absence de
 * donnée : la formule de Mifflin-St Jeor a deux constantes séparées par 166
 * kcal, et en choisir une au hasard reviendrait à se tromper d'autant une fois
 * sur deux.
 */
export function computeMacros(i: MacroInput): Macros | null {
  const age = borne(i.age, 14, 99);
  const height = borne(i.heightCm, 120, 230);
  const weight = borne(i.weightKg, 35, 250);
  if (age == null || height == null || weight == null) return null;
  if (i.sex !== "femme" && i.sex !== "homme") return null;

  // Mifflin-St Jeor.
  const bmr = Math.round(10 * weight + 6.25 * height - 5 * age + (i.sex === "homme" ? 5 : -161));

  const jours = Math.max(0, Math.min(7, Math.round(i.days) || 0));
  const facteur = (BASE_FACTOR[i.activity ?? "sedentaire"] ?? BASE_FACTOR.sedentaire) + jours * PER_SESSION;
  const tdee = Math.round(bmr * facteur);

  const target = Math.round(tdee * (1 + ADJUST[i.goal]));

  const proteinG = Math.round(weight * PROTEIN_PER_KG[i.goal]);
  const fatG = Math.round(weight * FAT_PER_KG);
  // Les glucides prennent ce qui reste : ce sont eux qui s'ajustent, jamais les
  // protéines ni le plancher de lipides.
  const reste = target - proteinG * 4 - fatG * 9;
  const carbG = Math.max(0, Math.round(reste / 4));

  // 35 ml par kilo, plus un quart de litre par séance hebdomadaire.
  const waterL = Math.round((weight * 0.035 + jours * 0.05) * 10) / 10;

  const m = height / 100;
  const bmi = Math.round((weight / (m * m)) * 10) / 10;

  return { bmr, tdee, target, proteinG, fatG, carbG, waterL, bmi };
}

/**
 * Répartition des calories du jour en quatre repas.
 *
 * Des pourcentages, pas des grammes : le document propose des exemples de
 * repas, et « environ 600 kcal » se transpose sur n'importe quelle assiette,
 * alors qu'une pesée au gramme près ne se tient pas une semaine.
 */
export const MEAL_SPLIT: readonly { meal: string; share: number }[] = [
  { meal: "Petit-déjeuner", share: 0.25 },
  { meal: "Déjeuner", share: 0.35 },
  { meal: "Collation", share: 0.1 },
  { meal: "Dîner", share: 0.3 },
];

export function mealCalories(target: number): { meal: string; kcal: number }[] {
  return MEAL_SPLIT.map((m) => ({ meal: m.meal, kcal: Math.round((target * m.share) / 10) * 10 }));
}
