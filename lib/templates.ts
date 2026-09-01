// Gabarits de programme : la STRUCTURE est fixée ici, l'IA ne remplit que le
// CONTENU (exercices adaptés au matériel, aux blessures, aux goûts ; charges ;
// nutrition). Deux produits × quatre fréquences = huit squelettes relus par un
// coach une bonne fois pour toutes, plutôt qu'une structure libre réinventée à
// chaque génération avec ses erreurs.
//
// Logique PURE (aucun accès réseau) : testable, et importable côté client pour
// afficher « Bloc 2 · Construction » sans refaire le calcul ailleurs.

import { CYCLES_PER_BLOCK, clampSessionsPerWeek, type SessionsPerWeek } from "./config";

/** Un créneau de séance de la semaine (A, B, C…) et ce qu'il travaille. */
export interface SessionSlot {
  code: string;
  title: string;
  /** Groupes musculaires visés, pour le libellé et la cohérence exercices/titre. */
  focus: string;
  /** Patrons de mouvement à couvrir OBLIGATOIREMENT dans la séance. */
  patterns: string[];
}

export interface WeekSplit {
  name: string;
  sessions: SessionSlot[];
}

/**
 * Répartition hebdomadaire par fréquence. Chaque muscle est travaillé au moins
 * deux fois par semaine, poussée et tirage restent équilibrés, le bas du corps
 * n'est jamais sacrifié. Les titres sont ceux que le client verra.
 */
export const SPLITS: Record<SessionsPerWeek, WeekSplit> = {
  2: {
    name: "Full body A / B",
    sessions: [
      {
        code: "A",
        title: "Full body A",
        focus: "corps entier, dominante squat et poussée",
        patterns: ["squat ou fente", "poussée horizontale", "tirage horizontal", "charnière de hanche légère", "gainage"],
      },
      {
        code: "B",
        title: "Full body B",
        focus: "corps entier, dominante charnière et tirage",
        patterns: ["charnière de hanche", "tirage vertical", "poussée verticale", "squat ou fente légère", "gainage"],
      },
    ],
  },
  3: {
    name: "Full body A / B / C",
    sessions: [
      {
        code: "A",
        title: "Full body A · poussée",
        focus: "corps entier, accent pectoraux, épaules, quadriceps",
        patterns: ["squat", "poussée horizontale", "poussée verticale", "tirage horizontal", "gainage"],
      },
      {
        code: "B",
        title: "Full body B · tirage",
        focus: "corps entier, accent dos, ischio-jambiers, fessiers",
        patterns: ["charnière de hanche", "tirage vertical", "tirage horizontal", "fente", "gainage"],
      },
      {
        code: "C",
        title: "Full body C · densité",
        focus: "corps entier, enchaînements et points faibles",
        patterns: ["squat ou fente", "poussée", "tirage", "isolation bras ou épaules", "gainage ou finisher"],
      },
    ],
  },
  4: {
    name: "Haut / Bas × 2",
    sessions: [
      {
        code: "A",
        title: "Haut du corps A",
        focus: "pectoraux, dos, épaules, dominante force",
        patterns: ["poussée horizontale lourde", "tirage horizontal lourd", "poussée verticale", "tirage vertical", "bras"],
      },
      {
        code: "B",
        title: "Bas du corps A",
        focus: "quadriceps, fessiers, dominante squat",
        patterns: ["squat lourd", "fente ou presse", "charnière de hanche légère", "mollets", "gainage"],
      },
      {
        code: "C",
        title: "Haut du corps B",
        focus: "pectoraux, dos, épaules, dominante volume",
        patterns: ["poussée inclinée", "tirage vertical", "poussée verticale", "tirage horizontal", "isolation épaules et bras"],
      },
      {
        code: "D",
        title: "Bas du corps B",
        focus: "ischio-jambiers, fessiers, dominante charnière",
        patterns: ["soulevé de terre ou variante", "hip thrust ou pont", "squat léger ou fente", "ischio isolation", "gainage"],
      },
    ],
  },
  5: {
    name: "Haut / Bas / Poussée / Tirage / Jambes",
    sessions: [
      {
        code: "A",
        title: "Haut du corps",
        focus: "pectoraux, dos, épaules, force",
        patterns: ["poussée horizontale lourde", "tirage horizontal lourd", "poussée verticale", "tirage vertical"],
      },
      {
        code: "B",
        title: "Bas du corps",
        focus: "quadriceps, ischio-jambiers, fessiers, force",
        patterns: ["squat lourd", "charnière de hanche lourde", "fente", "mollets", "gainage"],
      },
      {
        code: "C",
        title: "Poussée",
        focus: "pectoraux, épaules, triceps, volume",
        patterns: ["poussée inclinée", "poussée verticale", "écarté ou isolation pectoraux", "élévations latérales", "triceps"],
      },
      {
        code: "D",
        title: "Tirage",
        focus: "dos, arrière d'épaules, biceps, volume",
        patterns: ["tirage vertical", "tirage horizontal", "arrière d'épaules", "biceps", "gainage"],
      },
      {
        code: "E",
        title: "Jambes",
        focus: "quadriceps, ischio-jambiers, fessiers, volume",
        patterns: ["presse ou squat léger", "hip thrust", "fente ou bulgare", "ischio isolation", "mollets"],
      },
    ],
  },
};

/** Paramètres d'un cycle de 4 semaines : ce que le modèle doit respecter. */
export interface CycleParams {
  name: string;
  intent: string;
  reps: string;
  rest: string;
  rpe: string;
  /** Dernière semaine allégée (volume réduit de 30 à 50 %). */
  deloadLastWeek: boolean;
}

export interface BlockDef {
  name: string;
  /** Ce que ce bloc cherche, dit au modèle ET au client. */
  orientation: string;
  cycles: CycleParams[];
}

/** Produit 3 mois : un seul bloc, un sprint avec une ligne d'arrivée. */
const TRANSFORMATION: BlockDef = {
  name: "Transformation",
  orientation:
    "Un objectif, une date : en 12 semaines le client doit voir la différence. On installe vite la technique, on monte franchement, on finit sur un pic puis une décharge pour que le résultat apparaisse.",
  cycles: [
    {
      name: "Adaptation",
      intent: "technique propre, amplitude complète, habitude installée",
      reps: "10 à 15",
      rest: "60 à 90 s",
      rpe: "6 à 7",
      deloadLastWeek: false,
    },
    {
      name: "Intensification",
      intent: "montée du volume et des charges, densité accrue, premiers changements visibles",
      reps: "8 à 12",
      rest: "90 à 120 s",
      rpe: "7 à 8",
      deloadLastWeek: false,
    },
    {
      name: "Spécialisation",
      intent: "pic vers l'objectif, focus sur les points faibles, dernière semaine allégée pour récupérer et laisser apparaître les progrès",
      reps: "6 à 10 sur les composés, 10 à 15 en isolation",
      rest: "120 à 180 s sur les composés, 60 à 90 s en isolation",
      rpe: "8 à 9 maîtrisé",
      deloadLastWeek: true,
    },
  ],
};

/** Offre héritée d'un mois : un cycle autonome, périodisé à l'intérieur. */
const SINGLE_CYCLE: BlockDef = {
  name: "Bloc unique",
  orientation: "Un bloc complet de 4 semaines : technique et régularité, montée progressive, dernière semaine allégée.",
  cycles: [
    {
      name: "Bloc complet",
      intent: "semaines 1 à 3 en montée de volume, semaine 4 en décharge",
      reps: "8 à 15",
      rest: "60 à 120 s",
      rpe: "6 à 8",
      deloadLastWeek: true,
    },
  ],
};

/**
 * Produit 12 mois : quatre blocs de 3 mois, chacun avec SON orientation. Ce
 * n'est pas « plus long », c'est un programme qui change de nature en cours
 * d'année, et chaque bloc est reconstruit à partir de ce que le client a fait
 * dans le précédent.
 */
export const YEAR_BLOCKS: BlockDef[] = [
  {
    name: "Fondations",
    orientation:
      "Mois 1 à 3 : installer la technique, l'habitude et une base de volume. Le client doit finir ce bloc en maîtrisant les mouvements de base avec des charges qu'il connaît.",
    cycles: [
      { name: "Adaptation", intent: "technique, amplitude, régularité", reps: "12 à 15", rest: "60 à 90 s", rpe: "6 à 7", deloadLastWeek: false },
      { name: "Consolidation", intent: "mêmes mouvements, charges qui montent, premières séries proches de l'effort", reps: "10 à 12", rest: "90 s", rpe: "7", deloadLastWeek: false },
      { name: "Progression", intent: "montée du volume, premiers records personnels, décharge finale", reps: "8 à 12", rest: "90 à 120 s", rpe: "7 à 8", deloadLastWeek: true },
    ],
  },
  {
    name: "Construction",
    orientation:
      "Mois 4 à 6 : construire. Volume et densité pour la prise de muscle, densité et cardio pour la perte de gras. Nouvelles variantes d'exercices pour relancer l'adaptation.",
    cycles: [
      { name: "Accumulation", intent: "volume élevé, nouvelles variantes, proximité de l'échec contrôlée", reps: "10 à 15", rest: "60 à 90 s", rpe: "7 à 8", deloadLastWeek: false },
      { name: "Intensification", intent: "charges qui montent dans la fourchette, séries ajoutées sur les points faibles", reps: "8 à 12", rest: "90 à 120 s", rpe: "8", deloadLastWeek: false },
      { name: "Réalisation", intent: "pic de volume utile puis décharge", reps: "6 à 10", rest: "120 s", rpe: "8 à 9", deloadLastWeek: true },
    ],
  },
  {
    name: "Intensité",
    orientation:
      "Mois 7 à 9 : la force. Les composés passent en séries courtes et lourdes avec de longs repos, les accessoires gardent du volume. Le client doit finir ce bloc avec des charges nettement plus hautes qu'au mois 1.",
    cycles: [
      { name: "Accumulation", intent: "préparer la force : technique sous charge, volume modéré", reps: "8 à 10 sur les composés", rest: "90 à 120 s", rpe: "7 à 8", deloadLastWeek: false },
      { name: "Intensification", intent: "séries lourdes sur squat, charnière, développé, tirage", reps: "5 à 8 sur les composés, 8 à 12 en isolation", rest: "120 à 180 s sur les composés", rpe: "8 à 9", deloadLastWeek: false },
      { name: "Réalisation", intent: "records sur les composés, puis décharge", reps: "3 à 6 sur les composés, 8 à 12 en isolation", rest: "150 à 180 s sur les composés", rpe: "9 maîtrisé", deloadLastWeek: true },
    ],
  },
  {
    name: "Réalisation",
    orientation:
      "Mois 10 à 12 : aller chercher le résultat de l'année. Spécialisation sur l'objectif déclaré, pic, puis un cycle de consolidation avec re-test des charges et bilan, pour que le client termine plus fort qu'il n'a jamais été, sans être cramé.",
    cycles: [
      { name: "Spécialisation", intent: "tout est orienté vers l'objectif principal, points faibles en priorité", reps: "selon l'objectif : 6 à 10 muscle, 4 à 8 force, 10 à 15 densité", rest: "adapté à l'objectif", rpe: "8 à 9", deloadLastWeek: false },
      { name: "Pic", intent: "le meilleur niveau de l'année, intensité maximale maîtrisée", reps: "selon l'objectif, fourchette basse", rest: "longs sur les composés", rpe: "9", deloadLastWeek: true },
      { name: "Consolidation", intent: "volume réduit de 30 %, re-test des charges de référence, ancrage des acquis et préparation de la suite", reps: "8 à 12", rest: "90 à 120 s", rpe: "7", deloadLastWeek: false },
    ],
  },
];

/**
 * Bloc à générer pour une position donnée. Un programme d'un seul bloc suit
 * « Transformation » ; un programme de plusieurs blocs suit l'échelle de
 * l'année. Au-delà du 4e bloc (abonné qui continue), on repart au bloc
 * « Construction » : les fondations sont acquises, on ne les refait pas.
 */
export function blockDef(blockIndex: number, totalBlocks: number, cycleCount = CYCLES_PER_BLOCK): BlockDef {
  const idx = Math.max(0, Math.trunc(blockIndex || 0));
  if (totalBlocks <= 1) {
    if (cycleCount <= 1) return SINGLE_CYCLE;
    return { ...TRANSFORMATION, cycles: TRANSFORMATION.cycles.slice(0, Math.max(1, cycleCount)) };
  }
  if (idx < YEAR_BLOCKS.length) return YEAR_BLOCKS[idx];
  // Année 2 et suivantes : Construction → Intensité → Réalisation, en boucle.
  const loop = YEAR_BLOCKS.slice(1);
  return loop[(idx - YEAR_BLOCKS.length) % loop.length];
}

/** Libellé court pour l'interface : « Bloc 2 · Construction ». */
export function blockLabel(blockIndex: number, totalBlocks: number): string {
  const def = blockDef(blockIndex, totalBlocks);
  return totalBlocks <= 1 ? def.name : `Bloc ${blockIndex + 1} · ${def.name}`;
}

/** « SEMAINES 13 → 16 » pour le cycle global d'index 3 (0-based). */
export function cycleWeeksLabel(globalCycleIndex: number): string {
  const a = globalCycleIndex * 4 + 1;
  return `SEMAINES ${a} → ${a + 3}`;
}

export interface TemplateInput {
  /** Jours d'entraînement par semaine (ramené sur 2 à 5). */
  sessionsPerWeek: number;
  /** Bloc à générer (0 = premier). */
  blockIndex: number;
  /** Blocs que compte le produit (1 pour 3 mois, 4 pour 12 mois). */
  totalBlocks: number;
  /** Cycles dans ce bloc (3, sauf offres héritées d'1 ou 2 mois). */
  cycleCount?: number;
}

/**
 * Texte du gabarit injecté dans le prompt système. C'est la partie « structure
 * imposée » : répartition, patrons par séance, numérotation des cycles, et
 * paramètres reps/repos/RPE de chaque cycle. Le modèle choisit les exercices
 * dans ce cadre, jamais le cadre.
 */
export function templatePrompt(input: TemplateInput): string {
  const freq = clampSessionsPerWeek(input.sessionsPerWeek);
  const split = SPLITS[freq];
  const cycleCount = Math.max(1, Math.min(CYCLES_PER_BLOCK, Math.trunc(input.cycleCount ?? CYCLES_PER_BLOCK)));
  const block = blockDef(input.blockIndex, input.totalBlocks, cycleCount);
  const firstCycle = Math.max(0, input.blockIndex) * CYCLES_PER_BLOCK;

  const sessions = split.sessions
    .map(
      (s) =>
        `  ${s.code}. "${s.title}" : ${s.focus}. Patrons obligatoires : ${s.patterns.join(", ")}.`,
    )
    .join("\n");

  const cycles = block.cycles
    .slice(0, cycleCount)
    .map((c, i) => {
      const n = firstCycle + i + 1;
      return `  Cycle ${n} (label "Cycle ${n}", weeks "${cycleWeeksLabel(firstCycle + i)}", name "${c.name}") : ${c.intent}. Reps ${c.reps}, repos ${c.rest}, RPE ${c.rpe}.${c.deloadLastWeek ? " Dernière semaine en DÉCHARGE : volume réduit de 30 à 50 %, mêmes exercices, charges légèrement baissées." : ""}`;
    })
    .join("\n");

  const blockLine =
    input.totalBlocks > 1
      ? `BLOC ${input.blockIndex + 1} SUR ${input.totalBlocks} : « ${block.name} ». ${block.orientation}`
      : `PROGRAMME « ${block.name} ». ${block.orientation}`;

  return `GABARIT IMPOSÉ (la structure ne se discute pas, tu choisis les exercices DANS ce cadre) :

${blockLine}

RÉPARTITION HEBDOMADAIRE « ${split.name} », ${freq} séances distinctes par semaine, dans CHAQUE cycle, avec EXACTEMENT ces titres et cette lettre :
${sessions}
Chaque séance couvre TOUS ses patrons obligatoires (un exercice au moins par patron), avec le matériel du client. Les exercices peuvent changer d'un cycle à l'autre (variantes), les titres et les patrons, non.

CYCLES DE CE BLOC (${cycleCount}), numérotés et libellés EXACTEMENT ainsi :
${cycles}`;
}

/** Nombre de blocs d'un produit selon sa durée en mois (1 par tranche de 3). */
export function blocksForMonths(months: number): number {
  if (!Number.isFinite(months) || months <= 0) return 1;
  return Math.max(1, Math.round(months / 3));
}
