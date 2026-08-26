import { DAYS } from "./questionnaire";

// Rythme entraînement / repos dérivé des jours choisis par le client
// (train_days) et aligné sur un VRAI calendrier via la date de début.

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

/** Parse une date de début (colonne date "YYYY-MM-DD" ou Date) en UTC. */
export function parseStartDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = typeof v === "string" ? new Date(v.length === 10 ? `${v}T00:00:00Z` : v) : v;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Index de jour de semaine 0=LUN … 6=DIM, en UTC. */
export function weekdayIndexUTC(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/**
 * Décalage de départ : index de jour de semaine (0=LUN) de la date de début.
 * Permet d'aligner le numéro de jour de programme sur le vrai calendrier.
 * 0 si aucune date (comportement historique : jour 1 = lundi).
 */
export function startWeekday(startDate: string | Date | null | undefined): number {
  const d = parseStartDate(startDate);
  return d ? weekdayIndexUTC(d) : 0;
}

/** Date réelle (UTC minuit) du jour de programme `dayNumber` (1 = date de début). */
export function dateOfProgramDay(startDate: string | Date, dayNumber: number): Date {
  const s = parseStartDate(startDate) ?? new Date();
  const base = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  return new Date(base + (dayNumber - 1) * 86_400_000);
}

/**
 * Le jour de programme donné est-il un jour de repos ?
 * `startWd` = index (0=LUN) du jour de semaine de la date de début : le jour de
 * programme d tombe le jour de semaine (startWd + d − 1) mod 7. Sans décalage
 * (0), on retrouve le comportement « jour 1 = lundi ».
 */
export function isRestDay(dayNumber: number, pattern: boolean[], startWd = 0): boolean {
  const len = pattern.length || 7;
  const idx = (((startWd + dayNumber - 1) % len) + len) % len;
  return pattern[idx];
}
