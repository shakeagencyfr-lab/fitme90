// ------------------------------------------------------------------ *
// My Fitness App, logique métier NUTRITION : la journée type et la liste
// de courses de l'espace client.
//
// Le README l'exige : c'est le seul endroit du projet où un bug est
// invisible à l'œil nu (filtrage d'allergènes, régimes, mise à l'échelle
// des quantités, agrégation de la liste de courses). D'où les tests.
//
// Ce fichier ne décide plus de ce qu'on mange : il met en forme ce que le
// moteur de recettes a choisi (lib/recipe-engine.ts). Les deux écrans qu'il
// sert, la journée type et les courses, sortent ainsi du MÊME catalogue que
// les fiches recettes, filtré par le MÊME questionnaire.
//
// Fonctions PURES et déterministes : aucune dépendance réseau ni horloge.
// Le jour (`dayIndex`) et le caractère « jour de repos » sont fournis par
// l'appelant, qui les tient du plan généré.
// ------------------------------------------------------------------ */

import { menuForDay, shoppingEntries, REPAS_LABEL, type Profil } from "@/lib/recipe-engine";
import { RAYON_LABEL, RAYON_ORDRE, type Repas } from "@/lib/recipe-catalog";
import { pick, type Locale } from "@/lib/i18n";

// ------------------------------------------------------------------ helpers

/** Extrait un nombre d'une chaîne (« 2 580 kcal » → 2580). */
export function pnum(v: string | number): number {
  return (
    parseFloat(
      String(v)
        .replace(/[^0-9.,]/g, "")
        .replace(",", "."),
    ) || 0
  );
}

/** Formate un entier avec séparateur de milliers par espace fine (2580 → « 2 580 »). */
export function grp(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);







/** Calories cible du jour : base, réduite de 10 % un jour de repos. */
export function targetKcalForDay(baseKcal: number, isRestDay: boolean): number {
  return Math.round(baseKcal * (isRestDay ? 0.9 : 1));
}

/** Part des glucides conservée un jour de repos. */
export const REST_CARB_RATIO = 0.8;

export interface DayMacros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Macros cibles d'un jour, selon qu'on s'entraîne ou non.
 *
 * La règle tient en une phrase, et c'est elle qu'il faut connaître pour lire
 * le tableau : un jour de repos, on baisse les GLUCIDES, pas les protéines.
 * Les glucides servent à alimenter la séance ; sans séance, ils ne servent à
 * rien. Les protéines, elles, servent à réparer ce que la séance de la veille
 * a abîmé : les baisser un jour de repos reviendrait à couper la
 * reconstruction au moment précis où elle a lieu. Les lipides ne bougent pas,
 * ils portent l'équilibre hormonal.
 *
 * Le calcul vivait en double, dans l'écran nutrition et nulle part ailleurs.
 * Le sortir ici permet au PDF d'afficher exactement les mêmes chiffres que
 * l'application, et de les tester une fois pour les deux.
 */
export function macrosForDay(
  base: { kcal: number; protein: number; carbs: number; fat: number },
  isRestDay: boolean,
): DayMacros {
  return {
    kcal: targetKcalForDay(base.kcal, isRestDay),
    protein: Math.round(base.protein),
    carbs: Math.round(base.carbs * (isRestDay ? REST_CARB_RATIO : 1)),
    fat: Math.round(base.fat),
  };
}

export interface ScaledMeal {
  time: string;
  slot: string;
  name: string;
  kcal: number;
  items: { food: string; qty: string }[];
}

/** Heure indicative de chaque repas, pour la journée type et le PDF. */
const HEURE: Record<Repas, string> = {
  "petit-dejeuner": "7 h 30",
  dejeuner: "12 h 30",
  collation: "16 h 00",
  diner: "20 h 00",
};

/**
 * Les repas d'un jour donné, tirés du CATALOGUE DE RECETTES.
 *
 * Ils sortaient jusqu'ici d'une banque de repas séparée, écrite pour la
 * maquette : le client lisait une journée type et une liste de courses qui
 * n'avaient aucun rapport avec les recettes qu'on lui proposait par ailleurs,
 * et son filtrage se limitait à sept étiquettes d'allergènes. Une seule source
 * règle les deux problèmes d'un coup : la journée type applique désormais tout
 * le questionnaire (régime, cadre religieux, aliments refusés, budget, temps
 * de cuisine), et la liste de courses ci-dessous est l'addition exacte de ces
 * mêmes recettes.
 */
export function dayMeals(
  dayIndex: number,
  isRestDay: boolean,
  base: DayMacros,
  profil: Profil,
  repas: readonly Repas[] = ["petit-dejeuner", "dejeuner", "diner", "collation"],
): ScaledMeal[] {
  const cible = macrosForDay(base, isRestDay);
  const menu = menuForDay({
    jour: dayIndex,
    repas,
    macros: { kcal: cible.kcal, p: cible.protein, c: cible.carbs, f: cible.fat },
    profil,
  });
  return menu.map((r) => ({
    time: HEURE[r.repas],
    slot: REPAS_LABEL[r.repas],
    name: r.nom,
    kcal: Math.round(r.macros.kcal),
    items: r.ingredients.map((i) => ({ food: i.nom, qty: i.libelle })),
  }));
}

// Arrondi « courses » : masse/volume arrondi à un pas lisible, converti en
// kg/l au-delà de 1000. Sans unité (« pièces »), arrondi au supérieur.
function roundQty(q: number, unit: string): string {
  if (!unit) return String(Math.ceil(q));
  if (q >= 1000) return (((Math.round(q / 50) * 50) / 1000).toFixed(1)).replace(".", ",");
  return String(q >= 100 ? Math.round(q / 10) * 10 : Math.round(q / 5) * 5);
}
function shopUnit(q: number, unit: string): string {
  if (!unit) return "";
  return q >= 1000 ? (unit === "ml" ? " l" : " kg") : " " + unit;
}

export interface ShoppingRow {
  key: string;
  food: string;
  qty: string;
  rayon: string;
}
export interface ShoppingGroup {
  name: string;
  count: string;
  items: ShoppingRow[];
}

/**
 * Liste des courses agrégée de `startDay` à `startDay + spanDays - 1`
 * (bornée à `maxDay`), classée par rayon.
 *
 * C'est l'addition, aliment par aliment, des recettes que la journée type
 * servira sur la période. Le client peut donc cuisiner tout ce qu'on lui
 * propose avec ce qu'il vient d'acheter, ni plus ni moins. Restent en dehors
 * les fonds de placard cités dans les étapes (sel, poivre, épices, ail,
 * herbes) : ils ne pèsent rien dans les macros et alourdiraient la liste à
 * chaque semaine.
 *
 * @param isRestOf renvoie true si le jour donné est un jour de repos.
 */
export function shoppingList(
  startDay: number,
  spanDays: number,
  isRestOf: (dayIndex: number) => boolean,
  base: DayMacros,
  profil: Profil,
  repas: readonly Repas[] = ["petit-dejeuner", "dejeuner", "diner", "collation"],
  maxDay = 90,
  locale: Locale = "fr",
): ShoppingGroup[] {
  const jours: ReturnType<typeof menuForDay>[] = [];
  const end = Math.min(maxDay, startDay + spanDays - 1);
  for (let d = startDay; d <= end; d++) {
    const cible = macrosForDay(base, isRestOf(d));
    jours.push(
      menuForDay({
        jour: d,
        repas,
        macros: { kcal: cible.kcal, p: cible.protein, c: cible.carbs, f: cible.fat },
        profil,
      }),
    );
  }

  const rows = shoppingEntries(jours).map((e) => {
    // Un aliment qui se compte se lit en pièces : « 14 œufs », pas « 770 g ».
    const qty = e.piece
      ? (() => {
          const n = Math.ceil(e.grammes / e.piece);
          const [un, plusieurs] = e.pieceLabel ?? ["pièce", "pièces"];
          return `${n} ${n > 1 ? plusieurs : un}`;
        })()
      : roundQty(e.grammes, e.unite) + shopUnit(e.grammes, e.unite);
    return { key: e.food, food: e.nom, qty, rayon: pick(RAYON_LABEL[e.rayon], locale) };
  });

  return RAYON_ORDRE.map((r) => {
    const name = pick(RAYON_LABEL[r], locale);
    const items = rows.filter((x) => x.rayon === name);
    return { name, count: items.length + " " + plural(items.length, "article", "articles"), items };
  }).filter((g) => g.items.length > 0);
}

/** Version texte de la liste (pour le bouton « copier »). */
export function shoppingListText(groups: ShoppingGroup[]): string {
  return groups
    .map(
      (g) =>
        g.name.toUpperCase() +
        "\n" +
        g.items.map((i) => "- " + i.food + " : " + i.qty).join("\n"),
    )
    .join("\n\n");
}
