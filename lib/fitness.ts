// Calculs de forme (purs) — repris de la maquette : IMC, FC max, zones
// cardiaques de Karvonen, échelle RPE. Réutilisables côté client et serveur.

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  if (!h) return 0;
  return weightKg / (h * h);
}

export interface BmiBadge {
  label: string;
  fg: string;
  bg: string;
  /** position 0–100 sur la jauge 15→40. */
  pos: number;
}

export function bmiBadge(v: number): BmiBadge {
  const label = v < 18.5 ? "Insuffisance" : v < 25 ? "Normale" : v < 30 ? "Surpoids" : "Obésité";
  const fg = v < 18.5 ? "#2C5E86" : v < 25 ? "#2F6B3C" : v < 30 ? "#8A6A17" : "#A33B10";
  const bg = v < 18.5 ? "#E6F0FA" : v < 25 ? "#E8F3E9" : v < 30 ? "#FBF2DC" : "#FBE7DE";
  const pos = Math.max(0, Math.min(100, ((v - 15) / 25) * 100));
  return { label, fg, bg, pos };
}

export interface HeartZone {
  id: string;
  name: string;
  use: string;
  fg: string;
  bg: string;
  range: string; // "124–136"
}

/** FC max estimée (220 − âge) et zones de Karvonen (réserve cardiaque). */
export function karvonen(age: number, restHr: number): { hrMax: number; hrReserve: number; zones: HeartZone[] } {
  const hrMax = 220 - age;
  const hrReserve = hrMax - restHr;
  const z = (p: number) => Math.round(restHr + (p / 100) * hrReserve);
  const defs: [string, string, string, number, number, string, string][] = [
    ["Z1", "Récupération", "Marche, retour au calme", 50, 60, "#3E6E8E", "#EDF3F8"],
    ["Z2", "Endurance", "Base du cardio", 60, 70, "#2F6B3C", "#EBF3EC"],
    ["Z3", "Tempo", "Seuil aérobie", 70, 80, "#8A6A17", "#FAF4E4"],
    ["Z4", "Seuil", "Intervalles longs", 80, 90, "#C4471A", "#FCEEE7"],
    ["Z5", "VO₂ max", "Sprints courts", 90, 100, "#8E2A0C", "#F9E6E0"],
  ];
  const zones = defs.map(([id, name, use, lo, hi, fg, bg]) => ({
    id,
    name,
    use,
    fg,
    bg,
    range: `${z(lo)}–${z(hi)}`,
  }));
  return { hrMax, hrReserve, zones };
}

// Détection des exercices cardio (pas de séries/charges : on affiche une zone).
const CARDIO_RE =
  /(cardio|rameur|aviron|v[ée]lo|elliptique|tapis|course|courir|jogging|footing|\brun\b|marche|hiit|fractionn|intervalle|corde\s*à?\s*sauter|natation|\bnage\b|assault|air\s*bike|airbike|ski\s*erg|stair|escalier|sprint|liss|zone\s*[12345])/i;

export function isCardioExercise(name: string, note?: string, cardio?: boolean): boolean {
  if (cardio) return true;
  return CARDIO_RE.test(`${name} ${note ?? ""}`);
}

/** Choisit la zone cardiaque cible d'un cardio selon un indice explicite ou des
 *  mots-clés (défaut : endurance Z2). */
export function cardioZone(zones: HeartZone[], hint: string, name: string, note?: string): HeartZone {
  const txt = `${hint} ${name} ${note ?? ""}`.toLowerCase();
  const byId = (id: string) => zones.find((z) => z.id === id) ?? zones[1];
  const explicit = /z(?:one)?\s*([1-5])/.exec(txt);
  if (explicit) return byId(`Z${explicit[1]}`);
  if (/(r[ée]cup|retour au calme|\bmarche\b|calme)/.test(txt)) return byId("Z1");
  if (/(vo2|sprint|max\b)/.test(txt)) return byId("Z5");
  if (/(hiit|fractionn|intervalle|seuil|court)/.test(txt)) return byId("Z4");
  if (/(tempo)/.test(txt)) return byId("Z3");
  return byId("Z2"); // endurance par défaut
}

export interface RpeStep {
  id: string;
  label: string;
  body: string;
}

// Échelle RPE (répétitions en réserve).
export const RPE: RpeStep[] = [
  { id: "6", label: "Facile", body: "Tu pourrais faire 4 répétitions de plus" },
  { id: "7", label: "Modéré", body: "3 répétitions en réserve, respiration qui monte" },
  { id: "8", label: "Difficile", body: "2 répétitions en réserve, la technique tient encore" },
  { id: "9", label: "Très difficile", body: "1 répétition en réserve, dernière rep lente" },
  { id: "10", label: "Maximal", body: "Aucune répétition en réserve — à éviter en cycle 1" },
];

export const RPE_INTRO =
  "Aucune charge n'est imposée : tu ne connais pas encore tes maxima. Choisis un poids au ressenti pour atteindre le RPE visé, note ce que tu as fait, et le coach te proposera les charges de la séance suivante à partir de ces données.";

/** RPE visé selon le cycle : 7 au cycle 1, 8 aux cycles 2 et 3. */
export function targetRpe(day: number): "7" | "8" {
  return day <= 30 ? "7" : "8";
}
