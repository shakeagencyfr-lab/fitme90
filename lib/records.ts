// Records de charges (« table de force ») calculés à partir des séances
// validées. Pur et testable. On ne compte que les exercices de musculation
// avec une charge renseignée (> 0) ; le cardio et le poids du corps sont exclus.

export interface LogEntry {
  exercise: string;
  kg: number | null;
  reps: number | null;
  cardio?: boolean;
  /** Bloc de circuit terminé : `exercise` porte le titre du bloc. */
  circuit?: boolean;
  /** Sensation notée à la fin du bloc, de 1 (facile) à 4 (à fond). */
  sensation?: number;
}

export interface PersonalRecord {
  exercise: string;
  /** Charge maximale soulevée (kg) et les répétitions faites à cette charge. */
  kg: number;
  reps: number;
  /** 1RM estimé (formule d'Epley) sur le meilleur set, arrondi. */
  e1rm: number;
}

/** 1RM estimé (Epley) : charge x (1 + reps/30). */
export function epley1rm(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  return kg * (1 + reps / 30);
}

interface Set {
  kg: number;
  reps: number;
}

export function personalRecords(entries: LogEntry[]): PersonalRecord[] {
  const byExercise = new Map<string, Set[]>();
  for (const e of entries) {
    if (e.cardio) continue;
    const kg = Number(e.kg);
    const reps = Number(e.reps);
    if (!e.exercise || !(kg > 0) || !(reps > 0)) continue;
    const list = byExercise.get(e.exercise) ?? [];
    list.push({ kg, reps });
    byExercise.set(e.exercise, list);
  }

  const records: PersonalRecord[] = [];
  for (const [exercise, list] of byExercise) {
    // Charge max : plus lourde soulevée ; à charge égale, on garde le plus de reps.
    let best = list[0];
    let e1rm = 0;
    for (const s of list) {
      if (s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps)) best = s;
      e1rm = Math.max(e1rm, epley1rm(s.kg, s.reps));
    }
    records.push({ exercise, kg: best.kg, reps: best.reps, e1rm: Math.round(e1rm) });
  }

  // Trié par 1RM estimé décroissant : les plus gros mouvements en tête.
  return records.sort((a, b) => b.e1rm - a.e1rm || a.exercise.localeCompare(b.exercise, "fr"));
}
