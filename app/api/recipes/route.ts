import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { recordCall } from "@/lib/ratelimit";
import { checkRecipeAiBudget } from "@/lib/coach-ai-budget";
import { checkAiAllowance, chargeAiUsage } from "@/lib/credits";
import { MODELS, textOf, parseJsonLoose, effortConfig } from "@/lib/anthropic";
import { anthropicForUser } from "@/lib/tenant";
import { COACH_CREDENTIAL } from "@/lib/config";

export const runtime = "nodejs";

const recipesSchema = z.object({
  recipes: z
    .array(
      z.object({
        name: z.string(),
        level: z.string().optional().default(""),
        time: z.string(),
        servings: z.string().optional().default(""),
        kcal: z.string(),
        protein: z.string(),
        carbs: z.string().optional().default(""),
        fat: z.string().optional().default(""),
        ingredients: z.array(z.object({ food: z.string(), qty: z.string() })),
        // Étapes détaillées ; on accepte aussi une chaîne pour la rétrocompat.
        steps: z
          .union([z.array(z.string()), z.string()])
          .transform((v) => (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean))
          .default([]),
        tip: z.string().optional().default(""),
      }),
    )
    .default([]),
});

export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.coachEnabled) {
    return NextResponse.json(
      { error: "Le générateur de recettes est disponible pendant ton programme." },
      { status: 403 },
    );
  }

  // Porte d'accès : portefeuille de crédits (Modèle crédits) ou plafond journalier.
  const coachTenant = ctx.profile?.tenant_id ?? null;
  const allowance = await checkAiAllowance(coachTenant, "action");
  if (!allowance.ok) return NextResponse.json({ error: allowance.error }, { status: 402 });
  {
    const budget = await checkRecipeAiBudget(ctx.userId, coachTenant);
    if (!budget.ok) {
      const n = budget.limit;
      return NextResponse.json(
        {
          error:
            n === 1
              ? "Tu as déjà régénéré tes recettes aujourd'hui. Réessaie demain."
              : `Limite de ${n} régénérations de recettes par jour atteinte. Réessaie demain.`,
        },
        { status: 429 },
      );
    }
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

  const cook = (a.cook_time as string) || "";
  const level =
    /non/i.test(cook)
      ? "Assemblage rapide, sans cuisson ou minimale, étapes très simples et courtes."
      : /temps en temps/i.test(cook)
        ? "Recettes simples, cuisson basique, temps de préparation modéré."
        : /oui/i.test(cook)
          ? "Recettes plus élaborées et gourmandes, techniques un peu plus poussées, davantage d'étapes."
          : "Recettes simples et efficaces.";

  const system = `Tu es ${COACH_CREDENTIAL}. Réponds UNIQUEMENT par un objet JSON valide en français, sans texte autour. Exactement 3 recettes, chacune DÉTAILLÉE et facile à suivre. Schéma EXACT :
{"recipes":[{"name":"","level":"Simple","time":"20 min","servings":"1 portion","kcal":"620","protein":"42 g","carbs":"55 g","fat":"18 g","ingredients":[{"food":"","qty":"120 g"}],"steps":["Étape 1 claire et précise","Étape 2","Étape 3","Étape 4"],"tip":"une astuce courte"}]}
Consignes : 4 à 7 étapes numérotées, chaque étape est une instruction concrète (température, temps de cuisson, ustensile, indice de cuisson). Donne des quantités précises pour chaque ingrédient, les macros complètes (kcal, protéines, glucides, lipides) et le nombre de portions. Ajoute une astuce ("tip") utile (variante, conservation, gain de temps). Conseils culinaires uniquement, aucune allégation médicale. N'utilise jamais de tiret cadratin (—) ni demi-cadratin (–).`;
  const user =
    `Objectifs du jour : ${n.kcal || "2 580"} kcal, ${n.protein || "148"} g de protéines, ${n.carbs || "276"} g de glucides, ${n.fat || "78"} g de lipides. Vise des recettes cohérentes avec ces apports (une portion = un repas).\n` +
    `Allergies à exclure strictement : ${arr("allerg") || "aucune"}.\n` +
    `Régime : ${(a.diet as string) || "omnivore"}. Cadre religieux : ${(a.religion as string) || "aucun"}. Aliments refusés : ${(a.dislikes as string) || "aucun"}.\n` +
    `Aliments appréciés : ${(a.loved_foods as string) || "non précisé"}. Budget : ${(a.budget as string) || "moyen"}.\n` +
    `NIVEAU des recettes (selon le temps de cuisine du client) : ${level} Indique ce niveau dans le champ "level" (ex "Assemblage rapide", "Simple", "Élaborée").\n` +
    `Propose 3 recettes distinctes, adaptées à ces goûts, à ce budget et à ce niveau, avec des étapes détaillées.`;

  try {
    const message = await (await anthropicForUser(ctx.userId)).messages.create({
      model: MODELS.recipes,
      max_tokens: 3800,
      ...effortConfig(MODELS.recipes, "low"),
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
    await chargeAiUsage(coachTenant, "action", "recipe", ctx.userId);
    return NextResponse.json({ recipes: parsed.recipes });
  } catch {
    return NextResponse.json({ error: "Génération des recettes indisponible." }, { status: 502 });
  }
}
