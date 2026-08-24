import "server-only";
import { z } from "zod";
import { anthropic, MODELS, textOf, parseJsonLoose } from "@/lib/anthropic";
import { COACH_CREDENTIAL } from "@/lib/config";

// Schéma du plan retourné par le modèle (structure de la maquette).
// Validé après génération : on n'écrit jamais en base un JSON hors-forme.
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
  session: z.object({
    cycleLabel: z.string(),
    title: z.string(),
    meta: z.string().optional().default(""),
    exercises: z
      .array(
        z.object({
          name: z.string(),
          sets: z.number(),
          reps: z.string(),
          load: z.string().optional().default(""),
          note: z.string().optional().default(""),
        }),
      )
      .min(1),
  }),
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

const SCHEMA_HINT =
  '{"summary":"2 phrases","cycles":[{"label":"","name":"","weeks":"SEMAINES 1 → 4","body":""}],"weekPlan":[{"day":"LUN","name":"","dur":"55 min","rest":false}],"session":{"cycleLabel":"Cycle 1 · Semaine 1 · Séance A","title":"","meta":"","exercises":[{"name":"","sets":4,"reps":"8–10","load":"60 kg","note":""}]},"nutrition":{"kcal":"2 580","protein":"148","carbs":"276","fat":"78","tags":[{"kind":"ALLERGIE","label":""}],"meals":[{"time":"7 h 30","name":"","kcal":"612","items":[{"food":"","qty":"80 g"}]}]},"warning":"1 phrase sur les contraintes prises en compte"}';

// Positionnement coach (pas « diététicien ») : accompagnement de forme, pas
// de visée thérapeutique. Le public à risque médical est déjà écarté en amont
// (lib/screening.ts).
const SYSTEM = `Tu es ${COACH_CREDENTIAL}, tu accompagnes des personnes en bonne santé vers un objectif de forme. Tu réponds UNIQUEMENT par un objet JSON valide en français, sans texte autour. Exactement 3 cycles, 7 jours dans weekPlan (repos les jours non travaillés indiqués), 5 à 7 exercices avec sets entier, 4 à 6 repas. Conseils d'entraînement et d'hygiène alimentaire uniquement : aucune allégation médicale ni thérapeutique.`;

export interface Brief {
  answers: Record<string, unknown>;
  trainDays: string[];
  equipment: string[];
}

/** Construit le texte de brief envoyé au modèle. */
export function buildBrief({ answers, trainDays, equipment }: Brief): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(answers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length) lines.push(`${key} : ${value.join(", ")}`);
    } else if (String(value).trim()) {
      lines.push(`${key} : ${String(value)}`);
    }
  }
  return [
    "Profil client FitMe90 — transformation sur 90 jours.",
    lines.length
      ? lines.join("\n")
      : "Profil par défaut : femme 34 ans, 68 kg, 170 cm, 3 séances/semaine.",
    `Jours d'entraînement : ${trainDays.length ? trainDays.join(", ") : "à répartir"}.`,
    `Matériel disponible : ${equipment.length ? equipment.join(", ") : "poids du corps uniquement"}. Aucun exercice hors de cette liste.`,
    "Respecte strictement les allergies et le cadre alimentaire déclarés.",
  ].join("\n\n");
}

export interface GenerateResult {
  plan: Plan;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/** Appelle le modèle (streaming) et renvoie un plan validé. */
export async function generateProgram(brief: Brief): Promise<GenerateResult> {
  const client = anthropic();
  // Streaming : la sortie est volumineuse (~8000 tokens), on évite le timeout.
  const stream = client.messages.stream({
    model: MODELS.generate,
    max_tokens: 12000,
    output_config: { effort: "high" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${buildBrief(brief)}\n\nRends ce JSON :\n${SCHEMA_HINT}`,
      },
    ],
  });
  const message = await stream.finalMessage();
  const plan = planSchema.parse(parseJsonLoose(textOf(message)));
  return {
    plan,
    model: MODELS.generate,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
  };
}
