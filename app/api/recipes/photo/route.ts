import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCalls, DAY_MS } from "@/lib/ratelimit";
import { MODELS, textOf, parseJsonLoose, effortConfig, apiCallOf, type ApiCall } from "@/lib/anthropic";
import { anthropicForUser } from "@/lib/tenant";
import { saveClientRecipes } from "@/lib/recipes-store";
import { checkAiAllowance, chargeAiUsage } from "@/lib/credits";
import { checkClientAiBudget } from "@/lib/coach-ai-budget";
import { LIMIT_RECIPES_PER_DAY, COACH_CREDENTIAL } from "@/lib/config";

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
        steps: z
          .union([z.array(z.string()), z.string()])
          .transform((v) => (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean))
          .default([]),
        tip: z.string().optional().default(""),
      }),
    )
    .default([]),
});

const bodySchema = z.object({
  image: z.object({
    data: z.string(),
    media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  }),
});

// Photo d'aliments → recette. On identifie ce qui est visible et on propose des
// recettes réalisables avec ces ingrédients, en respectant allergies et régime.
export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.coachEnabled) {
    return NextResponse.json({ error: "Disponible pendant ton programme." }, { status: 403 });
  }

  const limit = await checkLimit(ctx.userId, "recipes", LIMIT_RECIPES_PER_DAY, DAY_MS);
  if (!limit.ok) {
    return NextResponse.json({ error: `Limite de ${limit.max} générations par jour atteinte.` }, { status: 429 });
  }

  // C'est la SEULE recette qui appelle encore un modèle, et c'est un appel de
  // vision. Il passait jusqu'ici sans porte d'accès ni débit : le fournisseur
  // d'IA en absorbait le coût sans le voir. Il est traité comme les autres
  // actions du client : quota journalier, portefeuille de crédits, débit.
  const coachTenant = ctx.profile?.tenant_id ?? null;
  const budget = await checkClientAiBudget(ctx.userId, coachTenant);
  if (!budget.ok) {
    return NextResponse.json({ error: "Quota IA du jour atteint. Il se renouvelle à minuit." }, { status: 429 });
  }
  const allowance = await checkAiAllowance(coachTenant, "action");
  if (!allowance.ok) return NextResponse.json({ error: allowance.error }, { status: 402 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Image invalide." }, { status: 400 });

  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown> }>();
  const a = quiz?.answers ?? {};
  const arr = (k: string) => (Array.isArray(a[k]) ? (a[k] as string[]).join(", ") : "");

  const system = `Tu es ${COACH_CREDENTIAL}. On te montre une PHOTO d'aliments ou d'ingrédients. Identifie ce que tu vois et propose 1 à 2 recettes réalisables SURTOUT avec ces aliments (tu peux supposer des basiques disponibles : huile, sel, poivre, épices, eau). Réponds UNIQUEMENT par un objet JSON valide en français, sans texte autour. Schéma EXACT :
{"recipes":[{"name":"","level":"Simple","time":"20 min","servings":"1 portion","kcal":"520","protein":"38 g","carbs":"45 g","fat":"16 g","ingredients":[{"food":"","qty":"120 g"}],"steps":["Étape 1","Étape 2"],"tip":"astuce"}]}
Consignes : 4 à 7 étapes concrètes, quantités précises, macros estimées, une astuce. Respecte STRICTEMENT les allergies et le régime indiqués. Si la photo ne montre pas d'aliments, renvoie {"recipes":[]}. Conseils culinaires uniquement, aucune allégation médicale. N'utilise jamais de tiret cadratin ni demi-cadratin.`;

  const user =
    `Allergies à exclure strictement : ${arr("allerg") || "aucune"}.\n` +
    `Régime : ${(a.diet as string) || "omnivore"}. Cadre religieux : ${(a.religion as string) || "aucun"}. Aliments refusés : ${(a.dislikes as string) || "aucun"}.\n` +
    `Regarde la photo et propose des recettes avec ces aliments.`;

  const content: Anthropic.ContentBlockParam[] = [
    { type: "image", source: { type: "base64", media_type: parsed.data.image.media_type, data: parsed.data.image.data } },
    { type: "text", text: user },
  ];

  // Retenu hors du bloc utile : dès que l'API répond, elle facture, même si sa
  // réponse se révèle ensuite inexploitable. Le journal doit le montrer.
  let call: ApiCall | null = null;
  try {
    const message = await (await anthropicForUser(ctx.userId)).messages.create({
      model: MODELS.recipes,
      max_tokens: 3200,
      ...effortConfig(MODELS.recipes, "low"),
      system,
      messages: [{ role: "user", content }],
    });
    call = apiCallOf(message);
    const out = recipesSchema.parse(parseJsonLoose(textOf(message)));
    if (!out.recipes.length) {
      // Photo illisible : rien n'est facturé au client, mais l'appel a bien eu
      // lieu et il est journalisé tel quel.
      await recordCalls(ctx.userId, "recipes", [call], {
        tenantId: coachTenant,
        action: "recette-photo",
        credits: 0,
        countsForQuota: false,
      });
      return NextResponse.json({ error: "Aucun aliment reconnu sur la photo. Réessaie avec une photo plus nette." }, { status: 200 });
    }
    await recordCalls(ctx.userId, "recipes", [call], {
      tenantId: coachTenant,
      action: "recette-photo",
      credits: allowance.coachCost,
    });
    await chargeAiUsage(coachTenant, "action", "recipe", ctx.userId);
    await saveClientRecipes(ctx.userId, out.recipes);
    return NextResponse.json({ recipes: out.recipes });
  } catch {
    if (call) {
      await recordCalls(ctx.userId, "recipes", [call], {
        tenantId: coachTenant,
        action: "recette-photo",
        credits: 0,
        countsForQuota: false,
      }).catch(() => {});
    }
    return NextResponse.json({ error: "Analyse de la photo indisponible." }, { status: 502 });
  }
}
