import { NextResponse } from "next/server";
import { makeT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCalls } from "@/lib/ratelimit";
import { screen, type QuizHealthAnswers } from "@/lib/screening";
import { generateProgram } from "@/lib/program";
import type { ApiCall } from "@/lib/anthropic";
import { anthropicKeyForBilling, AI_NOT_CONFIGURED_MESSAGE } from "@/lib/tenant";
import { clientOffer } from "@/lib/offers";
import { checkAiAllowance, chargeAiUsage } from "@/lib/credits";
import { LIMIT_GENERATE_TOTAL, programDaysForMonths } from "@/lib/config";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { todayIso } from "@/lib/local-date";

export const runtime = "nodejs";
export const maxDuration = 300; // génération longue : jusqu'à 5 min

// Ordre imposé (BUILD_PLAN étape 4/6) : session → paiement → rate limit →
// validation/garde santé → appel modèle → validation JSON → écriture → réponse.
export async function POST() {
  // 1. Session
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // 2. Paiement (côté serveur, jamais un bouton masqué)
  if (ctx.access.phase === "not_paid") {
    return NextResponse.json(
      { error: t("srv.notPaid") },
      { status: 402 },
    );
  }
  if (ctx.access.phase === "ended") {
    return NextResponse.json(
      { error: t("srv.accessEnded") },
      { status: 403 },
    );
  }
  if (ctx.access.restricted) {
    return NextResponse.json(
      { error: t("srv.subPending") },
      { status: 402 },
    );
  }

  // 2b. Un programme existe déjà : on ne le régénère pas. La page de
  // génération se relançait à chaque visite (retour arrière, rechargement,
  // passage par la salle) tant que le programme n'avait pas commencé, et
  // chaque passage coûtait une génération au coach. Le client a son plan,
  // on le renvoie dessus.
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("programs")
    .select("id")
    .eq("user_id", ctx.userId)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (existing) {
    return NextResponse.json({ error: "already_generated" }, { status: 409 });
  }

  // 2c. Une génération est déjà en cours pour ce compte (deux onglets, un
  // rechargement pendant l'attente) : on ne lance pas la deuxième. Le verrou
  // est posé par un UPDATE conditionnel, donc sans course entre deux appels
  // simultanés ; il expire de lui-même passé le délai maximal de la route.
  const lockCutoff = new Date(Date.now() - 6 * 60 * 1000).toISOString();
  const { count: locked } = await admin
    .from("profiles")
    .update({ generating_since: new Date().toISOString() }, { count: "exact" })
    .eq("id", ctx.userId)
    .or(`generating_since.is.null,generating_since.lt.${lockCutoff}`);
  if (!locked) {
    return NextResponse.json({ error: "generation_in_progress" }, { status: 423 });
  }
  const releaseLock = async () => {
    await admin.from("profiles").update({ generating_since: null }).eq("id", ctx.userId);
  };

  try {
    return await generateForClient(ctx, t, admin);
  } finally {
    await releaseLock().catch(() => {});
  }
}

async function generateForClient(
  ctx: NonNullable<Awaited<ReturnType<typeof getSessionContext>>>,
  t: ReturnType<typeof makeT>,
  admin: ReturnType<typeof createAdminClient>,
) {
  // 3. Rate limit (plafond total d'appels de génération)
  const limit = await checkLimit(ctx.userId, "generate", LIMIT_GENERATE_TOTAL);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: t("srv.genLimit", { n: limit.max }),
      },
      { status: 429 },
    );
  }

  // 4a. Charger le questionnaire et le matériel validé
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers, train_days")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>();

  if (!quiz) {
    return NextResponse.json(
      { error: t("srv.quizFirst") },
      { status: 400 },
    );
  }

  // 4b. GARDE-FOU MÉDICAL, version consentement éclairé (aussi côté serveur) :
  // une situation de santé déclarée n'empêche PLUS la génération, mais exige la
  // signature d'une décharge. Si elle manque, on la réclame ; sinon on continue.
  const health = quiz.answers as QuizHealthAnswers;
  const verdict = screen(health);
  if (verdict.hold) {
    await admin.from("profiles").update({ medical_hold: true }).eq("id", ctx.userId);
    if (!ctx.profile?.medical_ack_at) {
      return NextResponse.json(
        { error: "medical_waiver_required", reasons: verdict.reasons },
        { status: 403 },
      );
    }
  }

  const { data: equipRows } = await supabase
    .from("equipment")
    .select("name, enabled")
    .eq("user_id", ctx.userId)
    .eq("enabled", true);
  const equipment = (equipRows ?? []).map((e) => e.name as string);

  // BYOK strict : on facture la clé du coach, jamais celle de la plateforme.
  const billing = await anthropicKeyForBilling(ctx.userId);
  if (billing.missing) {
    return NextResponse.json({ error: AI_NOT_CONFIGURED_MESSAGE }, { status: 400 });
  }

  // Modèle crédits : une génération coûte N crédits IA (réglé par le
  // fournisseur). On vérifie le solde avant l'appel, on débite après succès
  // (jamais de surdébit).
  const coachTenant = ctx.profile?.tenant_id ?? null;
  const allowance = await checkAiAllowance(coachTenant, "program");
  if (!allowance.ok) return NextResponse.json({ error: allowance.error }, { status: 402 });

  // 5-6. Appel modèle + validation JSON. La durée de l'offre achetée détermine
  // le nombre de cycles générés (1 mois = 1 cycle, 3 mois = 3, 6 mois = 6).
  const offer = await clientOffer(ctx.userId);
  const programDays = offer?.duration_months
    ? programDaysForMonths(offer.duration_months)
    : undefined;
  let result;
  // Rempli au fil des appels, y compris quand la génération échoue : Anthropic
  // facture ce qu'elle a produit, même si nous n'avons rien pu en faire.
  const journal: ApiCall[] = [];
  try {
    result = await generateProgram(
      {
        answers: quiz.answers,
        trainDays: quiz.train_days ?? [],
        equipment,
        programDays,
        locale: await resolveLocale(await userLocale(ctx.userId)),
      },
      "high",
      billing.key,
      ctx.profile?.tenant_id ?? null,
      journal,
    );
  } catch {
    // Zéro crédit et hors quota : le client n'a pas eu son programme, il ne
    // doit ni payer ni perdre son droit à générer. La dépense, elle, se voit.
    await recordCalls(ctx.userId, "generate", journal, {
      tenantId: coachTenant,
      action: "generation",
      credits: 0,
      countsForQuota: false,
    }).catch(() => {});
    return NextResponse.json(
      { error: t("srv.genFailed") },
      { status: 502 },
    );
  }

  // 7. Écriture : programme + start_date (posée UNE fois, à la 1re génération).
  // Durée : celle de l'offre achetée (sinon défaut 3 mois via NULL).
  const { error: insErr } = await supabase.from("programs").insert({
    user_id: ctx.userId,
    plan: result.plan,
    model: result.model,
    duration_months: offer?.duration_months ?? null,
  });
  if (insErr) {
    return NextResponse.json(
      { error: t("srv.saveFailed") },
      { status: 500 },
    );
  }

  let startDate = ctx.profile?.start_date ?? null;
  if (!startDate) {
    // Date de début choisie au questionnaire (vrai calendrier). On la retient si
    // elle est valide et pas dans le passé ; sinon on démarre aujourd'hui.
    const today = todayIso();
    const picked =
      typeof quiz.answers?.start_date === "string" ? quiz.answers.start_date.slice(0, 10) : "";
    startDate = /^\d{4}-\d{2}-\d{2}$/.test(picked) && picked >= today ? picked : today;
    await admin.from("profiles").update({ start_date: startDate }).eq("id", ctx.userId);
  }

  // Poids de départ = 1er point de la courbe d'évolution, sans saisie manuelle.
  // Posé une seule fois, daté du début de programme, si aucune pesée n'existe.
  const startWeight = Number(String(quiz.answers?.weight ?? "").replace(",", "."));
  if (startDate && startWeight >= 20 && startWeight <= 400) {
    const { data: anyWeight } = await admin
      .from("weights")
      .select("id")
      .eq("user_id", ctx.userId)
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (!anyWeight) {
      await admin
        .from("weights")
        .insert({ user_id: ctx.userId, kg: startWeight, measured_at: startDate });
    }
  }

  // Une ligne par appel réellement passé : la relance dont le plan a été jeté
  // apparaît à côté de celui qui a été retenu, avec son propre coût.
  await recordCalls(ctx.userId, "generate", result.calls, {
    tenantId: coachTenant,
    action: "generation",
    credits: allowance.coachCost,
    supplierCredits: allowance.resellerCost,
  });
  await chargeAiUsage(coachTenant, "program", "generate", ctx.userId);

  return NextResponse.json({ plan: result.plan });
}
