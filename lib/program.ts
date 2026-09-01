import "server-only";
import { z } from "zod";
import { anthropic, MODELS, textOf, parseJsonLoose, effortConfig } from "@/lib/anthropic";
import { describeAnswers, DAYS } from "@/lib/questionnaire";
import { restPatternFromTrainDays } from "@/lib/schedule";
import { scheduledTrainingDays } from "@/lib/streak";
import { COACH_CREDENTIAL } from "@/lib/config";
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
 * Nombre de cycles à générer pour une durée de programme donnée (en jours).
 * 30 j = 1 cycle, 90 j = 3 cycles, 180 j = 6 cycles. Plafonné à 6 cycles pour
 * tenir dans le budget de sortie du modèle : au-delà (offres 12 mois), le
 * dernier cycle sert de base et la progression continue par les charges notées.
 */
export function cycleCountForDays(programDays: number): number {
  const n = Math.round(Math.max(1, programDays) / CYCLE_DAYS);
  return Math.min(6, Math.max(1, n));
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
function systemPrompt(cycleCount: number): string {
  const weeks = cycleCount * 4;
  const progression =
    cycleCount === 1
      ? `Le cycle unique est périodisé à l'intérieur de ses 4 semaines : montée en volume des semaines 1 à 3, semaine 4 en décharge (volume réduit). Reps plutôt 8 à 15, repos 60 à 120 s.`
      : `Les séances CHANGENT et PROGRESSENT d'un cycle au suivant (c'est un programme périodisé) : Cycle 1 accumulation (volume, reps plutôt 10 à 15, repos 60 à 90 s) ; les cycles intermédiaires alternent intensification (charge, reps plutôt 6 à 10, repos 90 à 150 s) et accumulation plus exigeante (nouveaux mouvements, volume) ; le DERNIER cycle est la réalisation/pic (force, reps plutôt 4 à 8, repos 120 à 180 s, avec une décharge la dernière semaine). D'un cycle à l'autre, fais évoluer les exercices (variantes ou nouveaux mouvements) ET les paramètres reps/repos/séries.`;
  return `Tu es ${COACH_CREDENTIAL}, tu accompagnes des personnes en bonne santé vers un objectif de forme. Tu réponds UNIQUEMENT par un objet JSON valide en français, sans texte autour. Exactement ${cycleCount} cycle(s), 7 jours dans weekPlan (repos les jours non travaillés indiqués), 4 à 6 repas.

STRUCTURE EN CYCLES (RÈGLE LA PLUS IMPORTANTE) : le programme dure ${weeks} semaines découpées en ${cycleCount} CYCLE(S) de 4 semaines (champ "weeks" de chaque cycle : Cycle 1 "SEMAINES 1 → 4", Cycle 2 "SEMAINES 5 → 8", et ainsi de suite). CHAQUE cycle (objet de "cycles") porte SON PROPRE tableau "sessions" contenant EXACTEMENT une séance DISTINCTE par jour d'entraînement de la semaine (2 jours = 2 séances par cycle, 3 jours = 3 séances, 4 jours = 4 séances, etc.). NE mets PAS de "sessions" au niveau racine : elles vont DANS chaque cycle. Ne renvoie JAMAIS une seule séance quand le client s'entraîne plusieurs jours.

${progression} Le client fera lui-même évoluer ses charges en les notant, ne fige donc pas de charge (laisse "load":"").`;
}

const SYSTEM_RULES = `

Dans chaque cycle, chaque séance vise des groupes musculaires DIFFÉRENTS et complémentaires sur la semaine (ex. 3 jours : A haut du corps, B bas du corps, C full body ; 4 jours : haut/bas ou push/pull/legs/full). Chaque séance a un "title" court et parlant, un "cycleLabel" du type "Cycle 2 · Séance A · haut du corps", et 5 à 7 exercices avec sets entier. Le "name" de chaque jour travaillé dans weekPlan reprend le titre de la séance correspondante du CYCLE 1, en tournant A, B, C sur la semaine.

COHÉRENCE SÉANCE ↔ EXERCICES (RÈGLE STRICTE) : les exercices d'une séance DOIVENT correspondre à son intitulé. Une séance « poussée / push » ne contient QUE des mouvements de poussée (pectoraux, épaules, triceps : développés, dips, élévations, extensions triceps) ; JAMAIS de tirage (rowing, tractions, tirage, curl biceps). Une séance « tirage / pull » ne contient QUE du tirage (dos, biceps). Une séance « bas du corps / jambes » ne contient QUE du bas du corps. N'introduis jamais un exercice qui contredit le titre de la séance : vérifie chaque exercice avant de l'ajouter.

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
   * cycles générés (30 j = 1 cycle, 90 j = 3, 180 j = 6). Défaut : 90 jours.
   */
  programDays?: number;
}

/** Adaptations en cours (blessures/contraintes ajoutées après coup). */
export function readAdaptations(answers: Record<string, unknown>): string[] {
  const a = answers?.adaptations;
  return Array.isArray(a) ? a.map((x) => String(x)).filter(Boolean) : [];
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
  const adaptations = readAdaptations(answers);
  const cycleCount = cycleCountForDays(programDays ?? 90);
  const parts = [
    "Profil client My Fitness App — transformation sur toute la durée du programme.",
    lines.length
      ? lines.join("\n")
      : "Profil par défaut : femme 34 ans, 68 kg, 170 cm, 3 séances/semaine.",
    `Jours d'entraînement : ${trainDays.length ? trainDays.join(", ") : "à répartir"}.`,
    `Nombre de séances DISTINCTES par cycle : ${trainDays.length || 3} (une par jour d'entraînement). Produis donc ${cycleCount} cycle(s), chacun avec ${trainDays.length || 3} séances distinctes${cycleCount > 1 ? " qui évoluent d'un cycle au suivant" : ""}.`,
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
      `ADAPTATIONS À RESPECTER IMPÉRATIVEMENT (blessures / contraintes) : ${adaptations.join(" ; ")}. Exclus ou remplace tout exercice contre-indiqué par une alternative sûre sur les mêmes groupes musculaires, et adapte les consignes.`,
    );
  }
  if (priorCycleNote) {
    parts.push(
      `PROGRESSION (nouveau cycle d'abonnement) : ${priorCycleNote} Fais ÉVOLUER le programme par rapport au cycle précédent : varie les exercices, ajuste volume, charge visée et intensité selon l'assiduité et les résultats, et garde la personne engagée. Ne recopie pas à l'identique le cycle précédent.`,
    );
  }
  parts.push(
    "Personnalise fortement le programme et les consignes à partir de ces réponses (préférences d'exercices, contraintes de temps, mode de vie, motivation). Respecte strictement les allergies et le cadre alimentaire déclarés.",
  );
  return parts.join("\n\n");
}

export interface GenerateResult {
  plan: Plan;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
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
): Promise<GenerateResult> {
  const client = anthropic(apiKey);
  // Méthodologie propre au tenant (base evidence-based, ou méthode du coach).
  const methodology = await effectiveMethodology(tenantId);
  // Nombre de séances distinctes attendu (une par jour d'entraînement).
  const wantSessions = Math.max(1, brief.trainDays.length || 3);
  // Nombre de cycles attendu (durée de l'offre : 30 j = 1 cycle, 90 j = 3…).
  const wantCycles = cycleCountForDays(brief.programDays ?? 90);

  const runOnce = async (extra: string) => {
    const stream = client.messages.stream({
      model: MODELS.generate,
      // Sortie volumineuse : jusqu'à 6 cycles × séances distinctes + nutrition.
      max_tokens: 32000,
      ...effortConfig(MODELS.generate, effort),
      system: `${systemPrompt(wantCycles)}${SYSTEM_RULES}\n\n${methodology}`,
      messages: [
        {
          role: "user",
          content: `${buildBrief(brief)}${extra}\n\nRends ce JSON :\n${SCHEMA_HINT}`,
        },
      ],
    });
    const message = await stream.finalMessage();
    const plan = normalizePlan(planSchema.parse(parseJsonLoose(textOf(message))));
    return {
      plan,
      inTok: message.usage.input_tokens,
      outTok: message.usage.output_tokens,
    };
  };

  // Le bon nombre de cycles, chacun avec le bon nombre de séances distinctes.
  const cyclesOk = (p: Plan) =>
    (p.cycles?.length ?? 0) >= wantCycles &&
    (p.cycles ?? []).every((c) => (c.sessions?.length ?? 0) >= wantSessions);

  let { plan, inTok, outTok } = await runOnce("");
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
        inTok += retry.inTok;
        outTok += retry.outTok;
      }
    } catch {
      /* on garde le 1er plan si la relance échoue */
    }
  }

  return {
    plan,
    model: MODELS.generate,
    usage: { input_tokens: inTok, output_tokens: outTok },
  };
}
