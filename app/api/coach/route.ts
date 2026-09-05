import { NextResponse, type NextRequest } from "next/server";
import { makeT } from "@/lib/i18n";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { recordCalls, checkActionLimit, WEEK_MS } from "@/lib/ratelimit";
import { checkClientAiBudget } from "@/lib/coach-ai-budget";
import { checkAiAllowance, chargeAiUsageDetailed, coachUsageToCharge } from "@/lib/credits";
import { MODELS, textOf, parseJsonLoose, effortConfig, anthropic, apiCallOf, type ApiCall } from "@/lib/anthropic";
import { anthropicKeyForBilling, AI_NOT_CONFIGURED_MESSAGE } from "@/lib/tenant";
import { describeAnswers, DAYS } from "@/lib/questionnaire";
import { clientCoachAiIncluded } from "@/lib/offers";
import { buildPersona, DEFAULT_BRAND } from "@/lib/coach-persona";
import { readCoachName } from "@/lib/methodology";
import { restPattern, startWeekday, isRestDay } from "@/lib/schedule";
import { applySessionOps, type SessionOp } from "@/lib/session-edit";
import { missedDays } from "@/lib/streak";
import { generateProgram, patchPlanForTrainDays, readAdaptations, type Plan, sessionSlotForDay, replaceSessionInPlan, cycleSessions } from "@/lib/program";
import { coachAgenda, coachPlanView, logsDigest, type CoachLog } from "@/lib/coach-context";
import { addMemoryNote, readMemory, renderMemory } from "@/lib/coach-memory";
import { blockPosition } from "@/lib/block-logic";
import { CYCLES_PER_BLOCK, LIMIT_ADAPT_PER_WEEK } from "@/lib/config";
import { revalidatePath } from "next/cache";
import { pnum, grp } from "@/lib/nutrition";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { aiLanguageInstruction } from "@/lib/i18n";

/** Bulles maximum par réponse. Doit rester >= au nombre demandé à la persona. */
const MAX_BUBBLES = 8;

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
  const t = makeT(await resolveLocale(await userLocale(ctx.userId)));

  // Le Coach IA doit être inclus dans l'offre du client (upsell par plan).
  if (!(await clientCoachAiIncluded(ctx.userId))) {
    return NextResponse.json(
      { error: t("srv.aiNotIncluded") },
      { status: 403 },
    );
  }

  // Le coach IA s'ARRÊTE après J90 (règle produit). Contrôle serveur.
  if (!ctx.access.coachEnabled) {
    const msg =
      ctx.access.phase === "grace"
        ? "Le coach IA est désactivé à la fin de ton programme. Ton plan reste consultable."
        : ctx.access.phase === "ended"
          ? "Ton accès au programme est terminé."
          : ctx.access.phase === "scheduled"
            ? "Ton programme n'a pas encore démarré, le coach IA s'active le jour du départ."
            : "Débloque ton programme pour accéder au coach.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  // Porte d'accès : soit le portefeuille de crédits du coach (Modèle crédits du
  // revendeur), soit les plafonds journaliers habituels (BYOK / abonnement).
  const coachTenant = ctx.profile?.tenant_id ?? null;
  // Quota journalier du plan, dans tous les modes : le coach borne ce qu'un
  // client peut lui coûter par jour, et le compteur repart à minuit (Paris).
  const budget = await checkClientAiBudget(ctx.userId, coachTenant);
  if (!budget.ok) {
    const at = new Date(budget.resetsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
    return NextResponse.json(
      { error: t("srv.quotaUsed", { n: budget.limit, time: at }), quota: budget },
      { status: 429 },
    );
  }
  // Crédits (coach chez son revendeur, revendeur chez la plateforme) : on
  // vérifie avant l'appel, on débite après succès.
  const allowance = await checkAiAllowance(coachTenant, "action");
  if (!allowance.ok) return NextResponse.json({ error: allowance.error }, { status: 402 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: t("srv.invalidMessage") }, { status: 400 });
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
    .select("plan, duration_months")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: unknown; duration_months: number | null }>();

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

  // Toutes les séances validées (jours) : pour repérer les retards à rattraper.
  const { data: doneRows } = await supabase
    .from("session_logs")
    .select("day")
    .eq("user_id", ctx.userId);

  // Profil complet du questionnaire : rend le coach beaucoup plus personnalisé.
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers, train_days")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>();
  const profileLines = quiz?.answers ? describeAnswers(quiz.answers) : [];

  // Calendrier réel : jours d'entraînement à jour + statut du jour + retards.
  const coachPattern = restPattern(quiz?.train_days ?? []);
  const coachStartWd = startWeekday(ctx.profile?.start_date);
  const todayIsTraining = ctx.access.day >= 1 && !isRestDay(ctx.access.day, coachPattern, coachStartWd);
  const missedList = ctx.profile?.start_date
    ? missedDays({
        pattern: coachPattern,
        startWd: coachStartWd,
        currentDay: ctx.access.day,
        completedDays: (doneRows ?? []).map((r) => r.day as number),
        programDays: ctx.access.programDays,
      })
    : [];

  const past = (history ?? []).reverse() as { role: "user" | "assistant"; content: string }[];

  // Séances réellement prévues, calculées comme dans l'app. Le weekPlan mappe un
  // jour de SEMAINE alors que la rotation suit le RANG du jour d'entraînement :
  // les deux divergent dès que le programme ne démarre pas le premier jour
  // d'entraînement de la semaine. Sans ce bloc, le coach annonçait une séance
  // différente de celle affichée au client.
  const agenda = coachAgenda(
    (program?.plan as Plan | undefined) ?? null,
    ctx.access.day,
    coachPattern,
    coachStartWd,
    ctx.access.programDays,
  );
  const dayLabel = (d: number) =>
    ctx.profile?.start_date
      ? new Date(new Date(`${ctx.profile.start_date}T00:00:00Z`).getTime() + (d - 1) * 86400000).toLocaleDateString(dateLoc, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
      : `jour ${d}`;

  const coachName = await readCoachName(ctx.profile?.tenant_id ?? null);
  // Mémoire longue : rendue dans le bloc STABLE, donc mise en cache.
  const memoryBlock = renderMemory(await readMemory(ctx.userId));
  // Langue du client : le coach répond dedans (cookie > profil > tenant).
  const locale = await resolveLocale(await userLocale(ctx.userId));
  const dateLoc = locale === "en" ? "en-GB" : "fr-FR";
  // Le prompt système est scindé en DEUX blocs pour le cache Anthropic, qui
  // fonctionne par préfixe : tout ce qui est stable d'un message à l'autre
  // (persona, profil, programme) va dans le premier bloc et porte le
  // `cache_control` ; tout ce qui bouge (date du jour, retards, séances
  // validées) va APRÈS, sinon un simple changement de date invaliderait le
  // programme entier. Une lecture de cache coûte 10 % d'un token d'entrée.
  const systemStable = `${buildPersona(quiz?.answers ?? {}, { ...DEFAULT_BRAND, coachName })}

${aiLanguageInstruction(locale)}

PROFIL DU CLIENT :
${profileLines.length ? profileLines.join("\n") : "Non renseigné."}
Jours d'entraînement : ${quiz?.train_days?.join(", ") || "non précisés"}.
${memoryBlock ? `\n${memoryBlock}\n` : ""}
PROGRAMME (JSON, cycle en cours détaillé) :
${JSON.stringify(coachPlanView((program?.plan as Plan | undefined) ?? null, ctx.access.day))}`;

  const systemVolatile = `CALENDRIER (suis la progression avec ces repères réels) :
- Programme démarré le ${
    ctx.profile?.start_date
      ? new Date(`${ctx.profile.start_date}T00:00:00Z`).toLocaleDateString(dateLoc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : "non défini"
  }.
- Aujourd'hui : ${new Date().toLocaleDateString(dateLoc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}, jour ${ctx.access.day} sur ${ctx.access.programDays}.
- STATUT DU JOUR : aujourd'hui est un jour ${todayIsTraining ? "D'ENTRAÎNEMENT, une séance est prévue" : "DE REPOS, aucune séance n'est prévue"}. Fie-toi à CETTE information (jours d'entraînement à jour : ${quiz?.train_days?.join(", ") || "non précisés"}), pas au texte du programme qui peut dater d'avant un changement de jours.
- Les séances tombent aux vrais jours de la semaine choisis. Parle en dates concrètes et repère les séances validées vs prévues pour suivre les retards éventuels.
- Séances en retard (passées, non validées) : ${missedList.length ? `${missedList.length} (jours ${missedList.slice(0, 8).join(", ")}${missedList.length > 8 ? "…" : ""}). Le calendrier ne bouge pas : encourage à les RATTRAPER quand le client peut, sur un ton bienveillant et sans culpabiliser. Rappelle qu'il peut ouvrir une séance passée depuis l'agenda pour la rattraper. N'en parle QUE si c'est pertinent (le client en parle, demande un bilan, ou s'inquiète de son retard).` : "aucune, félicite la régularité si le sujet vient."}

CALENDRIER JOUR PAR JOUR (fait foi : c'est exactement ce que voit le client dans son app ; les jours de repos sont inclus, ne saute jamais un jour pour répondre à « demain » ou à une date) :
${
  agenda.length
    ? agenda
        .map((e, i) => {
          const quand = i === 0 ? "aujourd'hui" : i === 1 ? "demain" : dayLabel(e.day);
          const tete = `- ${quand} (${dayLabel(e.day)}, jour ${e.day}) : ${e.rest ? "REPOS, aucune séance" : e.title}`;
          // Le détail des exercices n'est utile que pour la séance du jour.
          return i === 0 && !e.rest && e.exercises.length
            ? `${tete}\n${e.exercises.map((x) => `    . ${x}`).join("\n")}`
            : tete;
        })
        .join("\n")
    : "Programme indisponible."
}

Le « weekPlan » du programme n'est qu'un gabarit de semaine indicatif : pour une date ou un jour précis, fie-toi TOUJOURS au calendrier ci-dessus, jamais au weekPlan.

SÉANCES VALIDÉES (les plus récentes d'abord) :
${logsDigest((logs ?? []) as CoachLog[])}`;

  // Cache de prompt en DURÉE LONGUE (1 heure) plutôt que les 5 minutes par
  // défaut. Une conversation avec un coach n'est pas une rafale : le client
  // écrit, réfléchit, répond dix minutes plus tard. Avec 5 minutes, le cache
  // aurait expiré entre deux tours et on repaierait l'écriture du contexte à
  // chaque message. Une écriture longue coûte 200 % d'un token d'entrée au lieu
  // de 125 %, mais elle n'a lieu qu'une fois par heure : à partir du troisième
  // message dans l'heure, c'est gagnant.
  //
  // DEUX points de reprise, et DEUX SEULEMENT. Ils portent tous les deux sur du
  // contenu STABLE d'un message à l'autre, ce qui est la condition pour que le
  // cache serve à quelque chose : le premier bloc (persona, profil, programme)
  // tient des jours, le second (date du jour, retards, séances validées) change
  // quand le client valide une séance mais reste identique pendant toute une
  // conversation.
  //
  // Ne JAMAIS poser un troisième point de reprise dans les messages. Le cache
  // fonctionne par préfixe : un repère posé sur du contenu qui bouge ne se
  // retrouve jamais, tout est réécrit au double du tarif, et le cache finit par
  // coûter plus cher que pas de cache du tout. C'est exactement ce qui s'est
  // produit ici (voir le commentaire sur `convo` plus bas).
  const longCache = { type: "ephemeral", ttl: "1h" } as const;
  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: systemStable, cache_control: longCache },
    { type: "text", text: systemVolatile, cache_control: longCache },
  ];

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
    {
      name: "modifier_seance",
      description:
        "Modifie une séance du programme DANS L'APP du client, sans régénérer : ajouter, retirer, remplacer ou ajuster des exercices (séries, répétitions, charge, note, repos), ou ajouter un finisher cardio (rameur, vélo, marche inclinée). À utiliser dès que le client demande un changement concret sur une séance (« ajoute du hip thrust », « remplace le développé couché », « mets 18 min de rameur en zone 2 à la fin »), une fois le changement convenu avec lui. Par défaut la séance d'aujourd'hui ; `jour_programme` vise un autre jour du calendrier (numéro de jour donné dans le calendrier). Le changement vaut pour cette séance à chaque fois qu'elle revient dans le cycle en cours ; ce que tu ne touches pas reste tel quel. Ne dis JAMAIS que tu ne peux pas modifier la séance : tu le fais avec cet outil, puis tu confirmes. Pour une blessure ou une contrainte durable, utilise adapter_programme.",
      input_schema: {
        type: "object",
        properties: {
          jour_programme: {
            type: "integer",
            description: "Numéro du jour de programme dont on modifie la séance (voir le calendrier). Absent = aujourd'hui.",
          },
          operations: {
            type: "array",
            minItems: 1,
            description: "Les retouches, dans l'ordre.",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["ajouter", "retirer", "remplacer", "modifier"] },
                exercice: {
                  type: "string",
                  description: "Nom de l'exercice visé, tel qu'il figure dans la séance (retirer, remplacer, modifier).",
                },
                nouveau: {
                  type: "object",
                  description: "Le nouvel exercice (ajouter, remplacer) ou seulement les champs à changer (modifier).",
                  properties: {
                    nom: { type: "string" },
                    series: { type: "integer", description: "Nombre de séries (1 à 12)." },
                    reps: { type: "string", description: "Répétitions, ex « 10 » ou « 8-12 »." },
                    charge: { type: "string", description: "Charge indicative, ex « 40 kg », « poids du corps »." },
                    note: { type: "string", description: "Consigne courte d'exécution." },
                    repos_sec: { type: "integer", description: "Repos entre séries, en secondes." },
                    cardio: { type: "boolean", description: "true pour un finisher ou un bloc cardio." },
                    duree: { type: "string", description: "Durée d'un bloc cardio, ex « 18 min »." },
                    zone: { type: "string", description: "Intensité d'un bloc cardio, ex « zone 2, allure conversationnelle »." },
                  },
                },
                position: { type: "integer", description: "Position (1 = début) où insérer un exercice ajouté. Fin de séance par défaut." },
              },
              required: ["action"],
            },
          },
        },
        required: ["operations"],
      },
    },
    {
      name: "memoriser",
      description:
        "Mémorise un fait DURABLE sur le client, pour t'en souvenir dans toutes tes conversations futures. À utiliser quand tu apprends quelque chose de stable et utile au coaching : une préférence (« il préfère s'entraîner le matin »), une contrainte de vie (« il part en déplacement deux semaines en octobre »), un aliment détesté, un objectif personnel, un antécédent sportif. NE PAS utiliser pour une blessure ou une contrainte physique qui doit modifier les séances : utilise « adapter_programme ». NE PAS utiliser pour ce qui est déjà dans le profil, ni pour un état passager (fatigue du jour, humeur), ni pour ce que le client vient de dire dans cette conversation et qui n'a pas vocation à durer.",
      input_schema: {
        type: "object",
        properties: {
          fait: {
            type: "string",
            description:
              "Le fait à retenir, formulé court et à la troisième personne (ex : « préfère s'entraîner le matin avant le travail »).",
          },
        },
        required: ["fait"],
      },
    },
  ];

  // UN message du client, ce sont un à trois appels au modèle : la réponse, et
  // un appel de plus par tour d'outils. Ils sont retenus un par un, et non
  // additionnés : le journal doit montrer la facture Anthropic telle qu'elle
  // est, avec le modèle et l'identifiant de requête de chacun.
  const coachCalls: ApiCall[] = [];
  // Une régénération lancée depuis le chat appelle le modèle de GÉNÉRATION,
  // pas celui du coach. Ses appels vivent dans leur propre liste : mêlés aux
  // précédents, ils auraient été tarifés au prix de Haiku alors qu'ils coûtent
  // ceux de Sonnet, et le journal sous-évaluait l'appel de moitié.
  const genCalls: ApiCall[] = [];
  // `adapted` : quelque chose a changé, il faut rafraîchir les pages du client.
  // `regenerated` : le modèle a réellement reconstruit un programme, ce qui est
  // le SEUL cas qui justifie de débiter des crédits de génération.
  let adapted = false;
  let regenerated = false;

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

    // Synchronise fréquence + jours, puis recale le plan de façon DÉTERMINISTE
    // (sans IA) : instantané et fiable, la présentation et la nutrition suivent.
    if (quiz) {
      quiz.train_days = clean;
      const syncedAnswers = { ...quiz.answers, freq: String(clean.length), train_days: clean };
      quiz.answers = syncedAnswers;
      await supabase.from("questionnaires").update({ answers: syncedAnswers }).eq("user_id", ctx!.userId);
    }
    const { data: prog } = await supabase
      .from("programs")
      .select("id, plan")
      .eq("user_id", ctx!.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; plan: Plan }>();
    if (prog?.plan) {
      const patched = patchPlanForTrainDays(prog.plan, clean);
      await supabase.from("programs").update({ plan: patched }).eq("id", prog.id);
    }
    return `Jours d'entraînement mis à jour : ${ordered.join(", ")} (${ordered.length} séances/semaine). Le calendrier, la séance, la nutrition et la présentation du programme se sont recalés. Confirme-le au client.`;
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

  // Retouche une séance là où elle vit dans le plan, sans régénération ni
  // crédit : c'est une écriture déterministe. Le programme est relu à l'instant
  // (un outil précédent du même tour a pu le changer), et une nouvelle version
  // est insérée pour garder l'historique, comme après une adaptation.
  async function runSessionEdit(input: { jour_programme?: unknown; operations?: unknown }): Promise<string> {
    const ops = Array.isArray(input.operations) ? (input.operations as SessionOp[]) : [];
    if (!ops.length) return "Aucune opération fournie : rien changé.";
    const day = typeof input.jour_programme === "number" && Number.isFinite(input.jour_programme)
      ? Math.max(1, Math.min(ctx!.access.programDays, Math.trunc(input.jour_programme)))
      : Math.max(1, ctx!.access.day);
    if (isRestDay(day, coachPattern, coachStartWd)) {
      return `Le jour ${day} est un jour de repos, il n'y a pas de séance à modifier. Demande au client quelle séance il veut changer (voir le calendrier) et rappelle avec jour_programme.`;
    }
    const { data: prog } = await supabase
      .from("programs")
      .select("id, plan, model, duration_months")
      .eq("user_id", ctx!.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; plan: Plan; model: string | null; duration_months: number | null }>();
    if (!prog?.plan) return "Impossible : programme introuvable.";
    const at = sessionSlotForDay(prog.plan, day, coachPattern, coachStartWd);
    if (!at) return "Impossible : aucune séance dans ce cycle.";
    const current = cycleSessions(prog.plan, at.cycleIndex)[at.slot];
    if (!current) return "Impossible : séance introuvable.";

    const edited = applySessionOps(current, ops);
    if (!edited.changes.length) {
      return `Rien n'a été modifié : ${edited.errors.join(" ")} Vérifie les noms d'exercices tels qu'ils figurent dans la séance.`;
    }
    const nextPlan = replaceSessionInPlan(prog.plan, at, edited.session);
    const { error } = await supabase.from("programs").insert({
      user_id: ctx!.userId,
      plan: nextPlan,
      model: prog.model,
      duration_months: prog.duration_months,
    });
    if (error) return "Impossible d'enregistrer la séance pour l'instant.";
    adapted = true;
    const liste = edited.session.exercises
      .map((e) => (e.cardio ? `${e.name} ${e.duration}${e.zone ? ` (${e.zone})` : ""}` : `${e.name} ${e.sets}x${e.reps}`))
      .join(" ; ");
    return `Séance « ${edited.session.title} » (jour ${day}) mise à jour dans l'app : ${edited.changes.join(" ; ")}.${
      edited.errors.length ? ` Non appliqué : ${edited.errors.join(" ")}` : ""
    } Séance maintenant : ${liste}. Confirme au client que sa fiche séance est à jour, il n'a rien à reporter lui-même.`;
  }

  // BYOK strict : le coach IA est facturé sur la clé du tenant (coach), jamais
  // sur la clé plateforme. Sans clé configurée, on refuse proprement (400).
  const billing = await anthropicKeyForBilling(ctx.userId);
  if (billing.missing) {
    return NextResponse.json({ error: AI_NOT_CONFIGURED_MESSAGE }, { status: 400 });
  }
  const aiClient = anthropic(billing.key);
  async function callModel(msgs: Anthropic.MessageParam[]) {
    const m = await aiClient.messages.create({
      model: MODELS.coach,
      max_tokens: 2000,
      ...effortConfig(MODELS.coach, "low"),
      system,
      tools,
      messages: msgs,
    });
    coachCalls.push(apiCallOf(m));
    return m;
  }

  // Exécute l'adaptation : mémorise la contrainte + régénère le programme.
  async function runAdaptation(contrainte: string): Promise<string> {
    if (!quiz) return "Impossible d'adapter : questionnaire introuvable.";

    // Plafond hebdomadaire. Le refus est rendu au MODÈLE, pas au client : il le
    // reformule dans le ton du coach, avec le contexte de la conversation, ce
    // qu'un message d'erreur figé ne saurait pas faire. La contrainte est quand
    // même mémorisée plus bas si on passe, mais ici on n'écrit rien : un refus
    // ne doit pas laisser une adaptation à moitié appliquée.
    const quota = await checkActionLimit(
      ctx!.userId,
      "block",
      "adaptation",
      LIMIT_ADAPT_PER_WEEK,
      WEEK_MS,
    );
    if (!quota.ok) {
      return `REFUS : le client a déjà fait adapter son programme ${quota.used} fois cette semaine (maximum ${quota.max}). N'appelle plus cet outil. Explique-lui avec ménagement que son programme vient d'être retouché et qu'il faut le laisser vivre quelques séances avant de le changer encore, propose-lui d'alléger ou de remplacer les exercices qui gênent séance par séance en attendant, et invite-le à en parler à son coach : au-delà de deux adaptations en une semaine, c'est le programme entier qui mérite d'être revu par un humain. S'il évoque une douleur qui persiste, redis-lui de consulter.`;
    }

    const prev = readAdaptations(quiz.answers);
    const mergedAnswers = { ...quiz.answers, adaptations: [...prev, contrainte] };
    await supabase.from("questionnaires").update({ answers: mergedAnswers }).eq("user_id", ctx!.userId);

    const { data: equipRows } = await supabase
      .from("equipment")
      .select("name")
      .eq("user_id", ctx!.userId)
      .eq("enabled", true);
    const equipment = (equipRows ?? []).map((e) => e.name as string);

    // On ne régénère que le BLOC EN COURS (3 cycles) : un client 12 mois au
    // bloc 2 garde ses cycles passés et à venir, seuls les cycles de son bloc
    // courant sont reconstruits avec la contrainte.
    const pos = blockPosition(Math.max(1, ctx!.access.day), ctx!.access.programDays);
    const result = await generateProgram(
      {
        answers: mergedAnswers,
        trainDays: quiz.train_days ?? [],
        equipment,
        programDays: ctx!.access.programDays,
        blockIndex: pos.blockIndex,
        locale,
      },
      "low", // rapide : tenir sous ~60 s dans la requête coach (Vercel Hobby)
      billing.key,
      ctx!.profile?.tenant_id ?? null,
      genCalls,
    );

    const oldCycles = (program?.plan as Plan | undefined)?.cycles ?? [];
    const from = pos.blockIndex * CYCLES_PER_BLOCK;
    const fresh = result.plan.cycles ?? [];
    const mergedPlan: Plan = {
      ...result.plan,
      cycles: [...oldCycles.slice(0, from), ...fresh, ...oldCycles.slice(from + fresh.length)],
    };
    // duration_months conservée : sinon le prochain calcul d'accès retomberait
    // sur la durée par défaut (90 j) après une adaptation.
    await supabase.from("programs").insert({
      user_id: ctx!.userId,
      plan: mergedPlan,
      model: result.model,
      duration_months: program?.duration_months ?? null,
    });
    adapted = true;
    regenerated = true;
    return `Programme régénéré en tenant compte de : « ${contrainte} ». Les exercices contre-indiqués ont été remplacés par des alternatives sûres. Confirme-le au client et invite-le à consulter si la douleur persiste.`;
  }

  // L'HISTORIQUE N'EST PAS MIS EN CACHE, et c'est délibéré.
  //
  // Il l'a été, avec un point de reprise sur le dernier tour passé, pour ne pas
  // refacturer les vingt-quatre messages précédents à chaque nouveau message.
  // L'intention était juste, le résultat inverse : le cache fonctionne par
  // PRÉFIXE, et un point de reprise posé sur le dernier tour se déplace à
  // chaque échange. Anthropic ne retrouvait donc jamais l'entrée précédente et
  // réécrivait tout le contexte, au double du tarif plein (200 % pour une
  // écriture longue durée).
  //
  // Mesuré sur quatre messages réels : 0,062 $ d'écritures de cache sur
  // 0,071 $ de facture, soit 87 %, quand les lectures n'avaient fait gagner
  // que 0,002 $. Les mêmes messages sans aucun cache : 0,038 $. Le cache
  // coûtait presque le double de ne rien faire.
  //
  // Seul ce qui NE BOUGE PAS entre deux messages est donc mis en cache (les
  // deux blocs système ci-dessus) : là, l'écriture a lieu une fois et les
  // relectures suivantes coûtent 10 %. L'historique, lui, repasse au tarif
  // plein, ce qui reste deux fois moins cher que de le réécrire en cache.
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
    if (name === "modifier_seance") {
      return runSessionEdit(input as { jour_programme?: unknown; operations?: unknown });
    }
    if (name === "memoriser") {
      const f = (input as { fait?: string }).fait ?? "";
      return addMemoryNote(ctx!.userId, f);
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
      // 8 et non 4 : la persona demande 3 à 5 bulles, et une séance complète en
      // réclame davantage. Couper à 4 amputait la fin de réponse, obligeant le
      // client à écrire « c'est tout ? » et à repayer un message.
      messages = arr.map((m) => String(m).trim()).filter(Boolean).slice(0, MAX_BUBBLES);
    } catch {
      messages = [];
    }
    if (!messages.length) {
      messages = [raw.trim() || (adapted ? "J'ai adapté ton programme." : "Je n'ai pas de réponse pour l'instant.")];
    }
  } catch {
    // Le modèle a pu répondre plusieurs fois avant l'échec : ces appels sont
    // facturés par Anthropic. Ils entrent au journal, sans crédit ni quota,
    // sinon le client paierait un message qu'il n'a jamais reçu.
    await recordCalls(ctx.userId, "coach", coachCalls, {
      tenantId: coachTenant,
      action: "message",
      credits: 0,
      countsForQuota: false,
    }).catch(() => {});
    if (genCalls.length) {
      await recordCalls(ctx.userId, "block", genCalls, {
        tenantId: coachTenant,
        action: "adaptation",
        credits: 0,
        countsForQuota: false,
      }).catch(() => {});
    }
    return NextResponse.json(
      { error: t("srv.coachDown") },
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
  // Modèle crédits : on débite APRÈS la réponse réussie (jamais de surdébit).
  // Un crédit, quoi qu'ait fait la réponse, régénération comprise : le
  // fournisseur absorbe l'adaptation plutôt que de la facturer au client
  // blessé (voir coachUsageToCharge).
  let charged = 0;
  let supplierCharged = 0;
  for (const kind of coachUsageToCharge()) {
    const c = await chargeAiUsageDetailed(coachTenant, kind, "message", ctx.userId);
    charged += c.coach;
    supplierCharged += c.supplier;
  }
  // Enregistré APRÈS le débit : l'historique porte les crédits réellement
  // prélevés, pas une estimation refaite à côté.
  await recordCalls(ctx.userId, "coach", coachCalls, {
    tenantId: coachTenant,
    action: "message",
    credits: charged,
    supplierCredits: supplierCharged,
  });
  // La régénération est un appel de génération : elle a son propre modèle et
  // son propre tarif. Une ligne à part, donc, sans quoi le journal montre une
  // conversation qui coûte le prix d'un programme sans dire pourquoi. Zéro
  // crédit : elle n'est pas facturée, elle est absorbée, et cette ligne est ce
  // qui rend le montant absorbé lisible.
  if (genCalls.length) {
    await recordCalls(ctx.userId, "block", genCalls, {
      tenantId: coachTenant,
      action: "adaptation",
      credits: 0,
      // Une adaptation qui a échoué à mi-chemin ne doit pas manger le plafond
      // hebdomadaire : seule celle qui a abouti compte.
      countsForQuota: regenerated,
    });
  }

  // Une adaptation (jours, nutrition, blessure) a modifié programme/questionnaire :
  // on purge le cache des pages concernées pour que tout soit à jour à la nav.
  if (adapted) {
    revalidatePath("/app");
    revalidatePath("/app/agenda");
    revalidatePath("/app/seance");
    revalidatePath("/app/nutrition");
  }

  return NextResponse.json({ messages, adapted, conversationId });
}
