// Adhérence et série (« streak ») du programme — calculs purs, réutilisables
// côté serveur (tableau de bord) et testables. On raisonne en JOURS DE
// PROGRAMME (1..90) alignés sur le vrai calendrier via le motif de repos et le
// décalage de départ, exactement comme la séance et l'agenda.

import { isRestDay } from "./schedule";

export interface AdherenceStats {
  /** Jours d'entraînement planifiés déjà DUS (strictement avant aujourd'hui). */
  due: number;
  /** Séances validées parmi les jours dus. */
  done: number;
  /** Séances manquées (dues mais non validées). */
  missed: number;
  /** Adhérence en %, arrondie. null tant qu'aucune séance n'est encore due. */
  adherence: number | null;
  /** Série en cours : séances planifiées validées consécutives jusqu'à ce jour. */
  streak: number;
  /** Meilleure série atteinte sur tout le parcours. */
  bestStreak: number;
  /** Total de séances validées (jours planifiés), aujourd'hui inclus si fait. */
  completedTotal: number;
  /** La séance planifiée d'aujourd'hui est-elle encore à faire ? */
  todayPending: boolean;
  /** Prochain palier de séances à célébrer (null si tous atteints). */
  nextMilestone: number | null;
}

/** Paliers de célébration, exprimés en nombre de séances validées. */
export const MILESTONES = [1, 5, 10, 15, 20, 30, 40, 50] as const;

/** Numéros des jours d'entraînement planifiés de 1 à `upto` (inclus). */
export function scheduledTrainingDays(pattern: boolean[], startWd: number, upto: number): number[] {
  const days: number[] = [];
  for (let d = 1; d <= upto; d++) {
    if (!isRestDay(d, pattern, startWd)) days.push(d);
  }
  return days;
}

export function computeAdherence(opts: {
  pattern: boolean[];
  startWd: number;
  currentDay: number;
  completedDays: number[];
  programDays?: number;
}): AdherenceStats {
  const programDays = opts.programDays ?? 90;
  const currentDay = Math.max(0, Math.min(opts.currentDay, programDays));
  const done = new Set(opts.completedDays);
  const sched = scheduledTrainingDays(opts.pattern, opts.startWd, currentDay);

  const todayScheduled = currentDay >= 1 && !isRestDay(currentDay, opts.pattern, opts.startWd);
  const todayDone = done.has(currentDay);
  const todayPending = todayScheduled && !todayDone;

  // Jours DUS : jours planifiés strictement passés (aujourd'hui n'est pas
  // « manqué » tant que la journée n'est pas finie).
  const dueDays = sched.filter((d) => d < currentDay);
  const doneCount = dueDays.filter((d) => done.has(d)).length;
  const due = dueDays.length;
  const missed = due - doneCount;
  const adherence = due === 0 ? null : Math.round((doneCount / due) * 100);

  // Série en cours : on remonte les jours planifiés ; aujourd'hui non-fait ne
  // casse pas la série (journée en cours), un jour passé manqué l'arrête.
  let streak = 0;
  for (let i = sched.length - 1; i >= 0; i--) {
    const d = sched[i];
    if (done.has(d)) {
      streak++;
      continue;
    }
    if (d === currentDay) continue; // aujourd'hui pas encore fait
    break;
  }

  // Meilleure série : plus longue suite de jours planifiés consécutifs validés.
  let bestStreak = 0;
  let run = 0;
  for (const d of sched) {
    if (done.has(d)) {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else if (d !== currentDay) {
      run = 0;
    }
  }

  const completedTotal = sched.filter((d) => done.has(d)).length;
  const nextMilestone = MILESTONES.find((m) => m > completedTotal) ?? null;

  return {
    due,
    done: doneCount,
    missed,
    adherence,
    streak,
    bestStreak,
    completedTotal,
    todayPending,
    nextMilestone,
  };
}
