import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateProgram, CYCLE_DAYS, type Plan } from "@/lib/program";
import { anthropicKeyForBilling } from "@/lib/tenant";
import { checkAiAllowance, chargeAiUsage } from "@/lib/credits";
import { recordCall } from "@/lib/ratelimit";
import { programDay } from "@/lib/access";
import { subscriptionIsActive } from "@/lib/subscription";
import { programDaysForMonths, PROGRAM_DAYS, CYCLES_PER_BLOCK } from "@/lib/config";
import { coveredDays, nextBlockDue, blockProgressNote, BLOCK_LEAD_DAYS, BLOCKS_MAX_PER_RUN } from "@/lib/block-logic";

export { coveredDays, nextBlockDue, blockProgressNote, blockPosition, BLOCK_LEAD_DAYS } from "@/lib/block-logic";

// Blocs évolutifs. Un programme n'est jamais généré d'un coup au-delà de 3
// mois : le produit 12 mois enchaîne QUATRE blocs de 3 cycles, et chaque bloc
// est construit au moment voulu, à partir de ce que le client a RÉELLEMENT fait
// dans le précédent (séances validées, courbe de poids). Les cycles s'ajoutent
// à la suite dans le même plan (Cycle 4, 5, 6…), la date de départ et le
// journal ne bougent pas : c'est le même programme, qui continue.
//
// Un abonné mensuel suit la même mécanique : tant que son abonnement est actif,
// un nouveau bloc arrive quand le précédent se termine.

export type AppendResult =
  | { ok: true; blockIndex: number; cycles: number }
  | { ok: false; reason: "not_due" | "no_program" | "no_quiz" | "no_key" | "no_credits" | "failed" };

interface ProfileRow {
  id: string;
  tenant_id: string | null;
  start_date: string | null;
  paid: boolean;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
}

/**
 * Construit et ajoute le bloc suivant d'un client. Ne redémarre RIEN : la date
 * de départ, le journal des séances et les pesées restent. Idempotent au sens
 * utile : si le bloc n'est pas dû, on ne génère pas.
 *
 * `force` ignore l'avance de préparation (demande explicite du client depuis
 * l'app quand le cron n'est pas encore passé), jamais la règle « rien à couvrir ».
 */
export async function appendNextBlock(userId: string, force = false): Promise<AppendResult> {
  const admin = createAdminClient();
  try {
    const [{ data: profile }, { data: prog }, { data: quiz }, { data: equipRows }] = await Promise.all([
      admin
        .from("profiles")
        .select("id, tenant_id, start_date, paid, subscription_id, subscription_status, subscription_current_period_end")
        .eq("id", userId)
        .maybeSingle<ProfileRow>(),
      admin
        .from("programs")
        .select("id, plan, duration_months")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; plan: Plan; duration_months: number | null }>(),
      admin
        .from("questionnaires")
        .select("answers, train_days")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>(),
      admin.from("equipment").select("name").eq("user_id", userId).eq("enabled", true),
    ]);

    if (!profile?.paid || !profile.start_date) return { ok: false, reason: "no_program" };
    if (!prog?.plan) return { ok: false, reason: "no_program" };
    if (!quiz) return { ok: false, reason: "no_quiz" };

    const now = new Date();
    const day = programDay(new Date(profile.start_date), now);
    const covered = coveredDays(prog.plan);
    const programDays = prog.duration_months ? programDaysForMonths(prog.duration_months) : PROGRAM_DAYS;
    const subscribed =
      !!profile.subscription_id &&
      subscriptionIsActive(profile.subscription_status, profile.subscription_current_period_end, now);

    if (!nextBlockDue({ day, covered, programDays, subscribed, lead: force ? 0 : BLOCK_LEAD_DAYS })) {
      return { ok: false, reason: "not_due" };
    }

    // Bloc à construire = celui qui suit les cycles déjà présents.
    const blockIndex = Math.floor((prog.plan.cycles?.length ?? 0) / CYCLES_PER_BLOCK);
    const blockStart = covered - CYCLES_PER_BLOCK * CYCLE_DAYS + 1;

    // Vécu du bloc qui s'achève : séances validées et poids sur sa fenêtre.
    const [{ count: doneInBlock }, { data: weights }] = await Promise.all([
      admin
        .from("session_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("day", Math.max(1, blockStart))
        .lte("day", covered),
      admin
        .from("weights")
        .select("kg, measured_at")
        .eq("user_id", userId)
        .order("measured_at", { ascending: true })
        .returns<{ kg: number; measured_at: string }[]>(),
    ]);
    const trainDays = quiz.train_days ?? [];
    const firstKg = weights?.[0]?.kg ?? null;
    const lastKg = weights && weights.length ? weights[weights.length - 1].kg : null;
    const note = blockProgressNote({
      blockIndex: Math.max(0, blockIndex - 1),
      doneInBlock: doneInBlock ?? 0,
      trainDaysPerWeek: trainDays.length,
      firstKg,
      lastKg,
    });

    // BYOK strict : la génération est facturée au coach, jamais à la plateforme.
    const billing = await anthropicKeyForBilling(userId);
    if (billing.missing) return { ok: false, reason: "no_key" };

    // Crédits : un bloc = une génération = N crédits IA, à chaque étage concerné.
    const coachTenant = profile.tenant_id;
    const allowance = await checkAiAllowance(coachTenant, "program");
    if (!allowance.ok) return { ok: false, reason: "no_credits" };

    const equipment = (equipRows ?? []).map((e) => (e as { name: string }).name);
    const result = await generateProgram(
      {
        answers: quiz.answers,
        trainDays,
        equipment,
        priorCycleNote: note,
        // Un abonné au-delà de la durée du produit continue sur l'échelle de
        // l'année (Construction, Intensité, Réalisation, en boucle).
        programDays: Math.max(programDays, (blockIndex + 1) * CYCLES_PER_BLOCK * CYCLE_DAYS),
        blockIndex,
      },
      "medium",
      billing.key,
      coachTenant,
    );

    // Le nouveau bloc s'AJOUTE : mêmes titres de séances (gabarit), nutrition
    // et résumé du bloc courant, cycles à la suite.
    const merged: Plan = {
      ...result.plan,
      cycles: [...(prog.plan.cycles ?? []), ...(result.plan.cycles ?? [])],
    };
    const { error: insErr } = await admin.from("programs").insert({
      user_id: userId,
      plan: merged,
      model: result.model,
      duration_months: prog.duration_months,
    });
    if (insErr) return { ok: false, reason: "failed" };

    await recordCall(userId, "block", result.usage);
    await chargeAiUsage(coachTenant, "program", "block", userId);

    return { ok: true, blockIndex, cycles: result.plan.cycles?.length ?? 0 };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

interface CandidateRow {
  id: string;
  start_date: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
}

/**
 * Passage quotidien (cron) : construit le bloc suivant de chaque client dont la
 * fin de bloc approche. Best-effort, plafonné par passage ; un client non servi
 * aujourd'hui l'est demain, et peut de toute façon le demander depuis l'app.
 */
export async function autoAppendBlocks(): Promise<{ checked: number; appended: number; skipped: Record<string, number> }> {
  const admin = createAdminClient();
  const now = new Date();
  const { data: rows } = await admin
    .from("profiles")
    .select("id, start_date, subscription_id, subscription_status, subscription_current_period_end")
    .eq("paid", true)
    .not("start_date", "is", null)
    .returns<CandidateRow[]>();

  let checked = 0;
  let appended = 0;
  const skipped: Record<string, number> = {};
  for (const r of rows ?? []) {
    if (appended >= BLOCKS_MAX_PER_RUN) break;
    if (!r.start_date) continue;
    const day = programDay(new Date(r.start_date), now);
    if (day < 1) continue;

    const { data: prog } = await admin
      .from("programs")
      .select("plan, duration_months")
      .eq("user_id", r.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ plan: Pick<Plan, "cycles">; duration_months: number | null }>();
    if (!prog) continue;
    checked++;

    const covered = coveredDays(prog.plan);
    const programDays = prog.duration_months ? programDaysForMonths(prog.duration_months) : PROGRAM_DAYS;
    const subscribed =
      !!r.subscription_id && subscriptionIsActive(r.subscription_status, r.subscription_current_period_end, now);
    if (!nextBlockDue({ day, covered, programDays, subscribed })) continue;

    const res = await appendNextBlock(r.id);
    if (res.ok) appended++;
    else skipped[res.reason] = (skipped[res.reason] ?? 0) + 1;
  }
  return { checked, appended, skipped };
}
