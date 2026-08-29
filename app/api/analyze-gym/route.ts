import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCall } from "@/lib/ratelimit";
import { anthropic, MODELS, textOf, parseJsonLoose } from "@/lib/anthropic";
import { LIMIT_ANALYZE_GYM_TOTAL } from "@/lib/config";

export const runtime = "nodejs";

const bodySchema = z.object({
  images: z
    .array(
      z.object({
        data: z.string(),
        media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
      }),
    )
    .min(1)
    .max(3),
});

const resultSchema = z.object({
  equipment: z
    .array(
      z.object({
        name: z.string(),
        confidence: z.enum(["élevée", "moyenne", "faible"]).catch("moyenne"),
      }),
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  // L'analyse des photos de salle est la SEULE étape IA autorisée AVANT le
  // paiement (elle fait partie du questionnaire, avant la caisse). On ne bloque
  // donc pas sur `not_paid` ici. Le rate limit total protège des abus.
  if (ctx.access.phase === "ended") {
    return NextResponse.json({ error: "Accès terminé." }, { status: 403 });
  }

  const limit = await checkLimit(ctx.userId, "analyze-gym", LIMIT_ANALYZE_GYM_TOTAL);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Limite d'analyses atteinte. Ajoute ton matériel à la main." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Images invalides." }, { status: 400 });
  }

  const system =
    'Tu identifies le matériel de musculation et de fitness visible sur des photos de salle. Réponds UNIQUEMENT par un JSON valide en français : {"equipment":[{"name":"","confidence":"élevée|moyenne|faible"}]}. Nomme chaque équipement en français, sans doublon. N\'invente rien qui ne soit pas visible.';

  const content: Anthropic.ContentBlockParam[] = parsed.data.images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.media_type, data: img.data },
  }));
  content.push({
    type: "text",
    text: "Liste le matériel utilisable pour un programme d'entraînement.",
  });

  try {
    const message = await anthropic().messages.create({
      model: MODELS.analyzeGym,
      max_tokens: 1024,
      output_config: { effort: "low" },
      system,
      messages: [{ role: "user", content }],
    });
    const result = resultSchema.parse(parseJsonLoose(textOf(message)));
    await recordCall(ctx.userId, "analyze-gym", {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    });
    return NextResponse.json({ equipment: result.equipment });
  } catch {
    return NextResponse.json(
      { error: "Analyse indisponible. Ajoute ton matériel à la main." },
      { status: 502 },
    );
  }
}
