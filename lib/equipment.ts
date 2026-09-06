import { pick, type Locale, type LocalText } from "@/lib/i18n";
// Vocabulaire de référence du matériel de salle.
//
// La détection photo renvoyait du texte libre, injecté tel quel dans le brief
// de génération (`buildBrief`, avec la consigne « Aucun exercice hors de cette
// liste »). Un nom vague ou inventé contaminait donc tout le programme. Le
// modèle rattache maintenant chaque machine vue à l'une de ces familles, tout
// en gardant le nom précis lu sur la photo.

/** Familles comprises par le générateur de programme. */
export const EQUIPMENT_FAMILIES = [
  "barre olympique",
  "rack à squat",
  "banc (plat, incliné, décliné)",
  "haltères",
  "kettlebells",
  "poulie (haute, basse, vis-à-vis)",
  "smith machine",
  "presse à cuisses",
  "hack squat",
  "leg extension",
  "leg curl",
  "machine à mollets",
  "machine à pectoraux (pec deck, convergente)",
  "machine à dos (tirage vertical, tirage horizontal)",
  "machine à épaules",
  "machine à biceps / triceps",
  "machine abdominaux / lombaires",
  "machine fessiers et hanches (abduction, adduction, hip thrust)",
  "barre de traction",
  "barres parallèles / dips",
  "élastiques",
  "TRX / sangles de suspension",
  "medecine ball / slam ball",
  "ballon de gym (swiss ball)",
  "tapis de course",
  "vélo / vélo assault",
  "rameur",
  "elliptique",
  "escalier / stairmaster",
  "traîneau / sled",
  "step / box",
  "corde à sauter",
  "poids du corps uniquement",
] as const;

/** Niveau de certitude du modèle. Volontairement indépendant de la langue. */
export type EquipConfidence = "high" | "medium" | "low";

/**
 * Traduit un niveau pour l'affichage. Le modèle répond en anglais sur cette
 * clé quelle que soit la langue du client : l'ancien enum français faisait
 * silencieusement retomber toutes les réponses anglaises sur « moyenne ».
 */
export function confidenceLabel(c: string | null | undefined, locale: Locale): string | null {
  const map: Record<EquipConfidence, LocalText> = {
    high: { fr: "sûr", en: "confident" },
    medium: { fr: "probable", en: "likely" },
    low: { fr: "incertain", en: "unsure" },
  };
  const key = (c ?? "").toLowerCase();
  // Tolère les anciennes lignes déjà enregistrées en français.
  const legacy: Record<string, EquipConfidence> = {
    "élevée": "high", elevee: "high", moyenne: "medium", faible: "low",
  };
  const norm = (key in map ? key : legacy[key]) as EquipConfidence | undefined;
  return norm ? pick(map[norm], locale) : null;
}

/** Clé de dédoublonnage : deux photos de la même machine ne font qu'une ligne. */
export function equipmentKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
