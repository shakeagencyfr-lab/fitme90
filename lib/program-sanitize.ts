import type { Plan, PlanExercise, Session } from "./program";
import { flattenBlocks, sanitizeBlock } from "./circuit";

// Garde-fou déterministe (« blindage ») du plan généré. PUR (aucune dépendance
// serveur) donc testable : quoi que renvoie le modèle, on corrige les
// incohérences les plus graves avant d'écrire le plan. Deux problèmes vus en
// production : des exercices de MUSCULATION (rowing poulie, marche du fermier…)
// étiquetés « cardio » avec des durées absurdes (40 min de portés lourds), et
// des durées cardio irréalistes.

// Portés / marches lestées : MUSCULATION en séries courtes, jamais du cardio.
const CARRY_RE = /fermier|farmer|\bport[ée]s?\b|yoke|valise|carry|sled|tra[iî]neau|prowler/i;

// Mouvements de MUSCULATION (matériel ou pattern de force) : jamais du cardio.
const MUSCU_RE =
  /rowing|tirage|poulie|halt[èe]re|barre|kettlebell|squat|d[ée]velopp|couch[ée]|curl|\bpress[eé]?\b|fente|soulev[ée]|hip.?thrust|traction|\bdips?\b|[ée]l[ée]vation|extension|\bpresse\b|shrug|haussement|pull.?over|good.?morning|\bhack\b|leg.?(curl|ext|press)|mollet|molet|biceps|triceps|pectoral|dorsaux?|[ée]paules?|fessier|ischio|quadriceps|gain(age|é)|planche|crunch|abdo/i;

// Vrais mouvements de CARDIO (liste fermée). Tout le reste est de la muscu.
const CARDIO_RE =
  /rameur|ergom[èe]tre|rowing.?machine|machine.?[àa].?ramer|v[ée]lo|bicycl|assault.?bike|air.?bike|ski.?erg|skierg|tapis|\bcourse\b|courir|jogging|\brun\b|elliptique|corde.?[àa].?sauter|saut.{0,6}corde|stepper|step.?up|montées?.{0,8}marche|marche.?rapide|\bHIIT\b|natation|\bnage\b|burpee|mountain.?climber|jumping.?jack/i;

function firstInt(s: string): number | null {
  const m = String(s).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Corrige un exercice : classification cardio/muscu fiable + bornes réalistes. */
export function sanitizeExercise(e: PlanExercise): PlanExercise {
  const name = e.name || "";
  const isCarry = CARRY_RE.test(name);
  const looksMuscu = MUSCU_RE.test(name);
  const looksCardio = CARDIO_RE.test(name);

  // Un porté / une marche lestée est TOUJOURS de la muscu (séries courtes).
  if (isCarry) {
    const reps = /m|s\b|sec|min|mètre|pas/i.test(e.reps || "") ? e.reps : "30 à 40 m";
    return {
      ...e,
      cardio: false,
      duration: "",
      zone: "",
      sets: e.sets && e.sets > 0 ? e.sets : 3,
      reps,
      rest: e.rest ?? 90,
    };
  }

  if (e.cardio) {
    // Faux cardio (matériel de force, nom de muscu, ou pas un vrai mouvement
    // cardio) → on le repasse en musculation avec des séries normales.
    if (looksMuscu || !looksCardio) {
      return {
        ...e,
        cardio: false,
        duration: "",
        zone: "",
        sets: e.sets && e.sets > 0 ? e.sets : 3,
        reps: e.reps && e.reps.trim() ? e.reps : "10 à 12",
        rest: e.rest ?? 90,
      };
    }
    // Vrai cardio : durée bornée à 8–20 min (jamais 40 min en fin de séance).
    const mins = firstInt(e.duration || "");
    const clamped = mins == null ? 12 : Math.min(20, Math.max(8, mins));
    return { ...e, cardio: true, sets: 0, reps: "", load: "", duration: `${clamped} min`, zone: e.zone || "Z2" };
  }

  return e;
}

/**
 * Assainit une séance. Les blocs de circuit sont ramenés dans leurs bornes et
 * vidés de leurs exercices sans nom ; une séance en circuit tient son miroir
 * à plat (`exercises`) DES blocs, jamais l'inverse ; une séance "sets" garde
 * ses exercices et, éventuellement, un bloc en finisher. Une séance qui n'a
 * que des blocs est un circuit, quoi qu'en dise son "format".
 */
export function sanitizeSession(s: Session): Session {
  const blocks = (s.blocks ?? []).map(sanitizeBlock).filter((b) => b.exercises.length > 0);
  const exercises = (s.exercises ?? []).map(sanitizeExercise);
  const circuit = blocks.length > 0 && (s.format === "circuit" || exercises.length === 0);
  if (circuit) {
    return { ...s, format: "circuit", restSec: 0, blocks, exercises: flattenBlocks(blocks) };
  }
  return { ...s, format: "sets", blocks: blocks.length ? blocks : undefined, exercises };
}

/** Applique le garde-fou à toutes les séances d'un plan (cycles + repli). */
export function sanitizePlan(plan: Plan): Plan {
  return {
    ...plan,
    cycles: (plan.cycles ?? []).map((c) => (c.sessions ? { ...c, sessions: c.sessions.map(sanitizeSession) } : c)),
    sessions: plan.sessions ? plan.sessions.map(sanitizeSession) : plan.sessions,
    session: plan.session ? sanitizeSession(plan.session) : plan.session,
  };
}
