import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCall, DAY_MS } from "@/lib/ratelimit";
import { anthropic, MODELS, textOf } from "@/lib/anthropic";
import { LIMIT_COACH_PER_DAY, COACH_CREDENTIAL } from "@/lib/config";

export const runtime = "nodejs";

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  image: z
    .object({
      data: z.string(), // base64 (sans en-tête data:)
      media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Le coach IA s'ARRÊTE après J90 (règle produit). Contrôle serveur.
  if (!ctx.access.coachEnabled) {
    const msg =
      ctx.access.phase === "grace"
        ? "Le coach IA est désactivé après 90 jours. Ton plan reste consultable."
        : ctx.access.phase === "ended"
          ? "Ton accès au programme est terminé."
          : "Débloque ton programme pour accéder au coach.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const limit = await checkLimit(ctx.userId, "coach", LIMIT_COACH_PER_DAY, DAY_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Limite de ${limit.max} messages par jour atteinte. Reviens demain.` },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Message invalide." }, { status: 400 });
  }

  const supabase = await createClient();

  // Contexte : dernier programme + historique récent du coach.
  const { data: program } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: unknown }>();

  const { data: history } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const past = (history ?? []).reverse() as { role: "user" | "assistant"; content: string }[];

  const system = `Tu es le coach de FitMe90 (${COACH_CREDENTIAL}). Tu réponds en français, brièvement et concrètement, UNIQUEMENT à partir du profil et du programme de l'utilisateur ci-dessous. Tu donnes des conseils d'entraînement et d'hygiène alimentaire, jamais d'avis médical : en cas de douleur, de pathologie ou de blessure, invite à consulter un professionnel de santé.\n\nProgramme de l'utilisateur (JSON) :\n${JSON.stringify(program?.plan ?? {})}`;

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (parsed.data.image) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: parsed.data.image.media_type,
        data: parsed.data.image.data,
      },
    });
  }
  userContent.push({ type: "text", text: parsed.data.message });

  let answer: string;
  let usage: { input_tokens: number; output_tokens: number };
  try {
    const message = await anthropic().messages.create({
      model: MODELS.coach,
      max_tokens: 1024,
      output_config: { effort: "low" },
      system,
      messages: [
        ...past.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: userContent },
      ],
    });
    answer = textOf(message) || "Je n'ai pas de réponse pour l'instant.";
    usage = {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    };
  } catch {
    return NextResponse.json(
      { error: "Le coach est momentanément indisponible." },
      { status: 502 },
    );
  }

  // Persistance : message utilisateur (texte) + réponse.
  await supabase.from("coach_messages").insert([
    { user_id: ctx.userId, role: "user", content: parsed.data.message },
    { user_id: ctx.userId, role: "assistant", content: answer },
  ]);
  await recordCall(ctx.userId, "coach", usage);

  return NextResponse.json({ answer });
}
