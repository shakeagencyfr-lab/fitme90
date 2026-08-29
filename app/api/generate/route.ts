import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { checkLimit, recordCall } from "@/lib/ratelimit";
import { screen, type QuizHealthAnswers } from "@/lib/screening";
import { generateProgram } from "@/lib/program";
import { tenantAnthropicKey } from "@/lib/tenant";
import { LIMIT_GENERATE_TOTAL } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 300; // génération longue : jusqu'à 5 min

// Ordre imposé (BUILD_PLAN étape 4/6) : session → paiement → rate limit →
// validation/garde santé → appel modèle → validation JSON → écriture → réponse.
export async function POST() {
  // 1. Session
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // 2. Paiement (côté serveur, jamais un bouton masqué)
  if (ctx.access.phase === "not_paid") {
    return NextResponse.json(
      { error: "Programme non débloqué. Le paiement est requis." },
      { status: 402 },
    );
  }
  if (ctx.access.phase === "ended") {
    return NextResponse.json(
      { error: "Ton accès au programme est terminé." },
      { status: 403 },
    );
  }

  // 3. Rate limit (plafond total d'appels de génération)
  const limit = await checkLimit(ctx.userId, "generate", LIMIT_GENERATE_TOTAL);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Limite de générations atteinte (${limit.max}). Contacte le support si c'est une erreur technique.`,
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
      { error: "Réponds d'abord au questionnaire." },
      { status: 400 },
    );
  }

  // 4b. GARDE-FOU MÉDICAL, version consentement éclairé (aussi côté serveur) :
  // une situation de santé déclarée n'empêche PLUS la génération, mais exige la
  // signature d'une décharge. Si elle manque, on la réclame ; sinon on continue.
  const health = quiz.answers as QuizHealthAnswers;
  const verdict = screen(health);
  if (verdict.hold) {
    const admin = createAdminClient();
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

  // 5-6. Appel modèle + validation JSON
  let result;
  try {
    result = await generateProgram(
      {
        answers: quiz.answers,
        trainDays: quiz.train_days ?? [],
        equipment,
      },
      "high",
      (await tenantAnthropicKey(ctx.userId)) ?? undefined,
    );
  } catch {
    return NextResponse.json(
      { error: "La génération a échoué. Réessaie dans un instant." },
      { status: 502 },
    );
  }

  // 7. Écriture : programme + start_date (posée UNE fois, à la 1re génération)
  const admin = createAdminClient();
  const { error: insErr } = await supabase.from("programs").insert({
    user_id: ctx.userId,
    plan: result.plan,
    model: result.model,
  });
  if (insErr) {
    return NextResponse.json(
      { error: "Impossible d'enregistrer le programme." },
      { status: 500 },
    );
  }

  let startDate = ctx.profile?.start_date ?? null;
  if (!startDate) {
    // Date de début choisie au questionnaire (vrai calendrier). On la retient si
    // elle est valide et pas dans le passé ; sinon on démarre aujourd'hui.
    const today = new Date().toISOString().slice(0, 10);
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

  await recordCall(ctx.userId, "generate", result.usage);

  return NextResponse.json({ plan: result.plan });
}
