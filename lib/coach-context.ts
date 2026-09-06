import { cycleIndexForDay, cycleSessions, sessionForDay, type Plan, type Session } from "./program";
import { isCircuitSession } from "./circuit";
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

/**
 * Une séance en lignes de texte pour le modèle : « Nom 4x8 » en séries, et,
 * pour un circuit, une ligne par bloc avec ses paramètres et ses exercices.
 * Un bloc en finisher d'une séance en séries s'ajoute après les exercices.
 */
export function sessionLines(s: Session): string[] {
  const blocs = (s.blocks ?? []).map(
    (b) =>
      `${b.title || "Bloc"} : ${b.rounds} tours, ${b.work} s effort / ${b.rest} s repos${b.sensation ? `, sensation ${b.sensation}/4` : ""} : ${b.exercises.map((e) => e.name).join(", ")}`,
  );
  if (isCircuitSession(s)) return [`Séance en circuit (chrono, sans charge ni RPE, sensations de 1 à 4)`, ...blocs];
  return [
    ...s.exercises.map((e) => (e.cardio ? `${e.name} ${e.duration}${e.zone ? ` (${e.zone})` : ""}` : `${e.name} ${e.sets}x${e.reps}`)),
    ...blocs.map((b) => `Finisher en circuit, ${b}`),
  ];
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
 * Calendrier CONTIGU à partir du jour courant, un élément par jour, jours de
 * repos COMPRIS. Les séances viennent de `sessionForDay`, la même fonction que
 * l'app, pour deux raisons distinctes :
 *
 * 1. Le `weekPlan` mappe un jour de SEMAINE alors que la rotation réelle suit
 *    le RANG du jour d'entraînement depuis le début. Les deux divergent dès que
 *    le programme ne démarre pas sur le premier jour d'entraînement de la
 *    semaine, et le coach annonçait alors une autre séance que l'app.
 * 2. Le calendrier doit être contigu. En ne listant que les jours
 *    d'entraînement, « demain » n'apparaissait pas quand c'était un jour de
 *    repos, et le modèle répondait avec la séance suivante de la liste.
 */
export function coachAgenda(
  plan: Plan | null | undefined,
  currentDay: number,
  pattern: boolean[],
  startWd: number,
  programDays: number,
  days = 7,
): AgendaEntry[] {
  if (!plan) return [];
  const out: AgendaEntry[] = [];
  const from = Math.max(1, currentDay);

  for (let day = from; day <= programDays && out.length < days; day++) {
    if (isRestDay(day, pattern, startWd)) {
      out.push({ day, rest: true, title: "Repos", exercises: [] });
      continue;
    }
    const s = sessionForDay(plan, day, pattern, startWd);
    out.push({
      day,
      rest: false,
      title: s?.title ?? "Séance",
      exercises: s ? sessionLines(s) : [],
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
        const set = e.circuit ? `circuit${e.sensation ? `, sensation ${e.sensation}/4` : ""}` : e.cardio ? "cardio" : `${e.kg ?? "?"}kg x${e.reps ?? "?"}`;
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
