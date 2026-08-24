import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCall, DAY_MS } from "@/lib/ratelimit";
import { anthropic, MODELS, textOf, parseJsonLoose } from "@/lib/anthropic";
import { LIMIT_RECIPES_PER_DAY, COACH_CREDENTIAL } from "@/lib/config";

export const runtime = "nodejs";

const recipesSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: z.string(),
        kcal: z.string(),
        protein: z.string(),
        time: z.string(),
        ingredients: z.array(z.object({ food: z.string(), qty: z.string() })),
        steps: z.string(),
      }),
    )
    .default([]),
});

export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.coachEnabled) {
    return NextResponse.json(
      { error: "Le générateur de recettes est disponible pendant tes 90 jours." },
      { status: 403 },
    );
  }

  const limit = await checkLimit(ctx.userId, "recipes", LIMIT_RECIPES_PER_DAY, DAY_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Limite de ${limit.max} générations de recettes par jour atteinte.` },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown> }>();
  const { data: program } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: { nutrition?: Record<string, string> } }>();

  const a = quiz?.answers ?? {};
  const arr = (k: string) => (Array.isArray(a[k]) ? (a[k] as string[]).join(", ") : "");
  const n = program?.plan?.nutrition ?? {};

  const system = `Tu es ${COACH_CREDENTIAL}. Réponds UNIQUEMENT par un JSON valide en français : {"recipes":[{"name":"","kcal":"620","protein":"42 g","time":"20 min","ingredients":[{"food":"","qty":""}],"steps":"3 phrases max"}]} — exactement 3 recettes. Conseils culinaires uniquement, aucune allégation médicale.`;
  const user =
    `Objectifs du jour : ${n.kcal || "2 580"} kcal, ${n.protein || "148"} g de protéines, ${n.carbs || "276"} g de glucides, ${n.fat || "78"} g de lipides.\n` +
    `Allergies à exclure strictement : ${arr("allerg") || "aucune"}.\n` +
    `Régime : ${(a.diet as string) || "omnivore"}. Cadre religieux : ${(a.religion as string) || "aucun"}. Aliments refusés : ${(a.dislikes as string) || "aucun"}.\n` +
    `Propose 3 recettes simples qui s'intègrent dans ces objectifs, avec quantités précises.`;

  try {
    const message = await anthropic().messages.create({
      model: MODELS.recipes,
      max_tokens: 2048,
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content: user }],
    });
    const parsed = recipesSchema.parse(parseJsonLoose(textOf(message)));
    if (!parsed.recipes.length) {
      return NextResponse.json({ error: "Aucune recette renvoyée." }, { status: 502 });
    }
    await recordCall(ctx.userId, "recipes", {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    });
    return NextResponse.json({ recipes: parsed.recipes });
  } catch {
    return NextResponse.json({ error: "Génération des recettes indisponible." }, { status: 502 });
  }
}
