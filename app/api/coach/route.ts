import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCall, DAY_MS } from "@/lib/ratelimit";
import { anthropic, MODELS, textOf, parseJsonLoose } from "@/lib/anthropic";
import { describeAnswers, coachTone, DAYS } from "@/lib/questionnaire";
import { generateProgram, readAdaptations } from "@/lib/program";
import { pnum, grp } from "@/lib/nutrition";
import { LIMIT_COACH_PER_DAY, COACH_CREDENTIAL, COACH_NAME, PROGRAM_DAYS } from "@/lib/config";

const DIETS = ["Omnivore", "Flexitarien", "Végétarien", "Végétalien", "Sans porc", "Sans bœuf"];

export const runtime = "nodejs";
export const maxDuration = 300; // l'adaptation peut déclencher une régénération

const bodySchema = z.object({
  message: z.string().min(1).max(2000),
  conversation_id: z.string().uuid().optional(),
  image: z
    .object({
      data: z.string(), // base64 (sans en-tête data:)
      media_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
    })
    .optional(),
});

// Messages d'UNE conversation, pour ré-afficher le fil. Sans paramètre, on
// renvoie la conversation la plus récente (et son id).
export async function GET(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const supabase = await createClient();

  let conversationId = new URL(req.url).searchParams.get("conversation");
  if (!conversationId) {
    const { data: last } = await supabase
      .from("coach_conversations")
      .select("id")
      .eq("user_id", ctx.userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    conversationId = last?.id ?? null;
  }
  if (!conversationId) return NextResponse.json({ messages: [], conversationId: null });

  const { data } = await supabase
    .from("coach_messages")
    .select("role, content")
    .eq("user_id", ctx.userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  return NextResponse.json({ messages: data ?? [], conversationId });
}

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
          : ctx.access.phase === "scheduled"
            ? "Ton programme n'a pas encore démarré — le coach IA s'active le jour du départ."
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

  // Conversation cible : celle fournie (si elle appartient bien au client),
  // sinon on en ouvre une nouvelle, titrée d'après le premier message.
  const convTitle = parsed.data.message.slice(0, 48).trim() || "Nouvelle conversation";
  let conversationId = parsed.data.conversation_id ?? null;
  if (conversationId) {
    const { data: conv } = await supabase
      .from("coach_conversations")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("id", conversationId)
      .maybeSingle<{ id: string }>();
    if (!conv) conversationId = null; // id inconnu / pas au client
  }
  if (!conversationId) {
    const { data: created } = await supabase
      .from("coach_conversations")
      .insert({ user_id: ctx.userId, title: convTitle })
      .select("id")
      .single<{ id: string }>();
    conversationId = created?.id ?? null;
  }

  // Contexte : dernier programme + historique récent DE CETTE conversation.
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
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(24);

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
  const system = `Tu es ${COACH_NAME}, le coach personnel de FitMe90 (${COACH_CREDENTIAL}). Tu te présentes par ton prénom quand c'est naturel et tu réponds comme une vraie personne.${toneLine} Tu écris comme dans une vraie messagerie : découpe ta réponse en 1 à 4 messages COURTS et naturels (une idée par message, pas de pavé). Réponds STRICTEMENT au format JSON, sans aucun texte autour : {"messages":["premier message","deuxième message"]}. Tu réponds en français, concrètement, en t'appuyant sur le PROFIL, le PROGRAMME et les SÉANCES VALIDÉES ci-dessous — utilise les préférences, contraintes de temps, mode de vie et objectifs du client pour personnaliser tes réponses. Les charges ne sont jamais imposées : elles se règlent au ressenti (RPE 7 au cycle 1, RPE 8 aux cycles 2-3). Quand on te demande des charges, propose-les à partir des volumes et séries déjà relevés, en progressant prudemment. Le client peut joindre une PHOTO (un repas, une machine de la salle, un exercice) : analyse-la et réponds concrètement (ex : estimer les macros d'une assiette, reconnaître une machine et proposer un exercice). Tu donnes des conseils d'entraînement et d'hygiène alimentaire, jamais d'avis médical : en cas de douleur, de pathologie ou de blessure, invite à consulter un professionnel de santé. N'utilise jamais de tiret cadratin (—) ni demi-cadratin (–) : ponctuation naturelle uniquement (virgules, deux-points, points).

PROFIL DU CLIENT :
${profileLines.length ? profileLines.join("\n") : "Non renseigné."}
Jours d'entraînement : ${quiz?.train_days?.join(", ") || "non précisés"}.

CALENDRIER (suis la progression avec ces repères réels) :
- Programme démarré le ${
    ctx.profile?.start_date
      ? new Date(`${ctx.profile.start_date}T00:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : "non défini"
  }.
- Aujourd'hui : ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })} — jour ${ctx.access.day} sur ${PROGRAM_DAYS}.
- Les séances tombent aux vrais jours de la semaine choisis. Parle en dates concrètes et repère les séances validées vs prévues pour suivre les retards éventuels.

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
    {
      name: "modifier_nutrition",
      description:
        "Modifie la nutrition du client quand il le demande : retirer un aliment qu'il n'aime pas, changer de régime, ajouter une allergie/intolérance, ou ajuster l'objectif calorique. Les repas, macros et la liste de courses se recalculent automatiquement. Renseigne uniquement les champs concernés par la demande.",
      input_schema: {
        type: "object",
        properties: {
          aliments_a_retirer: {
            type: "array",
            items: { type: "string" },
            description:
              "Aliments que le client n'aime pas / veut retirer de ses repas (ex : [\"brocoli\",\"fromage bleu\"]). Ils s'ajoutent aux aliments déjà refusés.",
          },
          regime: {
            type: "string",
            enum: DIETS,
            description: "Nouveau régime alimentaire, si le client en change.",
          },
          allergies: {
            type: "array",
            items: { type: "string" },
            description:
              "Allergies/intolérances à ajouter (ex : [\"Lactose\"]). Elles s'ajoutent aux existantes.",
          },
          calories: {
            type: "number",
            description:
              "Nouvel objectif calorique par jour d'entraînement (kcal), entre 1200 et 5000, si le client veut manger plus ou moins.",
          },
        },
      },
    },
  ];

  const totalUsage = { input_tokens: 0, output_tokens: 0 };
  let adapted = false;

  // Change réellement les jours d'entraînement (train_days) ET régénère le
  // programme complet, sinon le texte de présentation et la répartition des
  // séances restaient sur les jours d'origine.
  async function runChangeDays(jours: string[]): Promise<string> {
    const clean = Array.from(new Set(jours.filter((d) => DAYS.includes(d))));
    if (!clean.length) return "Aucun jour valide fourni : rien changé.";
    const { error } = await supabase
      .from("questionnaires")
      .update({ train_days: clean })
      .eq("user_id", ctx!.userId);
    if (error) return "Impossible de mettre à jour les jours pour l'instant.";
    adapted = true;
    const ordered = DAYS.filter((d) => clean.includes(d));

    // Régénère TOUT le plan (présentation, cycles, répartition, cardio) sur les
    // nouveaux jours. En cas d'échec, les jours restent modifiés (agenda,
    // séance, nutrition recalés) — on le signale sans casser la réponse.
    if (quiz) {
      quiz.train_days = clean;
      // Synchronise la fréquence et les jours dans les réponses, sinon le brief
      // de régénération dit encore « 3 séances » et le modèle réécrit l'ancien.
      const syncedAnswers = { ...quiz.answers, freq: String(clean.length), train_days: clean };
      quiz.answers = syncedAnswers;
      await supabase
        .from("questionnaires")
        .update({ answers: syncedAnswers })
        .eq("user_id", ctx!.userId);
      try {
        const { data: equipRows } = await supabase
          .from("equipment")
          .select("name")
          .eq("user_id", ctx!.userId)
          .eq("enabled", true);
        const equipment = (equipRows ?? []).map((e) => e.name as string);
        const result = await generateProgram(
          { answers: syncedAnswers, trainDays: clean, equipment },
          "low", // rapide : la requête coach doit tenir sous ~60 s (Vercel Hobby)
        );
        totalUsage.input_tokens += result.usage.input_tokens;
        totalUsage.output_tokens += result.usage.output_tokens;
        await supabase.from("programs").insert({
          user_id: ctx!.userId,
          plan: result.plan,
          model: result.model,
        });
        return `Jours d'entraînement mis à jour : ${ordered.join(", ")} (${ordered.length} séances/semaine). J'ai régénéré tout le programme (présentation, cycles, cardio) pour coller à ces jours. Confirme-le au client.`;
      } catch {
        return `Jours d'entraînement mis à jour : ${ordered.join(", ")} (${ordered.length} séances/semaine). Le calendrier, les séances et la nutrition se sont recalés ; la réécriture du plan complet n'a pas abouti cette fois — redis-moi « mets à jour mon programme » si la présentation ne reflète pas encore les nouveaux jours.`;
      }
    }
    return `Jours d'entraînement mis à jour : ${ordered.join(", ")} (${ordered.length} séances/semaine). Le calendrier, les séances et la nutrition se sont recalés. Confirme-le au client.`;
  }

  // Modifie la nutrition : régime, allergies, objectif calorique.
  async function runNutrition(input: {
    aliments_a_retirer?: string[];
    regime?: string;
    allergies?: string[];
    calories?: number;
  }): Promise<string> {
    if (!quiz) return "Impossible : questionnaire introuvable.";
    const changes: string[] = [];
    const answers: Record<string, unknown> = { ...quiz.answers };

    if (Array.isArray(input.aliments_a_retirer) && input.aliments_a_retirer.length) {
      const current = typeof answers.dislikes === "string" ? answers.dislikes : "";
      const prev = current.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      const merged = Array.from(new Set([...prev, ...input.aliments_a_retirer.map(String).map((s) => s.trim()).filter(Boolean)]));
      answers.dislikes = merged.join(", ");
      changes.push(`aliments retirés → ${input.aliments_a_retirer.join(", ")}`);
    }
    if (input.regime && DIETS.includes(input.regime)) {
      answers.diet = input.regime;
      changes.push(`régime → ${input.regime}`);
    }
    if (Array.isArray(input.allergies) && input.allergies.length) {
      const prev = Array.isArray(answers.allerg)
        ? (answers.allerg as string[]).filter((x) => x !== "Aucune")
        : [];
      const merged = Array.from(new Set([...prev, ...input.allergies.map(String)]));
      answers.allerg = merged;
      changes.push(`allergies → ${merged.join(", ") || "aucune"}`);
    }
    if (changes.length) {
      await supabase.from("questionnaires").update({ answers }).eq("user_id", ctx!.userId);
      quiz.answers = answers; // pour d'éventuels outils suivants
    }

    if (typeof input.calories === "number" && input.calories >= 1200 && input.calories <= 5000) {
      const { data: prog } = await supabase
        .from("programs")
        .select("id, plan")
        .eq("user_id", ctx!.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; plan: { nutrition?: Record<string, string> } }>();
      if (prog?.plan?.nutrition) {
        const nut = prog.plan.nutrition;
        const oldKcal = pnum(nut.kcal) || 2580;
        const ratio = input.calories / oldKcal;
        nut.kcal = grp(input.calories);
        nut.protein = String(Math.round(pnum(nut.protein) * ratio));
        nut.carbs = String(Math.round(pnum(nut.carbs) * ratio));
        nut.fat = String(Math.round(pnum(nut.fat) * ratio));
        await supabase.from("programs").update({ plan: prog.plan }).eq("id", prog.id);
        changes.push(`objectif calorique → ${input.calories} kcal/jour`);
      }
    }

    if (!changes.length) return "Aucune modification nutrition valide fournie.";
    adapted = true;
    return `Nutrition mise à jour : ${changes.join(" ; ")}. Les repas, macros et la liste de courses se recalculent. Confirme-le au client (le filtrage des allergènes reste une aide, il doit vérifier les étiquettes).`;
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

    const result = await generateProgram(
      { answers: mergedAnswers, trainDays: quiz.train_days ?? [], equipment },
      "low", // rapide : tenir sous ~60 s dans la requête coach (Vercel Hobby)
    );
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
    if (name === "modifier_nutrition") {
      const i = input as {
        aliments_a_retirer?: string[];
        regime?: string;
        allergies?: string[];
        calories?: number;
      };
      return runNutrition(i);
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

  // Persistance : message utilisateur + chaque bulle du coach, dans la conversation.
  await supabase.from("coach_messages").insert([
    { user_id: ctx.userId, conversation_id: conversationId, role: "user", content: parsed.data.message },
    ...messages.map((content) => ({ user_id: ctx.userId, conversation_id: conversationId, role: "assistant", content })),
  ]);
  // Remonte la conversation en tête de liste ; titre depuis le 1er message
  // s'il était resté au défaut (conversation créée vide auparavant).
  if (conversationId) {
    await supabase
      .from("coach_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", ctx.userId);
    await supabase
      .from("coach_conversations")
      .update({ title: convTitle })
      .eq("id", conversationId)
      .eq("user_id", ctx.userId)
      .eq("title", "Nouvelle conversation");
  }
  await recordCall(ctx.userId, "coach", totalUsage);

  return NextResponse.json({ messages, adapted, conversationId });
}
