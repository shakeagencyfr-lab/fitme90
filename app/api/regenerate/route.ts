import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { screen, type QuizHealthAnswers } from "@/lib/screening";
import { generateProgram } from "@/lib/program";
import { recordCall } from "@/lib/ratelimit";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 300; // génération longue : jusqu'à 5 min

// Régénère le programme d'un client EXISTANT (sans consommer le quota de 1re
// génération). Sert surtout à obtenir des séances DISTINCTES par jour pour les
// plans créés avant cette fonctionnalité. Anti-abus : cooldown court entre deux
// régénérations.
const COOLDOWN_MS = 90_000;

export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.profile?.paid) {
    return NextResponse.json({ error: "Programme non débloqué." }, { status: 402 });
  }

  const supabase = await createClient();

  // Dernier programme : cooldown + garde-fou « existe déjà ».
  const { data: last } = await supabase
    .from("programs")
    .select("id, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; created_at: string }>();
  if (last && Date.now() - new Date(last.created_at).getTime() < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Régénération déjà lancée récemment, patiente une minute." },
      { status: 429 },
    );
  }

  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers, train_days")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>();
  if (!quiz) {
    return NextResponse.json({ error: "Réponds d'abord au questionnaire." }, { status: 400 });
  }

  // Même garde médicale que la 1re génération (décharge signée si nécessaire).
  const verdict = screen(quiz.answers as QuizHealthAnswers);
  if (verdict.hold && !ctx.profile?.medical_ack_at) {
    return NextResponse.json(
      { error: "medical_waiver_required", reasons: verdict.reasons },
      { status: 403 },
    );
  }

  const { data: equipRows } = await supabase
    .from("equipment")
    .select("name")
    .eq("user_id", ctx.userId)
    .eq("enabled", true);
  const equipment = (equipRows ?? []).map((e) => e.name as string);

  let result;
  try {
    result = await generateProgram({
      answers: quiz.answers,
      trainDays: quiz.train_days ?? [],
      equipment,
    });
  } catch {
    return NextResponse.json(
      { error: "La régénération a échoué. Réessaie dans un instant." },
      { status: 502 },
    );
  }

  const admin = createAdminClient();
  const { error: insErr } = await admin.from("programs").insert({
    user_id: ctx.userId,
    plan: result.plan,
    model: result.model,
  });
  if (insErr) {
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }

  await recordCall(ctx.userId, "generate", result.usage);

  revalidatePath("/app");
  revalidatePath("/app/agenda");
  revalidatePath("/app/seance");
  revalidatePath("/app/nutrition");

  return NextResponse.json({ ok: true, sessions: result.plan.sessions?.length ?? 1 });
}
