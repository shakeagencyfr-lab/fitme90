import "server-only";
import { aiLanguageInstruction, type Locale } from "./i18n";
import { z } from "zod";
import { anthropic, MODELS, textOf, parseJsonLoose, effortConfig, apiCallOf, type ApiCall } from "@/lib/anthropic";
import { describeAnswers, DAYS } from "@/lib/questionnaire";
import { restPatternFromTrainDays, isRestDay } from "@/lib/schedule";
import { scheduledTrainingDays } from "@/lib/streak";
import { COACH_CREDENTIAL, CYCLES_PER_BLOCK } from "@/lib/config";
import { templatePrompt, cycleWeeksLabel, blocksForMonths } from "@/lib/templates";
import { effectiveMethodology } from "@/lib/methodology";
import { sanitizePlan, sanitizeSession } from "@/lib/program-sanitize";

// Schéma du plan retourné par le modèle (structure de la maquette).
// Validé après génération : on n'écrit jamais en base un JSON hors-forme.

export const exerciseShape = z.object({
  name: z.string(),
  sets: z.number(),
  reps: z.string(),
  load: z.string().optional().default(""),
  note: z.string().optional().default(""),
  /** Repos entre séries de CET exercice, en secondes. */
  rest: z.number().optional(),
  cardio: z.boolean().optional().default(false),
  duration: z.string().optional().default(""),
  zone: z.string().optional().default(""),
});

export type PlanExercise = z.infer<typeof exerciseShape>;

// Échauffement propre à la séance (mouvements de préparation avant le travail).
const warmupItemShape = z.object({
  name: z.string(),
  detail: z.string().optional().default(""),
});

const sessionShape = z.object({
  cycleLabel: z.string(),
  title: z.string(),
  meta: z.string().optional().default(""),
  /** Repos entre séries, en secondes (adapté à l'objectif). */
  restSec: z.number().optional().default(90),
  /** Échauffement spécifique à la séance (3 à 5 items). */
  warmup: z.array(warmupItemShape).optional().default([]),
  exercises: z.array(exerciseShape).min(1),
});

export type Session = z.infer<typeof sessionShape>;

const cycleShape = z.object({
  label: z.string(),
  name: z.string(),
  weeks: z.string(),
  body: z.string(),
  // Séances de CE cycle (bloc de 4 semaines) : une DISTINCTE par jour
  // d'entraînement. Les séances (exercices, reps, repos) ÉVOLUENT d'un cycle au
  // suivant (progression). Optionnel pour lire les anciens plans sans cycles.
  sessions: z.array(sessionShape).optional(),
});

export type Cycle = z.infer<typeof cycleShape>;

export const planSchema = z.object({
  summary: z.string(),
  cycles: z.array(cycleShape).min(1),
  weekPlan: z
    .array(
      z.object({
        day: z.string(),
        name: z.string(),
        dur: z.string().optional().default(""),
        rest: z.boolean(),
      }),
    )
    .min(1),
  // Compat historique : séance unique / séances non cyclées des anciens plans.
  session: sessionShape.optional(),
  sessions: z.array(sessionShape).min(1).optional(),
  nutrition: z.object({
    kcal: z.string(),
    protein: z.string(),
    carbs: z.string(),
    fat: z.string(),
    tags: z
      .array(z.object({ kind: z.string(), label: z.string() }))
      .optional()
      .default([]),
    meals: z
      .array(
        z.object({
          time: z.string(),
          name: z.string(),
          kcal: z.string(),
          items: z.array(z.object({ food: z.string(), qty: z.string() })),
        }),
      )
      .min(1),
  }),
  warning: z.string().optional().default(""),
});

export type Plan = z.infer<typeof planSchema>;

/** Nombre de jours par cycle (bloc de 4 semaines ≈ 30 jours de programme). */
export const CYCLE_DAYS = 30;

/**
 * Nombre de cycles à générer EN UNE FOIS pour une durée de programme donnée :
 * 30 j = 1 cycle, 60 j = 2, 90 j et plus = 3 (un bloc). Au-delà de 90 jours, on
 * ne génère pas tout d'avance : les blocs suivants sont construits plus tard, à
 * partir de ce que le client a réellement fait (lib/blocks.ts).
 */
export function cycleCountForDays(programDays: number): number {
  const n = Math.round(Math.max(1, programDays) / CYCLE_DAYS);
  return Math.min(CYCLES_PER_BLOCK, Math.max(1, n));
}

/** Nombre total de blocs de 3 mois que couvre une durée en jours. */
export function blockCountForDays(programDays: number): number {
  return blocksForMonths(Math.max(1, programDays) / CYCLE_DAYS);
}

/**
 * Force la numérotation globale des cycles d'un bloc fraîchement généré (label
 * « Cycle n » et semaines) : le modèle la reçoit dans le gabarit, mais on ne
 * laisse pas une étiquette fausse arriver jusqu'au client.
 */
export function relabelCycles(plan: Plan, firstCycleIndex: number): Plan {
  const cycles = (plan.cycles ?? []).map((c, i) => {
    const g = firstCycleIndex + i;
    const label = `Cycle ${g + 1}`;
    return {
      ...c,
      label,
      weeks: cycleWeeksLabel(g),
      sessions: c.sessions?.map((s) => ({
        ...s,
        cycleLabel: s.cycleLabel.replace(/^Cycle\s*\d+/i, label),
      })),
    };
  });
  return { ...plan, cycles };
}

/** Index de cycle (0, 1, 2) du jour de programme donné (1..90). */
export function cycleIndexForDay(day: number, cycleCount = 3): number {
  const idx = Math.floor((Math.max(1, day) - 1) / CYCLE_DAYS);
  return Math.min(Math.max(0, idx), cycleCount - 1);
}

/**
 * Séances « fallback » (plans sans cycles) : anciens plans à séances non
 * cyclées, sinon séance unique.
 */
function fallbackSessions(plan: Plan): Session[] {
  if (plan.sessions && plan.sessions.length) return plan.sessions;
  if (plan.session) return [plan.session];
  return [];
}

/**
 * Séances d'un cycle donné, avec repli sur les séances non cyclées. Le garde-fou
 * déterministe est appliqué À LA LECTURE aussi, pour corriger les anciens plans
 * déjà en base (cardio/muscu, durées) sans avoir à les régénérer.
 */
export function cycleSessions(plan: Plan, cycleIdx: number): Session[] {
  const c = plan.cycles?.[cycleIdx];
  const raw = c?.sessions && c.sessions.length ? c.sessions : fallbackSessions(plan);
  return raw.map(sanitizeSession);
}

/**
 * Séances distinctes représentatives du plan (1er cycle) : sert à l'affichage
 * générique (semaine type, noms). Les nouveaux plans les tiennent dans chaque
 * cycle ; les anciens dans `sessions`/`session`.
 */
export function planSessions(plan: Plan): Session[] {
  const first = plan.cycles?.[0]?.sessions;
  const raw = first && first.length ? first : fallbackSessions(plan);
  return raw.map(sanitizeSession);
}

/**
 * Séance à afficher pour un jour de programme : le bon CYCLE (change toutes les
 * 4 semaines) et le bon créneau (rang du jour d'entraînement DANS le cycle, qui
 * fait tourner les séances A, B, C…). Retombe sur les séances non cyclées pour
 * les anciens plans.
 */
export function sessionForDay(
  plan: Plan,
  day: number,
  pattern: boolean[],
  startWd: number,
): Session | undefined {
  const cycleCount = plan.cycles?.length || 3;
  const cIdx = cycleIndexForDay(day, cycleCount);
  const pool = cycleSessions(plan, cIdx);
  if (!pool.length) return undefined;
  const cycleStartDay = cIdx * CYCLE_DAYS + 1;
  // Rang (1-based) du jour d'entraînement à l'intérieur de son cycle.
  const ordinalInCycle =
    scheduledTrainingDays(pattern, startWd, day).length -
    scheduledTrainingDays(pattern, startWd, cycleStartDay - 1).length;
  const slot = (((ordinalInCycle - 1) % pool.length) + pool.length) % pool.length;
  return pool[slot] ?? pool[0];
}

/**
 * Titres de la SEMAINE TYPE, un par jour LUN→DIM (`null` = repos).
 *
 * Pour chaque jour de la semaine, on prend sa PROCHAINE occurrence à partir
 * d'aujourd'hui (aujourd'hui compris) : le bloc décrit la routine du client, pas
 * la semaine calendaire en cours. Sans cela, les jours de la première semaine
 * antérieurs au démarrage n'avaient aucune séance et s'affichaient « Séance ».
 *
 * Passe par `sessionForDay`, comme la carte « aujourd'hui », la page séance et
 * l'agenda. La semaine type se déduisait avant du seul `weekPlan`, qui suppose
 * une semaine démarrant sur le premier jour d'entraînement : dès qu'un client
 * démarre un autre jour, l'affichage était décalé d'un cran et contredisait la
 * séance réellement lancée.
 */
export function weekSessionTitles(
  plan: Plan,
  currentDay: number,
  pattern: boolean[],
  startWd: number,
  programDays: number,
): (string | null)[] {
  const from = Math.max(1, currentDay);
  const todayWd = (((startWd + from - 1) % 7) + 7) % 7;

  return Array.from({ length: 7 }, (_, i) => {
    // Prochaine occurrence de ce jour de semaine, aujourd'hui compris.
    const day = from + ((i - todayWd + 7) % 7);
    if (day > programDays) return null;
    if (isRestDay(day, pattern, startWd)) return null;
    return sessionForDay(plan, day, pattern, startWd)?.title ?? null;
  });
}

/**
 * Normalise un plan fraîchement généré : chaque cycle reçoit ses séances (repli
 * sur les séances non cyclées si un cycle n'en a pas), et `session`/`sessions`
 * restent renseignés (compat historique). Applique aussi le garde-fou
 * déterministe (cardio/muscu, durées). Lève si aucune séance n'existe.
 */
export function normalizePlan(plan: Plan): Plan {
  const clean = sanitizePlan(plan);
  const flat = fallbackSessions(clean);
  const cycles = (clean.cycles ?? []).map((c) => ({
    ...c,
    sessions: c.sessions && c.sessions.length ? c.sessions : flat,
  }));
  const anySessions = cycles.find((c) => c.sessions && c.sessions.length)?.sessions ?? flat;
  if (!anySessions.length) throw new Error("Plan sans séance.");
  return {
    ...clean,
    cycles,
    sessions: flat.length ? flat : anySessions,
    session: (flat.length ? flat : anySessions)[0],
  };
}

/**
 * Échauffement d'une séance. Si le plan n'en fournit pas (anciens programmes),
 * on renvoie un échauffement générique sûr et universel.
 */
export function warmupSteps(session: Session | undefined): { name: string; detail: string }[] {
  if (session?.warmup && session.warmup.length) {
    return session.warmup.map((w) => ({ name: w.name, detail: w.detail || "" }));
  }
  return [
    { name: "Cardio léger", detail: "5 minutes de vélo, rameur ou marche rapide, allure qui monte doucement." },
    { name: "Mobilité articulaire", detail: "Hanches, épaules, chevilles et colonne : 6 à 8 mouvements lents et amples." },
    { name: "Activation", detail: "1 à 2 séries très légères du premier exercice pour préparer le mouvement." },
  ];
}

/**
 * Recale un plan sur de nouveaux jours d'entraînement, SANS appel IA (instantané
 * et fiable, pas de dépassement de temps Vercel). Reconstruit la semaine type
 * (weekPlan) sur les nouveaux jours (en reprenant les titres des séances
 * distinctes) et met à jour la fréquence citée dans le résumé. Les séances
 * elles-mêmes ne changent pas de contenu.
 */
export function patchPlanForTrainDays(plan: Plan, trainDays: string[]): Plan {
  const rest = restPatternFromTrainDays(trainDays); // 7 booléens LUN→DIM
  const count = trainDays.length;
  // Noms de séance : priorité aux titres des séances distinctes (A, B, C…),
  // sinon on reprend les noms de la semaine type existante.
  const sessions = planSessions(plan);
  const sessionNames = sessions.map((s) => s.title).filter(Boolean);
  const weekNames = plan.weekPlan.filter((d) => !d.rest).map((d) => d.name).filter(Boolean);
  const names = sessionNames.length ? sessionNames : weekNames;
  const dur = plan.weekPlan.find((d) => !d.rest)?.dur || "";
  let ti = 0;
  const weekPlan = DAYS.map((day, i) => {
    if (rest[i]) return { day, name: "Repos", dur: "", rest: true };
    const name = names.length ? names[ti % names.length] : "Séance";
    ti++;
    return { day, name, dur, rest: false };
  });
  const summary = plan.summary.replace(
    /\b\d+\s*(?:s[ée]ances?|entra[iî]nements?|fois)\b/i,
    `${count} séances`,
  );
  return { ...plan, summary, weekPlan };
}

// Chaque cycle porte SES PROPRES séances dans "cycles[i].sessions" (une par jour
// d'entraînement). Les séances CHANGENT et progressent d'un cycle au suivant :
// l'exemple montre 2 cycles avec 2 séances chacun, reps qui baissent et repos qui
// montent (accumulation → intensification), pour que le modèle recopie ce schéma.
const SCHEMA_HINT =
  '{"summary":"2 phrases","cycles":[{"label":"Cycle 1","name":"Accumulation","weeks":"SEMAINES 1 → 4","body":"1 phrase","sessions":[{"cycleLabel":"Cycle 1 · Séance A · haut du corps","title":"Haut du corps","meta":"","restSec":90,"warmup":[{"name":"Cardio léger","detail":"5 min rameur"},{"name":"Mobilité épaules","detail":"6 mouvements"}],"exercises":[{"name":"Développé couché haltères","sets":4,"reps":"10-12","load":"","rest":75,"note":"","cardio":false},{"name":"Rowing haltère","sets":4,"reps":"10-12","load":"","rest":75,"note":"","cardio":false}]},{"cycleLabel":"Cycle 1 · Séance B · bas du corps","title":"Bas du corps","meta":"","restSec":90,"warmup":[{"name":"Vélo","detail":"5 min"},{"name":"Mobilité hanches","detail":"6 mouvements"}],"exercises":[{"name":"Squat","sets":4,"reps":"10-12","load":"","rest":90,"note":"","cardio":false},{"name":"Fentes marchées","sets":3,"reps":"12","load":"","rest":75,"note":"","cardio":false}]}]},{"label":"Cycle 2","name":"Intensification","weeks":"SEMAINES 5 → 8","body":"1 phrase","sessions":[{"cycleLabel":"Cycle 2 · Séance A · haut du corps","title":"Haut du corps","meta":"","restSec":120,"warmup":[{"name":"Cardio léger","detail":"5 min rameur"},{"name":"Mobilité épaules","detail":"6 mouvements"}],"exercises":[{"name":"Développé incliné haltères","sets":5,"reps":"6-8","load":"","rest":120,"note":"","cardio":false},{"name":"Tractions","sets":4,"reps":"6-8","load":"","rest":120,"note":"","cardio":false}]},{"cycleLabel":"Cycle 2 · Séance B · bas du corps","title":"Bas du corps","meta":"","restSec":150,"warmup":[{"name":"Vélo","detail":"5 min"},{"name":"Mobilité hanches","detail":"6 mouvements"}],"exercises":[{"name":"Squat","sets":5,"reps":"5","load":"","rest":150,"note":"","cardio":false},{"name":"Soulevé de terre roumain","sets":4,"reps":"6-8","load":"","rest":150,"note":"","cardio":false}]}]}],"weekPlan":[{"day":"LUN","name":"Haut du corps","dur":"55 min","rest":false},{"day":"MER","name":"Bas du corps","dur":"55 min","rest":false},{"day":"VEN","name":"Repos","dur":"","rest":true}],"nutrition":{"kcal":"2 580","protein":"148","carbs":"276","fat":"78","tags":[{"kind":"ALLERGIE","label":""}],"meals":[{"time":"7 h 30","name":"","kcal":"612","items":[{"food":"","qty":"80 g"}]}]},"warning":"1 phrase sur les contraintes prises en compte"}';

// Positionnement coach (pas « diététicien ») : accompagnement de forme, pas
// de visée thérapeutique. Le public à risque médical est déjà écarté en amont
// (lib/screening.ts). Le nombre de cycles suit la durée de l'offre achetée.
function systemPrompt(cycleCount: number, template: string): string {
  return `Tu es ${COACH_CREDENTIAL}, tu accompagnes des personnes en bonne santé vers un objectif de forme. Tu réponds UNIQUEMENT par un objet JSON valide en français, sans texte autour. Exactement ${cycleCount} cycle(s), 7 jours dans weekPlan (repos les jours non travaillés indiqués), 4 à 6 repas.

STRUCTURE EN CYCLES (RÈGLE LA PLUS IMPORTANTE) : ce bloc compte ${cycleCount} CYCLE(S) de 4 semaines, numérotés et libellés comme l'indique le gabarit ci-dessous (champs "label", "weeks" et "name" de chaque cycle). CHAQUE cycle (objet de "cycles") porte SON PROPRE tableau "sessions" contenant EXACTEMENT une séance DISTINCTE par jour d'entraînement de la semaine, avec les titres du gabarit. NE mets PAS de "sessions" au niveau racine : elles vont DANS chaque cycle. Ne renvoie JAMAIS une seule séance quand le client s'entraîne plusieurs jours.

${template}

Les séances CHANGENT et PROGRESSENT d'un cycle au suivant selon les paramètres du gabarit (reps, repos, RPE) : fais évoluer les exercices (variantes) ET les paramètres. Le client fera lui-même évoluer ses charges en les notant, ne fige donc pas de charge (laisse "load":"").`;
}

const SYSTEM_RULES = `

Dans chaque cycle, les séances suivent EXACTEMENT la répartition du gabarit (titres, lettres, patrons de mouvement). Chaque séance a pour "title" le titre du gabarit, un "cycleLabel" du type "Cycle 2 · Séance A · Full body A", et 5 à 7 exercices avec sets entier. Le "name" de chaque jour travaillé dans weekPlan reprend le titre de la séance correspondante du PREMIER cycle de ce bloc, en tournant A, B, C sur la semaine.

COHÉRENCE SÉANCE ↔ EXERCICES (RÈGLE STRICTE) : les exercices d'une séance DOIVENT correspondre à ses patrons du gabarit, principaux ET secondaire. Une séance « Push » ne contient QUE des mouvements de poussée (pectoraux, épaules, triceps) ; une séance « Pull » QUE du tirage (dos, arrière d'épaule, biceps) ; une séance « Jambes » QUE du bas du corps. Une séance « dominante poussée » contient sa poussée lourde ET son unique tirage léger de rappel (et inversement) : ce rappel est obligatoire, pas une erreur. Une séance « Full body » couvre haut et bas. N'introduis jamais un exercice hors des patrons de la séance : vérifie chaque exercice avant de l'ajouter.

DURÉE (RÈGLE STRICTE) : chaque séance doit TENIR dans la durée choisie par le client (voir le brief, ex 45 min), échauffement compris. Dimensionne le nombre d'exercices, de séries et le cardio en conséquence : une séance de 45 min = échauffement (5 à 8 min) + 4 à 6 exercices de musculation. NE DÉPASSE JAMAIS cette durée (une séance de 45 min qui cumulerait toute la muscu PUIS 40 min de cardio PUIS 15 min de rameur est une erreur grave).

CARDIO (DÉFINITION FERMÉE) : SEULS ces mouvements peuvent être cardio:true : rameur/ergomètre, vélo (ou assault/air bike), tapis/course/jogging, elliptique, corde à sauter, stepper/montées de marche, marche rapide, HIIT au poids du corps, natation. TOUT LE RESTE est de la musculation (cardio:false), notamment tout ce qui utilise haltères, barre, poulie, kettlebell ou une machine de force, et tout ce qui s'appelle rowing/tirage/développé/curl/squat/soulevé/marche du fermier. Un « rowing » à la poulie ou à l'haltère est du DOS (musculation), PAS le rameur. Au plus UN bloc cardio par séance (8 à 20 min), et seulement si la durée de la séance le permet ; la QUANTITÉ de cardio dépend de l'objectif (voir le brief) : peu ou pas de cardio en prise de muscle/force, un bloc cardio (finisher) à chaque séance en perte de masse grasse. Pour un cardio : cardio:true, "duration" TOUJOURS en minutes (ex "15 min", entre 8 et 20, jamais 40), "zone" cardiaque (Z1 récupération, Z2 endurance, Z3 tempo, Z4 seuil, Z5 VO2 max), sets:0, reps:"".

PORTÉS / MARCHES LESTÉES : la marche du fermier (farmer walk), le porté valise, le yoke, le traîneau, etc. ne sont JAMAIS du cardio : ce sont de la MUSCULATION/gainage (cardio:false), en séries COURTES (3 à 4 séries de 30 à 40 mètres OU 30 à 45 secondes), avec sets et reps ; il est absurde et impossible de faire 40 minutes de marche du fermier. Ne mets JAMAIS un porté en cardio, ni avec une durée de plusieurs minutes.

AVANT DE RÉPONDRE, RELIS CHAQUE EXERCICE cardio:true : s'il utilise haltères/barre/poulie/kettlebell/machine de force, ou s'il s'appelle rowing/tirage/développé/curl/marche du fermier/porté, alors il est FAUX : repasse-le en cardio:false avec sets et reps. Et vérifie qu'aucun cardio ne dépasse 15 min.

Pour la musculation : cardio:false avec sets et reps normaux. REPOS : renseigne "restSec" (repos par défaut de la séance, en secondes) ET, pour CHAQUE exercice de musculation, un "rest" en secondes adapté au cycle. RÈGLE DE STYLE : n'utilise JAMAIS de tiret cadratin (—) ni de tiret demi-cadratin (–) dans les textes ; écris avec une ponctuation naturelle (virgules, deux-points, points, parenthèses).`;

export interface Brief {
  answers: Record<string, unknown>;
  trainDays: string[];
  equipment: string[];
  /**
   * Note de progression (abonnements) : bilan du cycle précédent pour adapter le
   * nouveau cycle (assiduité, évolution du poids). Injectée dans le brief.
   */
  priorCycleNote?: string;
  /**
   * Durée totale du programme en jours (offre achetée). Détermine le nombre de
   * cycles du bloc (30 j = 1 cycle, 60 j = 2, 90 j et plus = 3) et le nombre de
   * blocs du produit (90 j = 1, 360 j = 4). Défaut : 90 jours.
   */
  programDays?: number;
  /**
   * Bloc à générer (0 = premier). Les blocs suivants d'un 12 mois sont générés
   * plus tard, avec `priorCycleNote` construite sur les vraies données du bloc
   * précédent, et leurs cycles numérotés à la suite (Cycle 4, 5, 6…).
   */
  blockIndex?: number;
  /** Langue du client : le programme (titres, notes, repas) est écrit dedans. */
  locale?: Locale;
}

/** Adaptations en cours (blessures/contraintes ajoutées après coup). */
export function readAdaptations(answers: Record<string, unknown>): string[] {
  const a = answers?.adaptations;
  return Array.isArray(a) ? a.map((x) => String(x)).filter(Boolean) : [];
}

/** Réponse qui veut dire « rien à signaler ». */
const RIEN = /^(aucun|aucune|non|rien|ras|n\/?a|-|nc|non concern[ée]?)$/i;

/** Valeurs cochées d'une question à choix multiples, hors « Aucune ». */
function coches(raw: unknown): string[] {
  return (Array.isArray(raw) ? raw : [])
    .map((x) => String(x).trim())
    .filter((x) => x && !RIEN.test(x));
}

/**
 * Contraintes physiques à respecter, rassemblées depuis TOUT ce que le client a
 * déclaré.
 *
 * Elles ne venaient que de `answers.adaptations`, écrite au seul endroit où un
 * client signale une gêne au Coach IA en cours de programme. Autrement dit le
 * bloc impératif du brief ne se déclenchait JAMAIS pour un premier programme :
 * une épaule cochée au questionnaire n'arrivait au modèle que noyée parmi vingt
 * lignes de profil, sans consigne. Le commentaire de `lib/screening.ts` dit
 * pourtant l'intention : les gênes articulaires « relèvent de l'adaptation
 * d'exercices, dans le périmètre du coach ». Il manquait le fil entre les deux.
 *
 * Fonction PURE, pour que ce fil soit testable : c'est une donnée de santé, et
 * une régression silencieuse ici produit un programme dangereux qui a l'air
 * normal.
 */
export function adaptationsFromAnswers(answers: Record<string, unknown>): string[] {
  const out: string[] = [];

  // Signalées en cours de route au Coach IA : déjà rédigées, on les garde
  // telles quelles et en premier, ce sont les plus récentes.
  out.push(...readAdaptations(answers));

  for (const p of coches(answers?.patho1)) out.push(`pathologie articulaire déclarée : ${p.toLowerCase()}`);
  for (const m of coches(answers?.mobility)) out.push(`limitation de mobilité : ${m.toLowerCase()}`);

  const passees = String(answers?.past_injuries ?? "").trim();
  if (passees && !RIEN.test(passees)) out.push(`blessure passée : ${passees.slice(0, 160)}`);

  // Doublons possibles : « Épaule » en pathologie et « Épaules » en mobilité
  // désignent la même zone, et répétées elles diluent la consigne. On compare
  // donc la ZONE, pas la phrase entière, et on garde la première mention : les
  // entrées sont rangées de la plus grave à la moins grave (gêne signalée en
  // cours de route, puis pathologie, puis mobilité), donc la première est celle
  // qui appelle l'adaptation la plus prudente.
  const zone = (a: string) => {
    const i = a.lastIndexOf(" : ");
    return (i === -1 ? a : a.slice(i + 3)).toLowerCase().replace(/s\b/g, "").trim();
  };
  const vues = new Set<string>();
  return out
    .filter((a) => {
      const k = zone(a);
      if (vues.has(k)) return false;
      vues.add(k);
      return true;
    })
    .slice(0, 8);
}

/**
 * L'objectif est-il orienté perte de masse grasse / conditionnement ? On regarde
 * l'objectif principal ET secondaire (perte de gras, recomposition, endurance).
 * Dans ce cas, on charge davantage le cardio dans le programme.
 */
export function isFatLossGoal(answers: Record<string, unknown>): boolean {
  const g = `${String(answers?.goal ?? "")} ${String(answers?.goal2 ?? "")}`.toLowerCase();
  return /perte|masse grasse|gras|minceur|s[èe]ch|recompos|endurance|cardio/.test(g);
}

/** Construit le texte de brief envoyé au modèle (réponses en clair). */
export function buildBrief({ answers, trainDays, equipment, priorCycleNote, programDays }: Brief): string {
  const lines = describeAnswers(answers);
  const adaptations = adaptationsFromAnswers(answers);
  const cycleCount = cycleCountForDays(programDays ?? 90);
  const parts = [
    "Profil client My Fitness App, transformation sur toute la durée du programme.",
    lines.length
      ? lines.join("\n")
      : "Profil par défaut : femme 34 ans, 68 kg, 170 cm, 3 séances/semaine.",
    `Jours d'entraînement : ${trainDays.length ? trainDays.join(", ") : "à répartir"}.`,
    `Nombre de séances DISTINCTES par cycle : ${trainDays.length || 3} (une par jour d'entraînement, aux titres du gabarit). Produis donc ${cycleCount} cycle(s), chacun avec ${trainDays.length || 3} séances distinctes${cycleCount > 1 ? " qui évoluent d'un cycle au suivant" : ""}.`,
    `Durée cible par séance : ${(answers?.dur as string) || "45 min"}, échauffement compris. Chaque séance DOIT tenir dans cette durée : ne dépasse pas, et ajoute au plus un bloc cardio court (10 à 20 min) uniquement s'il reste du temps.`,
    `Matériel disponible : ${equipment.length ? equipment.join(", ") : "poids du corps uniquement"}. Aucun exercice hors de cette liste.`,
  ];
  if (isFatLossGoal(answers)) {
    parts.push(
      "OBJECTIF PERTE DE MASSE GRASSE : le programme doit maximiser la dépense énergétique tout en préservant le muscle. CARDIO : termine CHAQUE séance par un bloc cardio (finisher) de 12 à 20 min (cardio:true), en variant les formats d'un cycle à l'autre (Cycle 1 surtout Z2 continu 15 à 20 min ; Cycle 2 intervalles/HIIT 12 à 15 min ; Cycle 3 HIIT court et intense 10 à 15 min). Utilise UNIQUEMENT du vrai cardio (rameur, vélo, tapis/course, elliptique, corde à sauter, HIIT au poids du corps, montées de marche). DENSITÉ : sur la musculation, raccourcis les repos (45 à 75 s), privilégie les supersets et circuits, et des séries un peu plus longues (12 à 20 reps sur l'isolation), pour garder la fréquence cardiaque haute. Tout cela DOIT tenir dans la durée cible de la séance : augmente la densité (moins de repos, enchaînements), pas la durée totale. Ne fige pas les charges.",
    );
  }
  if (adaptations.length) {
    parts.push(
      `CONTRAINTES PHYSIQUES DÉCLARÉES, À RESPECTER IMPÉRATIVEMENT : ${adaptations.join(" ; ")}.\n` +
        "Pour CHACUNE, les trois points suivants sont obligatoires :\n" +
        "1. Le champ \"warning\" la NOMME et dit ce que tu as changé pour elle. N'écris JAMAIS qu'aucune contrainte n'a été déclarée alors qu'il y en a une ci-dessus : ce serait faux, et le client le lirait.\n" +
        "2. Au moins UN exercice du programme en tient compte, par une variante plus sûre sur les mêmes groupes musculaires, une amplitude réduite ou une charge plus prudente. Si un mouvement est contre-indiqué, remplace-le, ne le laisse pas en l'état.\n" +
        "3. La \"note\" de cet exercice DIT la raison, en langage de coach, pour que le client comprenne pourquoi ce choix a été fait pour lui.\n" +
        "Une contrainte simplement recopiée dans le résumé sans effet sur le programme est une faute.",
    );
  }
  if (priorCycleNote) {
    parts.push(
      `PROGRESSION (nouveau bloc, le client a déjà un vécu avec ce programme) : ${priorCycleNote} Fais ÉVOLUER le programme par rapport au bloc précédent : varie les exercices, ajuste volume, charge visée et intensité selon l'assiduité et les résultats, et garde la personne engagée. Ne recopie pas à l'identique le bloc précédent.`,
    );
  }
  parts.push(
    "Personnalise fortement le programme et les consignes à partir de ces réponses (préférences d'exercices, contraintes de temps, mode de vie, motivation). Respecte strictement les allergies et le cadre alimentaire déclarés.",
  );
  return parts.join("\n\n");
}

export interface GenerateResult {
  plan: Plan;
  /** Modèle qui a produit le plan retenu, tel que l'API l'a servi. */
  model: string;
  /**
   * TOUS les appels passés à l'API, y compris celui dont le plan a été jeté.
   *
   * C'était un total unique auparavant, et ce total mentait deux fois : la
   * relance dont le résultat n'était pas retenu disparaissait du journal alors
   * qu'Anthropic l'avait facturée (une génération entière, environ 0,29 $), et
   * les jetons de cache n'étaient pas comptés du tout.
   */
  calls: ApiCall[];
}

/**
 * Appelle le modèle (streaming) et renvoie un plan validé.
 * `effort` : "high" pour la 1re génération ; réduit ("low"/"medium") pour les
 * régénérations rapides (changement de jours, adaptation) afin de tenir dans le
 * budget temps d'une requête coach (Vercel Hobby ≈ 60 s).
 */
export async function generateProgram(
  brief: Brief,
  effort: "low" | "medium" | "high" = "high",
  apiKey?: string,
  tenantId: string | null = null,
  /**
   * Tableau que l'appelant fournit et que l'on remplit AU FIL des appels.
   *
   * Il appartient à l'appelant précisément pour qu'une génération qui échoue
   * laisse quand même sa trace : si cette fonction lève (JSON invalide, schéma
   * refusé), le contenu de `journal` est déjà chez lui, et il journalise ce
   * qu'Anthropic a facturé avant l'échec.
   */
  journal: ApiCall[] = [],
): Promise<GenerateResult> {
  const client = anthropic(apiKey);
  // Méthodologie propre au tenant (base evidence-based, ou méthode du coach).
  const methodology = await effectiveMethodology(tenantId);
  // Nombre de séances distinctes attendu (une par jour d'entraînement).
  const wantSessions = Math.max(1, brief.trainDays.length || 3);
  // Nombre de cycles attendu dans CE bloc (30 j = 1 cycle, 90 j et plus = 3).
  const programDays = brief.programDays ?? 90;
  const wantCycles = cycleCountForDays(programDays);
  const blockIndex = Math.max(0, brief.blockIndex ?? 0);
  const totalBlocks = blockCountForDays(programDays);
  // Gabarit : structure imposée (répartition, patrons, cycles numérotés à la
  // suite du bloc précédent, reps/repos/RPE). Le modèle remplit, ne conçoit pas.
  const template = templatePrompt({
    sessionsPerWeek: wantSessions,
    blockIndex,
    totalBlocks,
    cycleCount: wantCycles,
  });
  const firstCycleIndex = blockIndex * CYCLES_PER_BLOCK;

  const runOnce = async (extra: string) => {
    const stream = client.messages.stream({
      model: MODELS.generate,
      // Sortie volumineuse : jusqu'à 6 cycles × séances distinctes + nutrition.
      max_tokens: 32000,
      ...effortConfig(MODELS.generate, effort),
      system: `${systemPrompt(wantCycles, template)}${SYSTEM_RULES}\n\n${methodology}\n\n${aiLanguageInstruction(brief.locale ?? "fr")}`,
      messages: [
        {
          role: "user",
          content: `${buildBrief(brief)}${extra}\n\nRends ce JSON :\n${SCHEMA_HINT}`,
        },
      ],
    });
    const message = await stream.finalMessage();
    // Journalisé AVANT la validation : le plan peut être refusé, la facture,
    // elle, est déjà partie. En streaming l'identifiant de requête vit sur le
    // flux et non sur le message final, d'où le second argument.
    const call = apiCallOf(message, stream.request_id);
    journal.push(call);
    const plan = relabelCycles(
      normalizePlan(planSchema.parse(parseJsonLoose(textOf(message)))),
      firstCycleIndex,
    );
    return { plan, call };
  };

  // Le bon nombre de cycles, chacun avec le bon nombre de séances distinctes.
  const cyclesOk = (p: Plan) =>
    (p.cycles?.length ?? 0) >= wantCycles &&
    (p.cycles ?? []).every((c) => (c.sessions?.length ?? 0) >= wantSessions);

  let { plan, call: retenu } = await runOnce("");
  // Garde-fou périodisation : si un cycle manque de séances distinctes (bug
  // « même séance partout »), on relance une fois avec une consigne explicite
  // (1re génération uniquement, où le budget temps le permet).
  if (effort === "high" && (wantSessions >= 2 || wantCycles >= 2) && !cyclesOk(plan)) {
    try {
      const retry = await runOnce(
        `\n\nATTENTION : le plan doit contenir EXACTEMENT ${wantCycles} cycle(s), et CHAQUE cycle doit contenir EXACTEMENT ${wantSessions} séances DISTINCTES dans "cycles[i].sessions" (une par jour d'entraînement), et les séances doivent CHANGER d'un cycle au suivant. Ne renvoie pas une seule séance ni des cycles sans séances.`,
      );
      if (cyclesOk(retry.plan)) {
        plan = retry.plan;
        retenu = retry.call;
      }
    } catch {
      // On garde le 1er plan si la relance échoue. L'appel raté, lui, est déjà
      // dans `journal` : il a été facturé, il doit se voir.
    }
  }

  return { plan, model: retenu.model, calls: journal };
}
