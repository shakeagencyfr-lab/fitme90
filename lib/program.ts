import "server-only";
import { z } from "zod";
import { anthropic, MODELS, textOf, parseJsonLoose } from "@/lib/anthropic";
import { describeAnswers, DAYS } from "@/lib/questionnaire";
import { restPatternFromTrainDays } from "@/lib/schedule";
import { COACH_CREDENTIAL } from "@/lib/config";
import { effectiveMethodology } from "@/lib/methodology";

// Schéma du plan retourné par le modèle (structure de la maquette).
// Validé après génération : on n'écrit jamais en base un JSON hors-forme.

const exerciseShape = z.object({
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

export const planSchema = z.object({
  summary: z.string(),
  cycles: z
    .array(
      z.object({
        label: z.string(),
        name: z.string(),
        weeks: z.string(),
        body: z.string(),
      }),
    )
    .min(1),
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
  // Séance « modèle » historique (plans d'origine). Conservée pour compatibilité.
  session: sessionShape.optional(),
  // Séances DISTINCTES, une par jour d'entraînement de la semaine (A, B, C…).
  // Les nouveaux programmes remplissent ce tableau ; les anciens n'ont que
  // `session` (voir normalizePlan / planSessions).
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

/**
 * Séances distinctes du plan. Les nouveaux programmes exposent `sessions`
 * (une par jour d'entraînement de la semaine : A, B, C…) ; les anciens n'ont
 * que `session` (séance unique) : on retombe alors dessus.
 */
export function planSessions(plan: Plan): Session[] {
  if (plan.sessions && plan.sessions.length) return plan.sessions;
  if (plan.session) return [plan.session];
  return [];
}

/**
 * Normalise un plan fraîchement généré : garantit que `sessions` (tableau) et
 * `session` (1re séance, compat historique) sont tous deux renseignés et
 * cohérents. Lève si le modèle n'a produit aucune séance.
 */
export function normalizePlan(plan: Plan): Plan {
  const sessions = plan.sessions?.length
    ? plan.sessions
    : plan.session
      ? [plan.session]
      : [];
  if (!sessions.length) throw new Error("Plan sans séance.");
  return { ...plan, sessions, session: sessions[0] };
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

const SCHEMA_HINT =
  '{"summary":"2 phrases","cycles":[{"label":"","name":"","weeks":"SEMAINES 1 → 4","body":""}],"weekPlan":[{"day":"LUN","name":"Séance A haut du corps","dur":"55 min","rest":false}],"sessions":[{"cycleLabel":"Séance A · haut du corps","title":"Haut du corps","meta":"","restSec":90,"warmup":[{"name":"Cardio léger","detail":"5 min rameur, allure progressive"},{"name":"Mobilité épaules/dos","detail":"6 mouvements lents"},{"name":"Activation","detail":"1 série légère du 1er exercice"}],"exercises":[{"name":"","sets":4,"reps":"8-10","load":"60 kg","rest":75,"note":"","cardio":false},{"name":"Rameur","cardio":true,"duration":"12 min","zone":"Z2","sets":0,"reps":"","load":"","note":"allure conversationnelle"}]}],"nutrition":{"kcal":"2 580","protein":"148","carbs":"276","fat":"78","tags":[{"kind":"ALLERGIE","label":""}],"meals":[{"time":"7 h 30","name":"","kcal":"612","items":[{"food":"","qty":"80 g"}]}]},"warning":"1 phrase sur les contraintes prises en compte"}';

// Positionnement coach (pas « diététicien ») : accompagnement de forme, pas
// de visée thérapeutique. Le public à risque médical est déjà écarté en amont
// (lib/screening.ts).
const SYSTEM = `Tu es ${COACH_CREDENTIAL}, tu accompagnes des personnes en bonne santé vers un objectif de forme. Tu réponds UNIQUEMENT par un objet JSON valide en français, sans texte autour. Exactement 3 cycles, 7 jours dans weekPlan (repos les jours non travaillés indiqués), 4 à 6 repas. SÉANCES : le champ "sessions" est un tableau qui contient EXACTEMENT UNE séance DISTINCTE par jour d'entraînement de la semaine (ex : 3 jours = 3 séances). Chaque séance vise des groupes musculaires DIFFÉRENTS et complémentaires sur la semaine (par ex. 3 jours : A haut du corps, B bas du corps, C full body ; 4 jours : haut/bas ou push/pull/legs/full ; ne répète jamais la même séance). Chaque séance a un "title" court et parlant (ex "Haut du corps", "Bas du corps & gainage"), un "cycleLabel" du type "Séance A · haut du corps", et 5 à 7 exercices avec sets entier. Le "name" de chaque jour travaillé dans weekPlan doit reprendre le titre de la séance correspondante, en tournant A, B, C sur la semaine. ÉCHAUFFEMENT : chaque séance a un "warmup" (tableau de 3 à 5 items {name, detail}) adapté aux muscles travaillés ce jour-là (montée cardio progressive, mobilité ciblée, séries d'activation légères). CARDIO : pour tout exercice cardio (rameur, vélo, course, elliptique, tapis, HIIT, marche, corde à sauter…), NE mets PAS de séries/répétitions/charge — mets cardio:true, une durée dans "duration" (ex "20 min") et la zone cardiaque cible dans "zone" (Z1 récupération, Z2 endurance, Z3 tempo, Z4 seuil/intervalles, Z5 VO2 max ; ex "Z2"), et sets:0, reps:"". Pour la musculation : cardio:false avec sets et reps normaux. REPOS : renseigne "restSec" (repos par défaut de la séance, en secondes) ET, pour CHAQUE exercice de musculation, un "rest" en secondes adapté (environ 60 à 90 s en hypertrophie, 120 à 180 s sur les gros mouvements de force type squat/soulevé de terre/développé, 45 à 60 s en perte de masse / circuit). RÈGLE DE STYLE : n'utilise JAMAIS de tiret cadratin (—) ni de tiret demi-cadratin (–) dans les textes ; écris avec une ponctuation naturelle (virgules, deux-points, points, parenthèses).`;

export interface Brief {
  answers: Record<string, unknown>;
  trainDays: string[];
  equipment: string[];
}

/** Adaptations en cours (blessures/contraintes ajoutées après coup). */
export function readAdaptations(answers: Record<string, unknown>): string[] {
  const a = answers?.adaptations;
  return Array.isArray(a) ? a.map((x) => String(x)).filter(Boolean) : [];
}

/** Construit le texte de brief envoyé au modèle (réponses en clair). */
export function buildBrief({ answers, trainDays, equipment }: Brief): string {
  const lines = describeAnswers(answers);
  const adaptations = readAdaptations(answers);
  const parts = [
    "Profil client FitMe90 — transformation sur 90 jours.",
    lines.length
      ? lines.join("\n")
      : "Profil par défaut : femme 34 ans, 68 kg, 170 cm, 3 séances/semaine.",
    `Jours d'entraînement : ${trainDays.length ? trainDays.join(", ") : "à répartir"}.`,
    `Nombre de séances DISTINCTES à produire dans "sessions" : ${trainDays.length || 3} (une par jour d'entraînement, chacune ciblant des groupes musculaires différents et complémentaires).`,
    `Matériel disponible : ${equipment.length ? equipment.join(", ") : "poids du corps uniquement"}. Aucun exercice hors de cette liste.`,
  ];
  if (adaptations.length) {
    parts.push(
      `ADAPTATIONS À RESPECTER IMPÉRATIVEMENT (blessures / contraintes) : ${adaptations.join(" ; ")}. Exclus ou remplace tout exercice contre-indiqué par une alternative sûre sur les mêmes groupes musculaires, et adapte les consignes.`,
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
): Promise<GenerateResult> {
  const client = anthropic();
  // Méthodologie (base evidence-based, ou personnalisée par le coach en admin).
  const methodology = await effectiveMethodology();
  // Streaming : la sortie est volumineuse (~8000 tokens), on évite le timeout.
  const stream = client.messages.stream({
    model: MODELS.generate,
    max_tokens: 12000,
    output_config: { effort },
    system: `${SYSTEM}\n\n${methodology}`,
    messages: [
      {
        role: "user",
        content: `${buildBrief(brief)}\n\nRends ce JSON :\n${SCHEMA_HINT}`,
      },
    ],
  });
  const message = await stream.finalMessage();
  const plan = normalizePlan(planSchema.parse(parseJsonLoose(textOf(message))));
  return {
    plan,
    model: MODELS.generate,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  };
}
