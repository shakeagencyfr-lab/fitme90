import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCall, DAY_MS } from "@/lib/ratelimit";
import { anthropic, MODELS, textOf, parseJsonLoose } from "@/lib/anthropic";
import { describeAnswers, coachTone, DAYS } from "@/lib/questionnaire";
import { generateProgram, readAdaptations } from "@/lib/program";
import { LIMIT_COACH_PER_DAY, COACH_CREDENTIAL } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300; // l'adaptation peut déclencher une régénération

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

  // Séances validées récentes : servent au coach pour proposer les charges.
  const { data: logs } = await supabase
    .from("session_logs")
    .select("day, volume, sets_done, entries")
    .eq("user_id", ctx.userId)
    .order("day", { ascending: false })
    .limit(12);

  // Profil complet du questionnaire : rend le coach beaucoup plus personnalisé.
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers, train_days")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>();
  const profileLines = quiz?.answers ? describeAnswers(quiz.answers) : [];
  const tone = quiz?.answers ? coachTone(quiz.answers) : null;

  const past = (history ?? []).reverse() as { role: "user" | "assistant"; content: string }[];

  const toneLine = tone ? ` Adopte un ton ${tone.toLowerCase()}.` : "";
  const system = `Tu es le coach personnel de FitMe90 (${COACH_CREDENTIAL}).${toneLine} Tu écris comme dans une vraie messagerie : découpe ta réponse en 1 à 4 messages COURTS et naturels (une idée par message, pas de pavé). Réponds STRICTEMENT au format JSON, sans aucun texte autour : {"messages":["premier message","deuxième message"]}. Tu réponds en français, concrètement, en t'appuyant sur le PROFIL, le PROGRAMME et les SÉANCES VALIDÉES ci-dessous — utilise les préférences, contraintes de temps, mode de vie et objectifs du client pour personnaliser tes réponses. Les charges ne sont jamais imposées : elles se règlent au ressenti (RPE 7 au cycle 1, RPE 8 aux cycles 2-3). Quand on te demande des charges, propose-les à partir des volumes et séries déjà relevés, en progressant prudemment. Tu donnes des conseils d'entraînement et d'hygiène alimentaire, jamais d'avis médical : en cas de douleur, de pathologie ou de blessure, invite à consulter un professionnel de santé.

PROFIL DU CLIENT :
${profileLines.length ? profileLines.join("\n") : "Non renseigné."}
Jours d'entraînement : ${quiz?.train_days?.join(", ") || "non précisés"}.

PROGRAMME (JSON) :
${JSON.stringify(program?.plan ?? {})}

SÉANCES VALIDÉES (les plus récentes d'abord) :
${JSON.stringify(logs ?? [])}`;

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

  // Outil que le coach déclenche LUI-MÊME pour adapter le programme quand le
  // client signale une blessure / contrainte durable.
  const tools: Anthropic.Tool[] = [
    {
      name: "adapter_programme",
      description:
        "Adapte et régénère le programme d'entraînement du client. À utiliser UNIQUEMENT quand le client signale une blessure ou une contrainte durable (ex : douleur au genou, épaule fragile, matériel devenu indisponible) et souhaite que ses séances soient adaptées. NE PAS utiliser pour une simple question. Après l'appel, confirme au client ce qui a changé et rappelle de consulter un professionnel de santé si la douleur persiste.",
      input_schema: {
        type: "object",
        properties: {
          contrainte: {
            type: "string",
            description:
              "La blessure ou contrainte à respecter, formulée clairement (ex : « ménager le genou droit, éviter squat profond et fentes »).",
          },
        },
        required: ["contrainte"],
      },
    },
    {
      name: "changer_jours_entrainement",
      description:
        "Change les jours d'entraînement du client (et donc leur nombre) quand son emploi du temps change (ex : « je ne peux plus m'entraîner que 3 fois par semaine »). À utiliser quand le client a confirmé les jours voulus. Le calendrier, les séances et la nutrition se recalent automatiquement sur ces jours.",
      input_schema: {
        type: "object",
        properties: {
          jours: {
            type: "array",
            items: { type: "string", enum: DAYS },
            description:
              "Liste des jours d'entraînement retenus, codes parmi LUN, MAR, MER, JEU, VEN, SAM, DIM (ex : [\"LUN\",\"MER\",\"VEN\"]).",
          },
        },
        required: ["jours"],
      },
    },
  ];

  const totalUsage = { input_tokens: 0, output_tokens: 0 };
  let adapted = false;

  // Change réellement les jours d'entraînement (train_days) → tout le planning suit.
  async function runChangeDays(jours: string[]): Promise<string> {
    const clean = Array.from(new Set(jours.filter((d) => DAYS.includes(d))));
    if (!clean.length) return "Aucun jour valide fourni : rien changé.";
    const { error } = await supabase
      .from("questionnaires")
      .update({ train_days: clean })
      .eq("user_id", ctx!.userId);
    if (error) return "Impossible de mettre à jour les jours pour l'instant.";
    adapted = true;
    // Ordonne selon la semaine pour la confirmation.
    const ordered = DAYS.filter((d) => clean.includes(d));
    return `Jours d'entraînement mis à jour : ${ordered.join(", ")} (${ordered.length} séances/semaine). Le calendrier, les séances et la nutrition se sont recalés. Confirme-le au client.`;
  }

  async function callModel(msgs: Anthropic.MessageParam[]) {
    const m = await anthropic().messages.create({
      model: MODELS.coach,
      max_tokens: 1200,
      output_config: { effort: "low" },
      system,
      tools,
      messages: msgs,
    });
    totalUsage.input_tokens += m.usage.input_tokens;
    totalUsage.output_tokens += m.usage.output_tokens;
    return m;
  }

  // Exécute l'adaptation : mémorise la contrainte + régénère le programme.
  async function runAdaptation(contrainte: string): Promise<string> {
    if (!quiz) return "Impossible d'adapter : questionnaire introuvable.";
    const prev = readAdaptations(quiz.answers);
    const mergedAnswers = { ...quiz.answers, adaptations: [...prev, contrainte] };
    await supabase.from("questionnaires").update({ answers: mergedAnswers }).eq("user_id", ctx!.userId);

    const { data: equipRows } = await supabase
      .from("equipment")
      .select("name")
      .eq("user_id", ctx!.userId)
      .eq("enabled", true);
    const equipment = (equipRows ?? []).map((e) => e.name as string);

    const result = await generateProgram({
      answers: mergedAnswers,
      trainDays: quiz.train_days ?? [],
      equipment,
    });
    totalUsage.input_tokens += result.usage.input_tokens;
    totalUsage.output_tokens += result.usage.output_tokens;
    await supabase.from("programs").insert({
      user_id: ctx!.userId,
      plan: result.plan,
      model: result.model,
    });
    adapted = true;
    return `Programme régénéré en tenant compte de : « ${contrainte} ». Les exercices contre-indiqués ont été remplacés par des alternatives sûres. Confirme-le au client et invite-le à consulter si la douleur persiste.`;
  }

  const convo: Anthropic.MessageParam[] = [
    ...past.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userContent },
  ];

  async function execTool(name: string, input: unknown): Promise<string> {
    if (name === "adapter_programme") {
      const c = (input as { contrainte?: string }).contrainte ?? "adaptation demandée";
      return runAdaptation(c);
    }
    if (name === "changer_jours_entrainement") {
      const j = (input as { jours?: unknown }).jours;
      return runChangeDays(Array.isArray(j) ? j.map(String) : []);
    }
    return "Action inconnue.";
  }

  let messages: string[];
  try {
    let resp = await callModel(convo);

    // Jusqu'à 2 tours d'outils, en traitant tous les appels d'une réponse.
    for (let round = 0; round < 2 && resp.stop_reason === "tool_use"; round++) {
      const toolUses = resp.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      if (!toolUses.length) break;
      convo.push({ role: "assistant", content: resp.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const out = await execTool(tu.name, tu.input);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
      }
      convo.push({ role: "user", content: results });
      resp = await callModel(convo);
    }

    const raw = textOf(resp);
    try {
      const parsedOut = parseJsonLoose<{ messages?: unknown }>(raw);
      const arr = Array.isArray(parsedOut.messages) ? parsedOut.messages : [];
      messages = arr.map((m) => String(m).trim()).filter(Boolean).slice(0, 4);
    } catch {
      messages = [];
    }
    if (!messages.length) {
      messages = [raw.trim() || (adapted ? "J'ai adapté ton programme." : "Je n'ai pas de réponse pour l'instant.")];
    }
  } catch {
    return NextResponse.json(
      { error: "Le coach est momentanément indisponible." },
      { status: 502 },
    );
  }

  // Persistance : message utilisateur + chaque bulle du coach séparément.
  await supabase.from("coach_messages").insert([
    { user_id: ctx.userId, role: "user", content: parsed.data.message },
    ...messages.map((content) => ({ user_id: ctx.userId, role: "assistant", content })),
  ]);
  await recordCall(ctx.userId, "coach", totalUsage);

  return NextResponse.json({ messages, adapted });
}
