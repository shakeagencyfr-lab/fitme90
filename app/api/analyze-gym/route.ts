import { NextResponse, type NextRequest } from "next/server";
import { makeT } from "@/lib/i18n";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCalls } from "@/lib/ratelimit";
import { MODELS, textOf, parseJsonLoose, effortConfig, apiCallOf, type ApiCall } from "@/lib/anthropic";
import { anthropicForUser } from "@/lib/tenant";
import { LIMIT_ANALYZE_GYM_TOTAL, GYM_PHOTOS_PER_BATCH } from "@/lib/config";
import { EQUIPMENT_FAMILIES, equipmentKey } from "@/lib/equipment";
import { EQUIPMENT_CATALOG, canonicalEquipment, matchEquipment } from "@/lib/equipment-catalog";
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
    .max(GYM_PHOTOS_PER_BATCH),
});

const resultSchema = z.object({
  equipment: z
    .array(
      z.object({
        name: z.string(),
        family: z.string().optional(),
        // Clé technique, jamais traduite : l'ancien enum français faisait
        // retomber toutes les réponses anglaises sur « moyenne ».
        confidence: z.enum(["high", "medium", "low"]).catch("medium"),
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
  // Le nom détecté part tel quel dans le brief de génération, avec la consigne
  // « aucun exercice hors de cette liste » : on l'ancre donc sur des familles
  // que le générateur comprend, au lieu de laisser le modèle inventer.
  const system = [
    "Tu identifies le matériel de musculation et de fitness visible sur des photos de salle.",
    "Procède photo par photo, dans l'ordre, avant de fusionner ta liste.",
    'Réponds UNIQUEMENT par un JSON valide : {"equipment":[{"name":"","family":"","confidence":"high|medium|low"}]}.',
    "`name` : le nom de la machine. Si elle figure dans le catalogue ci-dessous, reprends son nom EXACTEMENT ; sinon, décris-la précisément dans la langue du client.",
    "Catalogue des machines connues :",
    EQUIPMENT_CATALOG.map((m) => (locale === "en" ? m.name : m.nom)).join(" | ") + ".",
    "`family` : la famille correspondante, reprise EXACTEMENT dans cette liste :",
    EQUIPMENT_FAMILIES.join(" | ") + ".",
    "Si rien ne correspond, mets family à \"\" plutôt que d'inventer une famille.",
    "`confidence` : high, medium ou low. Ces trois valeurs sont des clés techniques, ne les traduis JAMAIS.",
    "high = tu identifies la machine sans ambiguïté. low = tu devines d'après une silhouette partielle.",
    "Un même appareil vu sur plusieurs photos ne donne qu'une seule entrée.",
    "N'invente rien qui ne soit pas visible sur les photos.",
    aiLanguageInstruction(locale),
  ].join(" ");

  // Chaque image est introduite par son étiquette : sans repère, le modèle ne
  // peut pas raisonner photo par photo ni signaler un doublon entre deux vues.
  const content: Anthropic.ContentBlockParam[] = [];
  parsed.data.images.forEach((img, i) => {
    content.push({ type: "text", text: `Photo ${i + 1} :` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.media_type, data: img.data },
    });
  });
  content.push({
    type: "text",
    text: `Examine les ${parsed.data.images.length} photos une par une, puis liste le matériel utilisable pour un programme d'entraînement.`,
  });

  // Retenu hors du bloc utile : l'appel est facturé dès qu'il répond, même si
  // sa réponse ne passe pas la validation.
  let call: ApiCall | null = null;
  try {
    const message = await (await anthropicForUser(ctx.userId)).messages.create({
      model: MODELS.analyzeGym,
      max_tokens: 2048,
      ...effortConfig(MODELS.analyzeGym, "low"),
      system,
      messages: [{ role: "user", content }],
    });
    call = apiCallOf(message);
    const result = resultSchema.parse(parseJsonLoose(textOf(message)));
    await recordCalls(ctx.userId, "analyze-gym", [call], {
      tenantId: ctx.profile?.tenant_id ?? null,
      action: "analyse-salle",
      credits: 0,
    });
    return NextResponse.json({ equipment: canonicaliser(result.equipment, locale) });
  } catch {
    if (call) {
      await recordCalls(ctx.userId, "analyze-gym", [call], {
        tenantId: ctx.profile?.tenant_id ?? null,
        action: "analyse-salle",
        credits: 0,
        countsForQuota: false,
      }).catch(() => {});
    }
    return NextResponse.json(
      { error: t("srv.analyzeDown") },
      { status: 502 },
    );
  }
}

/**
 * Ramène les machines reconnues au vocabulaire du catalogue.
 *
 * Le modèle a beau recevoir la liste, il écrit parfois « presse à cuisses
 * inclinée » ou « leg press » pour la même machine : deux entrées pour un seul
 * appareil, et deux matériels différents dans le brief de génération. Le
 * rattachement se fait donc ici, à la source, et ce qui n'est pas reconnu est
 * gardé tel quel plutôt que jeté.
 */
function canonicaliser(
  list: { name: string; confidence: string }[],
  locale: "fr" | "en",
): { name: string; confidence: string }[] {
  const vus = new Set<string>();
  const sortie: { name: string; confidence: string }[] = [];
  for (const e of list) {
    const nom = canonicalEquipment(e.name, locale);
    if (!nom) continue;
    const cat = matchEquipment(e.name);
    const cle = cat ? `cat:${cat.key}` : equipmentKey(nom);
    if (!cle || vus.has(cle)) continue;
    vus.add(cle);
    sortie.push({ name: nom, confidence: e.confidence });
  }
  return sortie;
}
