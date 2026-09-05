import type { PlanExercise, Session } from "@/lib/program";

/**
 * Retouches d'une séance décidées dans le chat : ajouter, retirer, remplacer
 * ou ajuster un exercice. Pur, sans base ni modèle, testé à sec.
 *
 * Le Coach IA disait au client qu'il « ne pouvait pas modifier la fiche
 * séance » et lui dictait les changements à reporter à la main. C'est
 * l'inverse du service vendu : le coach modifie, le client s'entraîne. Les
 * opérations sont nommées et bornées pour que le modèle ne réécrive jamais
 * toute la séance à l'aveugle : ce qu'il ne touche pas reste tel quel,
 * charges et notes comprises.
 */

export interface ExerciseInput {
  nom?: string;
  series?: number;
  reps?: string;
  charge?: string;
  note?: string;
  repos_sec?: number;
  cardio?: boolean;
  duree?: string;
  zone?: string;
}

export interface SessionOp {
  action: "ajouter" | "retirer" | "remplacer" | "modifier";
  /** L'exercice visé (retirer, remplacer, modifier), par son nom. */
  exercice?: string;
  /** Le nouvel exercice (ajouter, remplacer) ou les champs à changer (modifier). */
  nouveau?: ExerciseInput;
  /** Position 1-based où insérer (ajouter). Fin de séance par défaut. */
  position?: number;
}

export interface SessionEditResult {
  session: Session;
  /** Ce qui a changé, une ligne par opération réussie, à renvoyer au modèle. */
  changes: string[];
  /** Ce qui n'a pas pu être fait, et pourquoi. */
  errors: string[];
}

/** Nom normalisé pour comparer : minuscules, sans accents ni ponctuation. */
export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** L'index de l'exercice dont le nom correspond : exact d'abord, sinon inclus. */
export function findExercise(exercises: PlanExercise[], name: string): number {
  const n = normalizeName(name);
  if (!n) return -1;
  const exact = exercises.findIndex((e) => normalizeName(e.name) === n);
  if (exact >= 0) return exact;
  return exercises.findIndex((e) => normalizeName(e.name).includes(n) || n.includes(normalizeName(e.name)));
}

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" ? Math.trunc(v) : Number.NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const str = (v: unknown, max = 120): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Un exercice complet à partir des champs fournis, avec des défauts sains. */
export function buildExercise(input: ExerciseInput, base?: PlanExercise): PlanExercise | null {
  const name = str(input.nom, 80) || base?.name || "";
  if (!name) return null;
  const cardio = typeof input.cardio === "boolean" ? input.cardio : base?.cardio ?? false;
  const ex: PlanExercise = {
    name,
    sets: clampInt(input.series, 1, 12, base?.sets ?? (cardio ? 1 : 3)),
    reps: str(input.reps, 40) || base?.reps || (cardio ? "" : "10"),
    load: str(input.charge, 60) || (input.charge === undefined ? base?.load ?? "" : ""),
    note: str(input.note, 200) || (input.note === undefined ? base?.note ?? "" : ""),
    cardio,
    duration: str(input.duree, 40) || (input.duree === undefined ? base?.duration ?? "" : ""),
    zone: str(input.zone, 40) || (input.zone === undefined ? base?.zone ?? "" : ""),
  };
  const rest = input.repos_sec !== undefined ? clampInt(input.repos_sec, 15, 600, 90) : base?.rest;
  if (rest !== undefined) ex.rest = rest;
  return ex;
}

const label = (e: PlanExercise): string =>
  e.cardio ? `${e.name}${e.duration ? ` ${e.duration}` : ""}${e.zone ? ` (${e.zone})` : ""}` : `${e.name} ${e.sets}x${e.reps}${e.load ? ` @ ${e.load}` : ""}`;

/** Applique les opérations dans l'ordre. Celles qui échouent n'annulent pas les autres. */
export function applySessionOps(session: Session, ops: SessionOp[]): SessionEditResult {
  const exercises = session.exercises.map((e) => ({ ...e }));
  const changes: string[] = [];
  const errors: string[] = [];

  for (const op of ops) {
    const target = op.exercice ?? "";
    switch (op.action) {
      case "ajouter": {
        const ex = op.nouveau ? buildExercise(op.nouveau) : null;
        if (!ex) {
          errors.push("ajouter : il manque le nom de l'exercice.");
          break;
        }
        if (findExercise(exercises, ex.name) >= 0) {
          errors.push(`ajouter : « ${ex.name} » est déjà dans la séance, utilise modifier.`);
          break;
        }
        const pos = clampInt(op.position, 1, exercises.length + 1, exercises.length + 1) - 1;
        exercises.splice(pos, 0, ex);
        changes.push(`ajouté ${label(ex)} en position ${pos + 1}`);
        break;
      }
      case "retirer": {
        const i = findExercise(exercises, target);
        if (i < 0) {
          errors.push(`retirer : « ${target} » n'est pas dans la séance.`);
          break;
        }
        if (exercises.length <= 1) {
          errors.push("retirer : une séance garde au moins un exercice.");
          break;
        }
        const [gone] = exercises.splice(i, 1);
        changes.push(`retiré ${gone.name}`);
        break;
      }
      case "remplacer": {
        const i = findExercise(exercises, target);
        if (i < 0) {
          errors.push(`remplacer : « ${target} » n'est pas dans la séance.`);
          break;
        }
        const ex = op.nouveau ? buildExercise(op.nouveau, exercises[i]) : null;
        if (!ex || normalizeName(ex.name) === normalizeName(exercises[i].name) && !op.nouveau?.nom) {
          errors.push("remplacer : il manque le nouvel exercice.");
          break;
        }
        const old = exercises[i].name;
        exercises[i] = ex;
        changes.push(`remplacé ${old} par ${label(ex)}`);
        break;
      }
      case "modifier": {
        const i = findExercise(exercises, target);
        if (i < 0) {
          errors.push(`modifier : « ${target} » n'est pas dans la séance.`);
          break;
        }
        const ex = buildExercise({ ...(op.nouveau ?? {}), nom: op.nouveau?.nom || exercises[i].name }, exercises[i]);
        if (!ex) {
          errors.push("modifier : rien à changer.");
          break;
        }
        exercises[i] = ex;
        changes.push(`ajusté ${label(ex)}`);
        break;
      }
      default:
        errors.push(`action inconnue : ${String((op as { action?: unknown }).action)}`);
    }
  }

  return { session: { ...session, exercises }, changes, errors };
}
