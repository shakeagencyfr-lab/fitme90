import { DAYS } from "@/lib/questionnaire";

// Rythme entraînement / repos dérivé des jours choisis par le client
// (train_days). Jour de programme d → jour de semaine DAYS[(d-1)%7]
// (le programme démarre conceptuellement un lundi).

/** 7 booléens dans l'ordre LUN→DIM : true = repos. */
export function restPatternFromTrainDays(trainDays: string[]): boolean[] {
  const set = new Set(trainDays);
  return DAYS.map((d) => !set.has(d));
}

/**
 * Motif de repos effectif : priorité aux jours choisis par le client ;
 * sinon on retombe sur le motif du plan généré, sinon un défaut 3 séances.
 */
export function restPattern(trainDays: string[], planRest?: boolean[]): boolean[] {
  if (trainDays && trainDays.length) return restPatternFromTrainDays(trainDays);
  if (planRest && planRest.length === 7) return planRest;
  // Défaut : LUN/MER/VEN entraînement.
  return [false, true, false, true, false, true, true];
}

/** Le jour de programme donné est-il un jour de repos ? */
export function isRestDay(dayNumber: number, pattern: boolean[]): boolean {
  const len = pattern.length || 7;
  return pattern[(dayNumber - 1) % len];
}
