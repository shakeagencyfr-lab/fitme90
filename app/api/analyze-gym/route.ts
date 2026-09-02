import { NextResponse, type NextRequest } from "next/server";
import { makeT } from "@/lib/i18n";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCall } from "@/lib/ratelimit";
import { MODELS, textOf, parseJsonLoose, effortConfig } from "@/lib/anthropic";
import { anthropicForUser } from "@/lib/tenant";
import { LIMIT_ANALYZE_GYM_TOTAL } from "@/lib/config";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { aiLanguageInstruction } from "@/lib/i18n";

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
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  // L'analyse des photos de salle est la SEULE étape IA autorisée AVANT le
  // paiement (elle fait partie du questionnaire, avant la caisse). On ne bloque
  // donc pas sur `not_paid` ici. Le rate limit total protège des abus.
  if (ctx.access.phase === "ended") {
    return NextResponse.json({ error: t("srv.accessEnded") }, { status: 403 });
  }

  const limit = await checkLimit(ctx.userId, "analyze-gym", LIMIT_ANALYZE_GYM_TOTAL);
  if (!limit.ok) {
    return NextResponse.json(
      { error: t("srv.analyzeLimit") },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: t("srv.invalidImages") }, { status: 400 });
  }

  const locale = await resolveLocale(await userLocale(ctx.userId));
  const system =
    'Tu identifies le matériel de musculation et de fitness visible sur des photos de salle. Réponds UNIQUEMENT par un JSON valide : {"equipment":[{"name":"","confidence":"élevée|moyenne|faible"}]}. Nomme chaque équipement sans doublon, dans la langue du client. N\'invente rien qui ne soit pas visible. ' +
    aiLanguageInstruction(locale);

  const content: Anthropic.ContentBlockParam[] = parsed.data.images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.media_type, data: img.data },
  }));
  content.push({
    type: "text",
    text: "Liste le matériel utilisable pour un programme d'entraînement.",
  });

  try {
    const message = await (await anthropicForUser(ctx.userId)).messages.create({
      model: MODELS.analyzeGym,
      max_tokens: 1024,
      ...effortConfig(MODELS.analyzeGym, "low"),
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
      { error: t("srv.analyzeDown") },
      { status: 502 },
    );
  }
}
