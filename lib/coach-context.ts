import { cycleIndexForDay, cycleSessions, sessionForDay, type Plan } from "./program";
import { isRestDay } from "./schedule";
import type { LogEntry } from "./records";

// Mise en forme du CONTEXTE envoyé au coach IA à chaque message. Ce contexte est
// rejoué en entier à chaque tour, il pèse donc l'essentiel de la facture : sur
// la conso mesurée, le programme JSON complet représentait 79 % des tokens
// d'entrée. On envoie ici la même information utile, en beaucoup plus compact.

/**
 * Vue du programme destinée au COACH IA. Le détail des séances n'est envoyé que
 * pour le cycle EN COURS ; les autres cycles gardent leur en-tête, donc la
 * progression d'ensemble reste lisible. Les clés `sessions` / `session` de
 * compat historique sont retirées : `cycleSessions` s'en sert déjà en repli, les
 * envoyer une seconde fois ne faisait que dupliquer le cycle 1.
 *
 * Effet de bord voulu : le volume devient indépendant de la durée du programme.
 * Un plan 12 mois coûte le même prompt qu'un plan 3 mois.
 */
export function coachPlanView(plan: Plan | null | undefined, day: number): Record<string, unknown> {
  if (!plan) return {};
  const base = {
    summary: plan.summary,
    weekPlan: plan.weekPlan,
    nutrition: plan.nutrition,
    ...(plan.warning ? { warning: plan.warning } : {}),
  };

  const cycles = plan.cycles ?? [];
  // Anciens plans sans cycles : on retombe sur les séances non cyclées.
  if (!cycles.length) return { ...base, seances: cycleSessions(plan, 0) };

  const current = cycleIndexForDay(Math.max(1, day), cycles.length);
  return {
    ...base,
    cycleEnCours: current + 1,
    cycles: cycles.map((c, i) => {
      const head = { label: c.label, name: c.name, weeks: c.weeks, body: c.body };
      return i === current ? { ...head, sessions: cycleSessions(plan, i) } : head;
    }),
  };
}

export interface AgendaEntry {
  /** Jour de programme (1 = premier jour). */
  day: number;
  rest: boolean;
  title: string;
  /** Exercices de la séance, « Nom 4x8 ». Vide un jour de repos. */
  exercises: string[];
}

/**
 * Séances réellement prévues, calculées avec `sessionForDay`, LA MÊME fonction
 * que l'app. Sans ce bloc, le coach déduisait la séance du `weekPlan`, qui mappe
 * un jour de SEMAINE, alors que la rotation réelle suit le RANG du jour
 * d'entraînement depuis le début du programme. Les deux divergent dès que le
 * programme ne démarre pas sur le premier jour d'entraînement de la semaine :
 * le client voyait alors une séance dans l'app et une autre dans le chat.
 */
export function coachAgenda(
  plan: Plan | null | undefined,
  currentDay: number,
  pattern: boolean[],
  startWd: number,
  programDays: number,
  ahead = 3,
): AgendaEntry[] {
  if (!plan) return [];
  const out: AgendaEntry[] = [];
  const from = Math.max(1, currentDay);

  for (let day = from; day <= programDays && out.length <= ahead; day++) {
    const rest = isRestDay(day, pattern, startWd);
    // Les jours de repos ne sont retenus que pour le jour courant, afin que le
    // coach sache que rien n'est prévu aujourd'hui.
    if (rest) {
      if (day === from) out.push({ day, rest: true, title: "Repos", exercises: [] });
      continue;
    }
    const s = sessionForDay(plan, day, pattern, startWd);
    if (!s) continue;
    out.push({
      day,
      rest: false,
      title: s.title,
      exercises: s.exercises.map((e) => `${e.name} ${e.sets}x${e.reps}`),
    });
  }
  return out;
}

export interface CoachLog {
  day: number;
  volume: number | null;
  sets_done: number | null;
  entries: LogEntry[] | null;
}

/**
 * Séances validées, en texte compact. Conserve TOUTES les charges (le coach s'en
 * sert pour proposer la progression) et supprime seulement l'échafaudage JSON :
 * les séries identiques sont regroupées, « 3x(60kg x8) » au lieu de trois objets.
 */
export function logsDigest(logs: CoachLog[]): string {
  if (!logs.length) return "Aucune séance validée pour l'instant.";
  return logs
    .map((l) => {
      const head = [
        `J${l.day}`,
        l.volume ? `volume ${l.volume}` : "",
        l.sets_done ? `${l.sets_done} séries` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      const byExercise = new Map<string, Map<string, number>>();
      for (const e of l.entries ?? []) {
        if (!e.exercise) continue;
        const set = e.cardio ? "cardio" : `${e.kg ?? "?"}kg x${e.reps ?? "?"}`;
        const sets = byExercise.get(e.exercise) ?? new Map<string, number>();
        sets.set(set, (sets.get(set) ?? 0) + 1);
        byExercise.set(e.exercise, sets);
      }

      const detail = [...byExercise.entries()]
        .map(([exercise, sets]) => {
          const parts = [...sets.entries()].map(([s, n]) => (n > 1 ? `${n}x(${s})` : s));
          return `${exercise} ${parts.join(", ")}`;
        })
        .join(" ; ");

      return detail ? `${head} : ${detail}` : head;
    })
    .join("\n");
}
