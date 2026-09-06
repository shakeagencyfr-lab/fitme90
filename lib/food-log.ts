// ------------------------------------------------------------------ *
// My Fitness App, JOURNAL ALIMENTAIRE : ce que le client a réellement mangé,
// à côté de ce que le plan lui demande.
//
// La nutrition de l'espace client était un plan à suivre (journée type,
// recettes, liste de courses) sans aucun moyen de noter ce qu'on mange. Le
// journal ferme la boucle : un code-barres scanné, une quantité, et la
// journée se compare à la cible. Les données produit viennent d'Open Food
// Facts, base collaborative et ouverte, française d'origine et alimentée par
// les rayons européens : c'est ce qui fait qu'un yaourt de supermarché
// allemand ou espagnol y figure, là où les bases américaines n'ont rien.
//
// PAS D'IA ICI. Tout est arithmétique : macros pour 100 g, quantité,
// addition. Le journal ne coûte donc rien au coach, quel que soit le nombre
// de scans, et n'entre pas dans les quotas.
//
// Ce fichier est PUR (aucun réseau, aucune horloge, aucune base) : la lecture
// d'un produit Open Food Facts, la mise à l'échelle et les totaux sont
// testés ici une fois pour toutes. Le réseau vit dans lib/open-food-facts.ts.
// ------------------------------------------------------------------ */

import { translate, type Locale, type TKey } from "@/lib/i18n";
import type { Repas } from "@/lib/recipe-catalog";

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Fiche d'un produit, pour 100 g (ou 100 ml pour un liquide). */
export interface FoodProduct {
  /** Code-barres EAN/UPC, null pour une saisie à la main. */
  barcode: string | null;
  name: string;
  brand: string | null;
  per100: Macros;
  /** Portion indiquée par le fabricant, en grammes, si connue. */
  servingG: number | null;
  image: string | null;
  /** Nutri-Score a..e, si renseigné. */
  nutriscore: string | null;
  source: "off" | "manual";
}

/** Une ligne du journal, telle que stockée : la quantité et la fiche pour 100 g. */
export interface FoodEntry {
  id: string;
  day: number;
  slot: Repas;
  name: string;
  brand: string | null;
  barcode: string | null;
  grams: number;
  per100: Macros;
}

/** Ordre d'affichage des repas dans la journée. */
export const MEAL_SLOTS: readonly Repas[] = ["petit-dejeuner", "dejeuner", "collation", "diner"] as const;

export function isMealSlot(v: unknown): v is Repas {
  return typeof v === "string" && (MEAL_SLOTS as readonly string[]).includes(v);
}

/** Libellé d'un repas, dans les deux langues (la nutrition n'en avait qu'en français). */
export function mealSlotLabel(slot: Repas, locale: Locale): string {
  const KEYS: Record<Repas, TKey> = { "petit-dejeuner": "nutrition.mealBreakfast", dejeuner: "nutrition.mealLunch", collation: "nutrition.mealSnack", diner: "nutrition.mealDinner" };
  return translate(locale, KEYS[slot]);
}

/**
 * Repas le plus probable selon l'heure : c'est le choix proposé par défaut
 * quand on ajoute un aliment, pour qu'un scan se fasse en deux gestes.
 */
export function slotForHour(hour: number): Repas {
  if (hour < 11) return "petit-dejeuner";
  if (hour < 15) return "dejeuner";
  if (hour < 18) return "collation";
  return "diner";
}

// ------------------------------------------------------------------ code-barres

/** Ne garde que les chiffres ; vide si ce n'est pas un code plausible. */
export function normalizeBarcode(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 14 ? digits : "";
}

/**
 * Variantes d'un code à essayer dans l'ordre. Open Food Facts range un UPC-A
 * (12 chiffres, courant sur les produits importés) sous sa forme EAN-13 avec
 * un zéro devant, et certains lecteurs rendent l'inverse. On tente les deux
 * sans doublon, le code lu d'abord.
 */
export function barcodeCandidates(code: string): string[] {
  const c = normalizeBarcode(code);
  if (!c) return [];
  const out = [c];
  if (c.length === 12) out.push("0" + c);
  if (c.length === 13 && c.startsWith("0")) out.push(c.slice(1));
  if (c.length === 8) out.push("00000" + c);
  return [...new Set(out)];
}

// ------------------------------------------------------------------ Open Food Facts

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** kcal d'après les macros, quand le fabricant ne l'a pas écrite. */
export function kcalFromMacros(m: { protein: number; carbs: number; fat: number }): number {
  return Math.round(m.protein * 4 + m.carbs * 4 + m.fat * 9);
}

/**
 * Lit une fiche produit Open Food Facts (objet `product` de l'API) et la
 * ramène à ce dont le journal a besoin. Renvoie null si la fiche est
 * inexploitable : pas de nom, ou aucune valeur nutritionnelle.
 *
 * Les valeurs sont « pour 100 g » d'après la base. L'énergie peut être donnée
 * en kcal (`energy-kcal_100g`) ou seulement en kJ (`energy_100g`) : on
 * convertit. Sans énergie du tout mais avec des macros, on la recalcule
 * (4-4-9), c'est ce qu'écrit l'étiquette à l'arrondi près.
 */
export function parseOffProduct(raw: unknown, locale: Locale = "fr"): FoodProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const n = (p.nutriments && typeof p.nutriments === "object" ? p.nutriments : {}) as Record<string, unknown>;

  const name = [p[`product_name_${locale}`], p.product_name, p[`generic_name_${locale}`], p.generic_name]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .find((v) => v.length > 0);
  if (!name) return null;

  const protein = num(n.proteins_100g);
  const carbs = num(n.carbohydrates_100g);
  const fat = num(n.fat_100g);
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null) {
    const kj = num(n.energy_100g) ?? num(n["energy-kj_100g"]);
    if (kj !== null) kcal = kj / 4.184;
  }
  if (kcal === null && protein === null && carbs === null && fat === null) return null;
  const macros = { protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 };
  if (kcal === null) kcal = kcalFromMacros(macros);

  const brandRaw = typeof p.brands === "string" ? p.brands.split(",")[0].trim() : "";
  const servingQ = num(p.serving_quantity);
  const servingUnit = typeof p.serving_quantity_unit === "string" ? p.serving_quantity_unit.toLowerCase() : "g";
  // Une portion en ml se traite comme des grammes : c'est l'approximation
  // qu'utilisent les étiquettes elles-mêmes pour les boissons.
  const servingG = servingQ && servingQ > 0 && (servingUnit === "g" || servingUnit === "ml") ? Math.round(servingQ) : null;
  const image = [p.image_front_small_url, p.image_small_url, p.image_front_url].find((v) => typeof v === "string" && v.startsWith("https://")) as string | undefined;
  const grade = typeof p.nutriscore_grade === "string" && /^[a-e]$/.test(p.nutriscore_grade) ? p.nutriscore_grade : null;
  const code = typeof p.code === "string" ? normalizeBarcode(p.code) : "";

  return {
    barcode: code || null,
    name: name.slice(0, 120),
    brand: brandRaw ? brandRaw.slice(0, 60) : null,
    per100: {
      kcal: Math.max(0, Math.round(kcal)),
      protein: Math.max(0, round1(macros.protein)),
      carbs: Math.max(0, round1(macros.carbs)),
      fat: Math.max(0, round1(macros.fat)),
    },
    servingG,
    image: image ?? null,
    nutriscore: grade,
    source: "off",
  };
}

// ------------------------------------------------------------------ arithmétique

/** Macros d'une quantité donnée d'un produit. */
export function macrosFor(per100: Macros, grams: number): Macros {
  const k = Math.max(0, grams) / 100;
  return {
    kcal: Math.round(per100.kcal * k),
    protein: round1(per100.protein * k),
    carbs: round1(per100.carbs * k),
    fat: round1(per100.fat * k),
  };
}

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Total d'une liste de lignes. */
export function sumEntries(entries: readonly FoodEntry[]): Macros {
  const t = { ...ZERO };
  for (const e of entries) {
    const m = macrosFor(e.per100, e.grams);
    t.kcal += m.kcal;
    t.protein += m.protein;
    t.carbs += m.carbs;
    t.fat += m.fat;
  }
  return { kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat) };
}

/** Part de la cible atteinte, bornée à 0..1 pour une jauge (1.3 reste 1). */
export function ratio(value: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(1, value / target));
}

/** Regroupe les lignes par repas, dans l'ordre de la journée. */
export function groupBySlot(entries: readonly FoodEntry[]): { slot: Repas; entries: FoodEntry[] }[] {
  return MEAL_SLOTS.map((slot) => ({ slot, entries: entries.filter((e) => e.slot === slot) })).filter((g) => g.entries.length > 0);
}

/** Quantité proposée à l'ajout : la portion du fabricant, sinon 100 g. */
export function defaultGrams(p: Pick<FoodProduct, "servingG">): number {
  return p.servingG && p.servingG > 0 ? p.servingG : 100;
}

/** Borne une quantité saisie : entière, entre 1 g et 5 kg. */
export function clampGrams(v: unknown): number | null {
  const n = num(v);
  if (n === null || n <= 0) return null;
  return Math.min(5000, Math.max(1, Math.round(n)));
}

/** Borne une fiche « à la main » : nom obligatoire, macros positives ou nulles. */
export function manualProduct(input: { name: unknown; kcal?: unknown; protein?: unknown; carbs?: unknown; fat?: unknown; barcode?: unknown }): FoodProduct | null {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 120) : "";
  if (!name) return null;
  const protein = Math.max(0, num(input.protein) ?? 0);
  const carbs = Math.max(0, num(input.carbs) ?? 0);
  const fat = Math.max(0, num(input.fat) ?? 0);
  const kcalIn = num(input.kcal);
  const kcal = kcalIn !== null && kcalIn > 0 ? kcalIn : kcalFromMacros({ protein, carbs, fat });
  if (kcal <= 0 && protein + carbs + fat <= 0) return null;
  return {
    barcode: typeof input.barcode === "string" ? normalizeBarcode(input.barcode) || null : null,
    name,
    brand: null,
    per100: { kcal: Math.round(Math.min(900, kcal)), protein: round1(Math.min(100, protein)), carbs: round1(Math.min(100, carbs)), fat: round1(Math.min(100, fat)) },
    servingG: null,
    image: null,
    nutriscore: null,
    source: "manual",
  };
}

// ------------------------------------------------------------------ pour le Coach IA

/**
 * Le journal du jour en une poignée de lignes pour le prompt du coach : il
 * sait ainsi où en est le client avant de répondre « qu'est-ce que je mange
 * ce soir ? ». Compact, parce que chaque ligne se paie à chaque message.
 */
export function journalDigest(entries: readonly FoodEntry[], target: Macros, locale: Locale = "fr"): string {
  if (!entries.length) return translate(locale, "nutrition.digestEmpty");
  const tot = sumEntries(entries);
  const head = translate(locale, "nutrition.digestHead", {
    kcal: tot.kcal, kcalTarget: target.kcal, p: tot.protein, pTarget: target.protein, c: tot.carbs, cTarget: target.carbs, f: tot.fat, fTarget: target.fat,
  });
  const lines = groupBySlot(entries).map((g) => {
    const items = g.entries.map((e) => `${e.name}${e.brand ? ` (${e.brand})` : ""} ${e.grams} g, ${macrosFor(e.per100, e.grams).kcal} kcal`).join(" ; ");
    return `- ${mealSlotLabel(g.slot, locale)} : ${items}`;
  });
  return [head, ...lines].join("\n");
}
