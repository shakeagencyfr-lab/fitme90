// ------------------------------------------------------------------ *
// FitMe90 — logique métier NUTRITION (recopiée fidèlement de la maquette)
//
// Le README l'exige : c'est le seul endroit du projet où un bug est
// invisible à l'œil nu (filtrage d'allergènes, régimes, mise à l'échelle
// des quantités, agrégation de la liste de courses). D'où les tests.
//
// Fonctions PURES et déterministes : aucune dépendance réseau ni horloge.
// Le jour (`dayIndex`) et le caractère « jour de repos » sont fournis par
// l'appelant, qui les tient du plan généré.
// ------------------------------------------------------------------ */

export type MealItem = [food: string, qty: number, unit: string];

export interface MealVariant {
  name: string;
  kcal: number;
  /** étiquettes d'allergènes / catégorie : gluten, lactose, nuts, egg, fish, shell, soy, meat */
  tags: string[];
  items: MealItem[];
}

export interface MealSlot {
  slot: string;
  time: string;
  share: number;
  v: MealVariant[];
}

// Banque de repas — reprise telle quelle de la maquette (BANK).
export const BANK: MealSlot[] = [
  {
    slot: "Petit-déjeuner",
    time: "7 h 30",
    share: 0.24,
    v: [
      { name: "Avoine & skyr", kcal: 600, tags: ["gluten", "lactose"], items: [["Flocons d'avoine", 80, "g"], ["Skyr nature", 200, "g"], ["Myrtilles", 100, "g"], ["Beurre de cacahuète", 15, "g"]] },
      { name: "Omelette & pain complet", kcal: 590, tags: ["egg", "gluten"], items: [["Œufs", 3, ""], ["Pain complet", 80, "g"], ["Avocat", 60, "g"]] },
      { name: "Bowl riz coco & fruits", kcal: 575, tags: [], items: [["Riz cuit", 200, "g"], ["Lait de coco", 80, "ml"], ["Banane", 1, ""], ["Graines de courge", 20, "g"]] },
      { name: "Pancakes protéinés", kcal: 610, tags: ["egg", "lactose"], items: [["Farine de riz", 70, "g"], ["Œufs", 2, ""], ["Fromage blanc", 150, "g"], ["Sirop d'érable", 15, "g"]] },
    ],
  },
  {
    slot: "Déjeuner",
    time: "12 h 30",
    share: 0.31,
    v: [
      { name: "Poulet, riz, courgettes", kcal: 740, tags: ["meat"], items: [["Blanc de poulet", 180, "g"], ["Riz basmati cuit", 220, "g"], ["Courgettes rôties", 200, "g"], ["Huile d'olive", 10, "g"]] },
      { name: "Bœuf haché & patate douce", kcal: 760, tags: ["meat"], items: [["Bœuf haché 5 %", 160, "g"], ["Patate douce", 280, "g"], ["Haricots verts", 200, "g"]] },
      { name: "Dahl lentilles corail", kcal: 700, tags: [], items: [["Lentilles corail", 120, "g"], ["Lait de coco", 60, "ml"], ["Épinards", 150, "g"], ["Riz complet cuit", 150, "g"]] },
      { name: "Cabillaud & quinoa", kcal: 720, tags: ["fish"], items: [["Cabillaud", 200, "g"], ["Quinoa cuit", 220, "g"], ["Poivrons rôtis", 180, "g"]] },
      { name: "Bowl tofu & sarrasin", kcal: 710, tags: ["soy"], items: [["Tofu ferme", 200, "g"], ["Sarrasin cuit", 200, "g"], ["Brocoli", 180, "g"], ["Sauce soja", 15, "ml"]] },
    ],
  },
  {
    slot: "Collation",
    time: "16 h 00",
    share: 0.15,
    v: [
      { name: "Avant séance", kcal: 350, tags: ["lactose"], items: [["Banane", 1, ""], ["Galettes de riz", 3, ""], ["Whey isolate", 25, "g"]] },
      { name: "Fruits & amandes", kcal: 330, tags: ["nuts"], items: [["Pomme", 1, ""], ["Amandes", 30, "g"], ["Compote sans sucre", 100, "g"]] },
      { name: "Toast houmous", kcal: 345, tags: ["gluten"], items: [["Pain complet", 60, "g"], ["Houmous", 60, "g"], ["Tomates cerises", 100, "g"]] },
      { name: "Skyr & miel", kcal: 320, tags: ["lactose"], items: [["Skyr", 250, "g"], ["Miel", 15, "g"], ["Flocons d'avoine", 25, "g"]] },
    ],
  },
  {
    slot: "Dîner",
    time: "20 h 00",
    share: 0.3,
    v: [
      { name: "Saumon & patate douce", kcal: 690, tags: ["fish"], items: [["Saumon", 150, "g"], ["Patate douce", 250, "g"], ["Épinards à l'ail", 150, "g"]] },
      { name: "Omelette & salade de pois chiches", kcal: 660, tags: ["egg"], items: [["Œufs", 3, ""], ["Pois chiches cuits", 180, "g"], ["Roquette", 80, "g"], ["Huile d'olive", 10, "g"]] },
      { name: "Dinde & purée de céleri", kcal: 670, tags: ["meat"], items: [["Escalope de dinde", 170, "g"], ["Céleri-rave", 300, "g"], ["Pomme de terre", 150, "g"]] },
      { name: "Curry de pois cassés", kcal: 650, tags: [], items: [["Pois cassés cuits", 220, "g"], ["Riz cuit", 150, "g"], ["Chou-fleur", 200, "g"], ["Lait de coco", 50, "ml"]] },
    ],
  },
];

// Libellé du questionnaire → étiquette d'allergène interne.
export const ALLERGEN_MAP: Record<string, string> = {
  Gluten: "gluten",
  Lactose: "lactose",
  "Fruits à coque": "nuts",
  Œuf: "egg",
  Poisson: "fish",
  Crustacés: "shell",
  Soja: "soy",
};

// Classement des ingrédients par rayon (ordre = ordre d'affichage).
const RAYONS: [string, RegExp][] = [
  ["Fruits & légumes", /myrtille|banane|pomme de terre|pomme|courgette|haricot|épinard|poivron|brocoli|tomate|roquette|chou-fleur|patate douce|céleri|avocat/i],
  ["Viandes & poissons", /poulet|bœuf|dinde|saumon|cabillaud/i],
  ["Crémerie & œufs", /skyr|fromage blanc|œuf|whey/i],
  ["Épicerie sèche", /avoine|riz|quinoa|sarrasin|lentille|pois|farine|galette|amande|graine|houmous|pain|tofu/i],
  ["Liquides & condiments", /huile|lait de coco|sauce soja|miel|sirop|cacahuète|compote/i],
];

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

function rayonOf(food: string): string {
  for (const [name, re] of RAYONS) if (re.test(food)) return name;
  return "Autres";
}

/**
 * Étiquettes interdites, à partir des allergies déclarées et du régime.
 * Végétarien exclut viande + poisson ; végétalien exclut en plus œuf + lactose.
 */
export function bannedTags(
  allergies: string[] | undefined | null,
  diet?: string | null,
): Record<string, 1> {
  const banned: Record<string, 1> = {};
  (Array.isArray(allergies) ? allergies : []).forEach((a) => {
    if (ALLERGEN_MAP[a]) banned[ALLERGEN_MAP[a]] = 1;
  });
  if (diet === "Végétarien") {
    banned.meat = 1;
    banned.fish = 1;
  }
  if (diet === "Végétalien") {
    banned.meat = 1;
    banned.fish = 1;
    banned.egg = 1;
    banned.lactose = 1;
  }
  return banned;
}

/**
 * Facteur d'échelle des quantités : rapport kcal cible / kcal de base,
 * borné entre 0,7 et 1,45 (évite les portions absurdes).
 */
export function scaleFactor(targetKcal: number, baseSum: number): number {
  return Math.max(0.7, Math.min(1.45, targetKcal / (baseSum || 1)));
}

/**
 * Choisit une variante par créneau, en écartant les variantes contenant un
 * allergène/catégorie interdit. Si tout est exclu pour un créneau, on
 * retombe sur la liste complète (mieux vaut proposer que rien afficher).
 * Rotation déterministe selon `dayIndex` pour varier d'un jour à l'autre.
 */
function pickVariants(dayIndex: number, banned: Record<string, 1>): MealVariant[] {
  return BANK.map((b, si) => {
    const ok = b.v.filter((v) => !v.tags.some((t) => banned[t]));
    const pool = ok.length ? ok : b.v;
    return pool[(dayIndex + si * 3) % pool.length];
  });
}

/** Calories cible du jour : base, réduite de 10 % un jour de repos. */
export function targetKcalForDay(baseKcal: number, isRestDay: boolean): number {
  return Math.round(baseKcal * (isRestDay ? 0.9 : 1));
}

export interface ScaledMeal {
  time: string;
  slot: string;
  name: string;
  kcal: number;
  items: { food: string; qty: string }[];
}

/**
 * Repas du jour : variantes filtrées puis quantités mises à l'échelle des
 * calories cibles du jour.
 */
export function dayMeals(
  dayIndex: number,
  isRestDay: boolean,
  baseKcal: number,
  banned: Record<string, 1>,
): ScaledMeal[] {
  const target = targetKcalForDay(baseKcal, isRestDay);
  const chosen = pickVariants(dayIndex, banned);
  const baseSum = chosen.reduce((a, v) => a + v.kcal, 0) || 1;
  const scale = scaleFactor(target, baseSum);
  return chosen.map((v, i) => ({
    time: BANK[i].time,
    slot: BANK[i].slot,
    name: v.name,
    kcal: Math.round(v.kcal * scale),
    items: v.items.map(([food, qty, unit]) => ({
      food,
      qty: unit
        ? `${Math.max(1, Math.round(qty * scale))} ${unit}`
        : String(Math.max(1, Math.round(qty * scale))),
    })),
  }));
}

interface RawItem {
  food: string;
  qty: number;
  unit: string;
}

/** Ingrédients bruts (quantités fractionnaires) d'un jour, pour agrégation. */
function itemsForDay(
  dayIndex: number,
  isRestDay: boolean,
  baseKcal: number,
  banned: Record<string, 1>,
): RawItem[] {
  const target = targetKcalForDay(baseKcal, isRestDay);
  const chosen = pickVariants(dayIndex, banned);
  const sum = chosen.reduce((a, v) => a + v.kcal, 0) || 1;
  const sc = scaleFactor(target, sum);
  const out: RawItem[] = [];
  chosen.forEach((v) =>
    v.items.forEach(([food, qty, unit]) => out.push({ food, qty: qty * sc, unit })),
  );
  return out;
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
 * @param isRestOf renvoie true si le jour donné est un jour de repos.
 */
export function shoppingList(
  startDay: number,
  spanDays: number,
  isRestOf: (dayIndex: number) => boolean,
  baseKcal: number,
  banned: Record<string, 1>,
  maxDay = 90,
): ShoppingGroup[] {
  const acc: Record<string, RawItem> = {};
  const end = Math.min(maxDay, startDay + spanDays - 1);
  for (let d = startDay; d <= end; d++) {
    itemsForDay(d, isRestOf(d), baseKcal, banned).forEach(({ food, qty, unit }) => {
      const k = food + "|" + unit;
      if (!acc[k]) acc[k] = { food, unit, qty: 0 };
      acc[k].qty += qty;
    });
  }

  const rows: ShoppingRow[] = Object.keys(acc)
    .map((k) => {
      const it = acc[k];
      const q = roundQty(it.qty, it.unit) + shopUnit(it.qty, it.unit);
      return {
        key: k,
        food: it.food,
        qty: it.unit ? q : q + " " + plural(Math.ceil(it.qty), "pièce", "pièces"),
        rayon: rayonOf(it.food),
      };
    })
    .sort((a, b) => a.food.localeCompare(b.food, "fr"));

  const order = RAYONS.map((r) => r[0]).concat(["Autres"]);
  return order
    .map((name) => {
      const items = rows.filter((r) => r.rayon === name);
      return {
        name,
        count: items.length + " " + plural(items.length, "article", "articles"),
        items,
      };
    })
    .filter((g) => g.items.length > 0);
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
