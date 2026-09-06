// Séances en circuit : blocs d'exercices chronométrés qui s'enchaînent.
//
// POURQUOI. Un client sans salle (poids du corps, petit matériel) n'a ni
// charge à noter ni RPE à viser : ce qui structure sa séance, c'est le TEMPS.
// « 40 secondes de pompes, 20 secondes de repos, exercice suivant », trois
// tours, puis le bloc suivant. Le programme est donc écrit en blocs, et un
// chrono enchaîne tout sans que la personne ait à toucher l'écran.
//
// Le module est PUR : les règles (durées, niveaux, budget de temps), la
// remise en forme d'un bloc rendu par le modèle, le déroulé seconde par
// seconde que suit le chrono, et l'échelle de sensations qui remplace le RPE.
// Rien ici ne touche le réseau ni l'écran, tout se teste à sec.

import { pick, type Locale, type LocalText } from "@/lib/i18n";
import type { PlanExercise, Session } from "@/lib/program";
import { matchEquipment } from "@/lib/equipment-catalog";

/** Un exercice d'un bloc : un nom de la bibliothèque, une consigne. */
export interface CircuitExercise {
  name: string;
  /** Clé de la fiche, posée par le verrouillage (jamais par le modèle). */
  key?: string;
  note: string;
}

export interface CircuitBlock {
  title: string;
  /** Tours du bloc (chaque tour passe tous les exercices dans l'ordre). */
  rounds: number;
  /** Effort par exercice, en secondes. */
  work: number;
  /** Repos entre deux exercices, en secondes (0 = enchaîné). */
  rest: number;
  /** Repos entre deux tours, en secondes. */
  roundRest: number;
  /** Repos après le bloc, avant le suivant, en secondes. */
  restAfter: number;
  /** Sensation visée (1 à 4), voir SENSATIONS. */
  sensation?: number;
  exercises: CircuitExercise[];
}

// ─────────────────────────────────────────────────────────────── matériel

/**
 * Familles du catalogue qui ne se trouvent QUE dans une salle. Un client dont
 * aucun matériel n'en relève s'entraîne chez lui, dehors, ou dans une salle
 * d'hôtel : c'est le public du circuit.
 */
const FAMILLES_SALLE = new Set<string>([
  "barre olympique",
  "rack à squat",
  "smith machine",
  "poulie (haute, basse, vis-à-vis)",
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
  "barres parallèles / dips",
  "tapis de course",
  "vélo / vélo assault",
  "rameur",
  "elliptique",
  "escalier / stairmaster",
  "traîneau / sled",
]);

/** Ce qu'une ligne libre (non reconnue) dit quand elle parle d'une salle. */
const MOTS_SALLE = /machine|poulie|presse|rack|smith|olympique|cable|pulley|leg |pec.?deck|hack|tapis de course|treadmill|rameur|rower|elliptique|salle|gym\b/i;

/**
 * Vrai quand le client n'a pas de salle : rien dans son matériel ne relève
 * d'une famille de salle, ni par le catalogue ni par les mots d'une ligne
 * libre. Sans matériel du tout, c'est oui.
 */
export function isHomeEquipment(equipment: readonly string[]): boolean {
  for (const nom of equipment) {
    const item = matchEquipment(nom);
    if (item) {
      if (FAMILLES_SALLE.has(item.famille)) return false;
      continue;
    }
    if (MOTS_SALLE.test(nom)) return false;
  }
  return true;
}

// ───────────────────────────────────────────────────────────────── niveaux

export type CircuitLevel = "debutant" | "intermediaire" | "avance";

/** Niveau lu dans la réponse « Expérience » du questionnaire. */
export function circuitLevel(answer: unknown): CircuitLevel {
  const a = String(answer ?? "").toLowerCase();
  if (/jamais|never|moins|less than/.test(a)) return "debutant";
  if (/plus de|more than|\b[3-9]\s*\+|avanc|advanced/.test(a)) return "avance";
  return "intermediaire";
}

/** Durée cible de séance, en minutes, lue dans « 45 min ». */
export function sessionMinutes(dur: unknown, fallback = 45): number {
  const m = String(dur ?? "").match(/\d+/);
  const n = m ? parseInt(m[0], 10) : NaN;
  return Number.isFinite(n) && n >= 15 && n <= 180 ? n : fallback;
}

export interface CircuitParams {
  work: number;
  rest: number;
  rounds: number;
}

/**
 * Paramètres conseillés par niveau et par cycle : la progression se fait sur
 * le rapport effort / repos et sur le nombre de tours, jamais sur une charge.
 */
export function circuitParams(level: CircuitLevel, cycleIndex: number): CircuitParams {
  const c = Math.max(0, Math.min(2, cycleIndex));
  const table: Record<CircuitLevel, CircuitParams[]> = {
    debutant: [
      { work: 30, rest: 15, rounds: 2 },
      { work: 30, rest: 15, rounds: 3 },
      { work: 40, rest: 20, rounds: 3 },
    ],
    intermediaire: [
      { work: 40, rest: 20, rounds: 3 },
      { work: 45, rest: 15, rounds: 3 },
      { work: 50, rest: 10, rounds: 3 },
    ],
    avance: [
      { work: 45, rest: 15, rounds: 3 },
      { work: 50, rest: 10, rounds: 4 },
      { work: 60, rest: 0, rounds: 4 },
    ],
  };
  return table[level][c];
}

// ─────────────────────────────────────────────────────────────── sensations

export interface SensationStep {
  id: number;
  label: string;
  body: string;
}

const SENSATIONS_FR: SensationStep[] = [
  { id: 1, label: "Facile", body: "Tu pourrais tenir le double sans forcer, tu parles sans t'essouffler." },
  { id: 2, label: "Ça travaille", body: "Le souffle monte, les muscles chauffent, tu peux encore parler par phrases courtes." },
  { id: 3, label: "Dur", body: "Tu comptes les secondes, quelques mots seulement, la technique tient." },
  { id: 4, label: "À fond", body: "Tout ce que tu as jusqu'au signal, impossible de parler. Réservé aux finishers." },
];

const SENSATIONS_EN: SensationStep[] = [
  { id: 1, label: "Easy", body: "You could go twice as long without strain, you can talk freely." },
  { id: 2, label: "Working", body: "Breathing picks up, muscles warm up, you can still speak in short sentences." },
  { id: 3, label: "Hard", body: "You are counting the seconds, a few words only, technique still holds." },
  { id: 4, label: "All out", body: "Everything you have until the signal, no talking possible. Finishers only." },
];

const SENSATION_INTRO_FR =
  "Pas de charge à noter ici : ce qui compte, c'est ce que tu ressens pendant l'effort. Règle ton rythme (amplitude, vitesse, variante plus simple ou plus dure) pour atteindre la sensation visée, et note-la à la fin de chaque bloc.";
const SENSATION_INTRO_EN =
  "No load to write down here: what matters is how the effort feels. Adjust your pace (range, speed, easier or harder variant) to reach the target feeling, and rate it at the end of each block.";

/** L'échelle de sensations dans la langue de la page. */
const SENSATION_SCALES: LocalText<{ intro: string; steps: SensationStep[] }> = {
  fr: { intro: SENSATION_INTRO_FR, steps: SENSATIONS_FR },
  en: { intro: SENSATION_INTRO_EN, steps: SENSATIONS_EN },
};

export function sensationScale(locale: Locale): { intro: string; steps: SensationStep[] } {
  return pick(SENSATION_SCALES, locale);
}

/** Sensation visée selon le cycle : « ça travaille » au premier, « dur » ensuite. */
export function targetSensation(day: number): number {
  return day <= 30 ? 2 : 3;
}

export function sensationLabel(id: number | undefined, locale: Locale): string {
  const step = sensationScale(locale).steps.find((s) => s.id === id);
  return step ? step.label : "";
}

// ──────────────────────────────────────────────────────── remise en forme

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" ? Math.round(v) : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/**
 * Un bloc tel que le modèle l'a rendu, ramené dans des bornes réalistes :
 * 15 à 120 s d'effort, 0 à 90 s de repos, 1 à 8 tours, 1 à 10 exercices.
 * Un bloc sans exercice nommé est rendu vide : l'appelant le retire.
 */
export function sanitizeBlock(raw: Partial<CircuitBlock> | null | undefined): CircuitBlock {
  const b = raw ?? {};
  const rest = clampInt(b.rest, 0, 90, 15);
  const exercises: CircuitExercise[] = (Array.isArray(b.exercises) ? b.exercises : [])
    .map((e) => {
      const name = typeof e?.name === "string" ? e.name.trim().slice(0, 80) : "";
      const note = typeof e?.note === "string" ? e.note.trim().slice(0, 200) : "";
      const key = typeof e?.key === "string" && e.key ? e.key : undefined;
      return key ? { name, key, note } : { name, note };
    })
    .filter((e) => e.name)
    .slice(0, 10);
  const sensation = b.sensation === undefined || b.sensation === null ? undefined : clampInt(b.sensation, 1, 4, 2);
  return {
    title: typeof b.title === "string" ? b.title.trim().slice(0, 60) : "",
    rounds: clampInt(b.rounds, 1, 8, 3),
    work: clampInt(b.work, 15, 120, 40),
    rest,
    roundRest: clampInt(b.roundRest, 0, 180, Math.max(rest, 30)),
    restAfter: clampInt(b.restAfter, 0, 180, 60),
    ...(sensation !== undefined ? { sensation } : {}),
    exercises,
  };
}

/** Durée d'un bloc en secondes, repos après le bloc compris. */
export function blockSeconds(b: CircuitBlock, last = false): number {
  const n = b.exercises.length;
  if (!n) return 0;
  const tour = n * b.work + (n - 1) * b.rest;
  return b.rounds * tour + (b.rounds - 1) * b.roundRest + (last ? 0 : b.restAfter);
}

/** Durée totale des blocs d'une séance, en secondes. */
export function circuitSeconds(blocks: readonly CircuitBlock[]): number {
  return blocks.reduce((a, b, i) => a + blockSeconds(b, i === blocks.length - 1), 0);
}

/** « 24 min », « 1 h 05 ». */
export function formatMinutes(seconds: number): string {
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/**
 * Ramène les blocs dans le temps disponible en retirant des tours aux blocs
 * les plus longs, jamais des exercices : un tour de moins garde la séance
 * entière, un exercice de moins déséquilibre le bloc. Deux tours au minimum.
 */
export function trimToBudget(blocks: readonly CircuitBlock[], budgetSec: number): CircuitBlock[] {
  const out = blocks.map((b) => ({ ...b }));
  let garde = 0;
  while (circuitSeconds(out) > budgetSec && garde++ < 40) {
    let idx = -1;
    let max = 0;
    out.forEach((b, i) => {
      if (b.rounds <= 2) return;
      const d = blockSeconds(b);
      if (d > max) {
        max = d;
        idx = i;
      }
    });
    if (idx < 0) break;
    out[idx].rounds -= 1;
  }
  return out;
}

/**
 * L'inverse de `trimToBudget` : ajoute des tours tant que la séance reste
 * nettement plus courte que le temps dont le client dispose.
 *
 * Une séance reconstruite à partir de peu de mouvements (un dépannage sans
 * matériel) tombait à quinze minutes là où le client en avait quarante-cinq :
 * trop peu de travail pour la séance qu'il devait faire. On monte donc les
 * tours, jamais au-delà de six, et jamais au point de dépasser le budget.
 */
export function fillToBudget(blocks: readonly CircuitBlock[], budgetSec: number, maxRounds = 6): CircuitBlock[] {
  const out = blocks.map((b) => ({ ...b }));
  if (!out.length) return out;
  // On vise 80 % du temps disponible : le compte rond au-dessus déborderait,
  // et l'échauffement comme les transitions prennent le reste.
  const cible = budgetSec * 0.8;
  let garde = 0;
  while (circuitSeconds(out) < cible && garde++ < 40) {
    // Le bloc le plus COURT d'abord : c'est celui dont un tour de plus
    // déséquilibre le moins la séance.
    let idx = -1;
    let min = Infinity;
    out.forEach((b, i) => {
      if (b.rounds >= maxRounds || !b.exercises.length) return;
      const d = blockSeconds(b);
      if (d < min) {
        min = d;
        idx = i;
      }
    });
    if (idx < 0) break;
    const essai = out.map((b, i) => (i === idx ? { ...b, rounds: b.rounds + 1 } : b));
    if (circuitSeconds(essai) > budgetSec) break;
    out[idx] = essai[idx];
  }
  return out;
}

/**
 * Le miroir « à plat » d'un circuit : un exercice de plan par exercice de
 * bloc, séries = tours, reps = secondes d'effort. C'est ce que lisent tous
 * les consommateurs écrits avant les circuits (PDF, coach, qualité du plan) :
 * ils continuent de voir une séance, sans rien savoir des blocs.
 */
export function flattenBlocks(blocks: readonly CircuitBlock[]): PlanExercise[] {
  const out: PlanExercise[] = [];
  for (const b of blocks) {
    for (const e of b.exercises) {
      out.push({
        name: e.name,
        ...(e.key ? { key: e.key } : {}),
        sets: b.rounds,
        reps: `${b.work} s`,
        load: "",
        note: e.note,
        rest: b.rest,
        cardio: false,
        duration: "",
        zone: "",
      });
    }
  }
  return out;
}

/** Une séance est un circuit quand elle en a le format ET des blocs. */
export function isCircuitSession(s: Pick<Session, "format" | "blocks"> | null | undefined): boolean {
  return !!s && s.format === "circuit" && (s.blocks?.length ?? 0) > 0;
}

// ────────────────────────────────────────────────────────────────── déroulé

export type StepKind = "prepare" | "work" | "rest" | "roundRest" | "blockRest" | "done";

export interface Step {
  kind: StepKind;
  seconds: number;
  /** Index du bloc (0-based), ou -1 pour la fin. */
  block: number;
  /** Tour en cours (1-based) pendant un bloc. */
  round: number;
  /** Index de l'exercice pendant un effort ou son repos, sinon -1. */
  exercise: number;
  /** Index de l'exercice qui vient ENSUITE (pour l'annoncer), -1 à la fin. */
  nextExercise: number;
  nextBlock: number;
}

/**
 * Le déroulé complet d'un circuit, seconde par seconde, tel que le chrono le
 * suit : préparation, puis pour chaque bloc, chaque tour, chaque exercice avec
 * son repos, le repos entre tours, le repos entre blocs, et la fin. Les repos
 * à zéro n'apparaissent pas : on enchaîne. Calculé UNE fois, avant le départ,
 * pour que rien ne dépende d'un calcul fait à la volée pendant l'effort.
 */
export function timeline(blocks: readonly CircuitBlock[], prepareSec = 10): Step[] {
  const steps: Step[] = [];
  const first = blocks.findIndex((b) => b.exercises.length);
  if (first < 0) return [{ kind: "done", seconds: 0, block: -1, round: 0, exercise: -1, nextExercise: -1, nextBlock: -1 }];

  const suivant = (bi: number, ei: number): { block: number; exercise: number } => {
    const b = blocks[bi];
    if (ei + 1 < b.exercises.length) return { block: bi, exercise: ei + 1 };
    return { block: bi, exercise: 0 };
  };
  const blocSuivant = (bi: number): number => {
    for (let i = bi + 1; i < blocks.length; i++) if (blocks[i].exercises.length) return i;
    return -1;
  };

  if (prepareSec > 0) {
    steps.push({ kind: "prepare", seconds: prepareSec, block: first, round: 1, exercise: -1, nextExercise: 0, nextBlock: first });
  }

  for (let bi = first; bi < blocks.length; bi++) {
    const b = blocks[bi];
    if (!b.exercises.length) continue;
    const nb = blocSuivant(bi);
    for (let r = 1; r <= b.rounds; r++) {
      for (let ei = 0; ei < b.exercises.length; ei++) {
        const dernierExo = ei === b.exercises.length - 1;
        const dernierTour = r === b.rounds;
        const apres = dernierExo
          ? dernierTour
            ? { block: nb, exercise: nb >= 0 ? 0 : -1 }
            : { block: bi, exercise: 0 }
          : suivant(bi, ei);
        steps.push({ kind: "work", seconds: b.work, block: bi, round: r, exercise: ei, nextExercise: apres.exercise, nextBlock: apres.block });
        if (!dernierExo) {
          if (b.rest > 0) steps.push({ kind: "rest", seconds: b.rest, block: bi, round: r, exercise: ei, nextExercise: ei + 1, nextBlock: bi });
        } else if (!dernierTour) {
          if (b.roundRest > 0) steps.push({ kind: "roundRest", seconds: b.roundRest, block: bi, round: r, exercise: ei, nextExercise: 0, nextBlock: bi });
        } else if (nb >= 0 && b.restAfter > 0) {
          steps.push({ kind: "blockRest", seconds: b.restAfter, block: bi, round: r, exercise: ei, nextExercise: 0, nextBlock: nb });
        }
      }
    }
  }
  steps.push({ kind: "done", seconds: 0, block: -1, round: 0, exercise: -1, nextExercise: -1, nextBlock: -1 });
  return steps;
}

/** Durée totale d'un déroulé, en secondes. */
export function timelineSeconds(steps: readonly Step[]): number {
  return steps.reduce((a, s) => a + s.seconds, 0);
}

// ─────────────────────────────────────────────────────────────────── prompt

export interface CircuitPromptInput {
  /** Le client s'entraîne sans salle : circuits obligatoires. */
  home: boolean;
  level: CircuitLevel;
  sessionMinutes: number;
  cycleCount: number;
  fatLoss: boolean;
}

const EXEMPLE_CIRCUIT =
  '{"cycleLabel":"Cycle 1 · Séance A · Full body A","title":"Full body · poussée + quadriceps","meta":"","restSec":0,"format":"circuit","warmup":[{"name":"Marche sur place et montées de genoux","detail":"3 min, souffle qui monte doucement"},{"name":"Mobilité hanches et épaules","detail":"cercles de bras 10 par sens, squats à vide 10, fentes arrière 6 par jambe"}],"blocks":[{"title":"Bloc 1 · jambes","rounds":3,"work":40,"rest":20,"roundRest":30,"restAfter":60,"sensation":2,"exercises":[{"name":"Squat au poids du corps","note":"talons au sol, descends sous la parallèle"},{"name":"Fentes arrière","note":"alterne les jambes, genou avant au-dessus de la cheville"},{"name":"Pont fessier","note":"serre les fessiers en haut, 1 s de pause"},{"name":"Montée sur banc","note":"pousse dans le talon, alterne"}]},{"title":"Bloc 2 · haut du corps","rounds":3,"work":40,"rest":20,"roundRest":30,"restAfter":60,"sensation":2,"exercises":[{"name":"Pompes inclinées","note":"mains sur un meuble stable, corps gainé"},{"name":"Rowing inversé sous une table","note":"tire la poitrine vers le bord, coudes le long du corps"},{"name":"Pike push-up","note":"hanches hautes, tête vers le sol"},{"name":"Superman","note":"lève bras et jambes 1 s, redescends lentement"}]},{"title":"Bloc 3 · tronc et cardio","rounds":2,"work":30,"rest":15,"roundRest":30,"restAfter":0,"sensation":3,"exercises":[{"name":"Mountain climber","note":"bassin stable, genoux vers la poitrine"},{"name":"Gainage planche","note":"coudes sous les épaules, fessiers serrés"},{"name":"Jumping jack","note":"souple sur les appuis"},{"name":"Dead bug","note":"bas du dos plaqué au sol"}]}],"exercises":[]}';

/**
 * Les règles des circuits, à joindre au brief. Sans salle, chaque séance est
 * un circuit ; en salle, le modèle garde séries et répétitions et peut y
 * ajouter un bloc final s'il le juge utile (densité, perte de gras, temps
 * court). Le texte donne la formule de durée : c'est la règle que le modèle
 * enfreint le plus, et un garde-fou côté serveur retire des tours si besoin.
 */
export function circuitPrompt(input: CircuitPromptInput): string {
  const budget = Math.max(15, input.sessionMinutes - 7);
  const cycles = Array.from({ length: Math.max(1, Math.min(3, input.cycleCount)) }, (_, i) => {
    const p = circuitParams(input.level, i);
    return `Cycle ${i + 1} : ${p.work} s d'effort, ${p.rest} s de repos entre exercices, ${p.rounds} tours par bloc, sensation visée ${i === 0 ? "2 (ça travaille)" : "3 (dur)"}.`;
  }).join("\n");

  const communs = `FORMAT D'UN BLOC ("blocks" d'une séance) : {"title":"Bloc 1 · jambes","rounds":3,"work":40,"rest":20,"roundRest":30,"restAfter":60,"sensation":2,"exercises":[{"name":"nom EXACT de la liste autorisée","note":"consigne d'exécution courte"}]}. "work" = secondes d'effort par exercice, "rest" = secondes de repos entre deux exercices (0 = enchaîné), "roundRest" = repos entre deux tours, "restAfter" = repos avant le bloc suivant (0 sur le dernier), "sensation" = intensité visée de 1 à 4 (1 facile, 2 ça travaille, 3 dur, 4 à fond, réservé à un finisher court). 3 à 6 exercices par bloc, qui alternent les groupes musculaires (jambes, poussée, tirage, tronc) pour que le souffle tienne. Dans un bloc, PAS de "sets", "reps", "load", "RPE" ni de cardio:true : les mouvements cardio (burpees, jumping jack, mountain climber, corde à sauter) sont des exercices chronométrés comme les autres.

DURÉE D'UN BLOC = tours × (exercices × (effort + repos)) + (tours − 1) × roundRest + restAfter. Additionne tes blocs : la somme DOIT tenir dans ${budget} min (la séance fait ${input.sessionMinutes} min, échauffement compris). Exemple qui tient : 3 blocs de 4 exercices en 3 tours à 40/20 avec 30 s entre tours et 60 s après = 3 × 12 min = 36 min. Vérifie le calcul avant de répondre.

SENSATIONS À LA PLACE DU RPE : dans une séance en circuit, il n'y a ni charge ni RPE. Les consignes du gabarit en RPE se traduisent ainsi : RPE 6 à 7 = sensation 2, RPE 7 à 8 = sensation 3, RPE 8 à 9 = sensation 3, avec au plus UN bloc court en sensation 4. Les notes parlent de rythme, d'amplitude et de variantes (plus simple : genoux au sol, incliné ; plus dur : pieds surélevés, sauté), jamais de kilos.`;

  if (input.home) {
    return `SÉANCES EN CIRCUIT (RÈGLE ABSOLUE, le client n'a pas de salle) : CHAQUE séance a "format":"circuit" et se compose de 2 à 4 "blocks" enchaînés par un chrono. Le tableau "exercises" de la séance reste VIDE ([]) : tout est dans les blocs. Les titres et les patrons du gabarit restent valables : répartis-les entre les blocs (un bloc jambes, un bloc haut du corps poussée et tirage, un bloc tronc et cardio, par exemple). L'échauffement reste obligatoire (3 à 5 items concrets). "restSec" vaut 0.

${communs}

PROGRESSION PAR CYCLE (niveau ${input.level === "debutant" ? "débutant" : input.level === "avance" ? "avancé" : "intermédiaire"}) :
${cycles}
Fais progresser d'un cycle à l'autre le rapport effort/repos et les tours, ET les variantes (pompes inclinées → pompes → pompes pieds surélevés).${input.fatLoss ? " OBJECTIF PERTE DE MASSE GRASSE : termine chaque séance par un bloc court et intense (Tabata 20 s effort / 10 s repos, 6 à 8 tours, sensation 4) qui tient dans le budget de temps." : ""}

EXEMPLE d'une séance en circuit (recopie cette forme) :
${EXEMPLE_CIRCUIT}`;
  }

  return `BLOCS EN CIRCUIT (OPTION, à ton choix) : le client s'entraîne en salle, ses séances gardent "format":"sets" avec séries, répétitions, repos et RPE. Tu PEUX ajouter à une séance un tableau "blocks" (UN bloc, 6 à 12 min) en finisher, pour la densité ou la dépense énergétique${input.fatLoss ? " (perte de masse grasse : c'est une bonne alternative au bloc cardio de fin de séance, choisis l'un OU l'autre, jamais les deux)" : ""}, ou quand la durée cible est courte. Le bloc s'exécute au chrono après les exercices, il compte dans la durée de la séance.

${communs}`;
}
