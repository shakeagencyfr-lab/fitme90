import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateProgram } from "@/lib/program";
import { anthropicKeyForBilling } from "@/lib/tenant";
import { subscriptionIsActive } from "@/lib/subscription";

// Régénération automatique du cycle (Lot ④) — abonnements. À chaque nouveau
// cycle (~4 semaines) d'un abonné EN RÈGLE, on régénère un programme frais qui
// tient compte du cycle précédent (assiduité, évolution du poids), puis on
// redémarre le cycle (start_date du jour) et on repart d'un journal de séances
// vierge. L'historique long terme (poids, mensurations) est conservé.

/** Durée d'un cycle avant régénération (jours). ≈ 4 semaines. */
export const REGEN_CYCLE_DAYS = 28;

/** Sécurité : nombre max de régénérations par passage de cron (coût + temps). */
export const REGEN_MAX_PER_RUN = 8;

function daysSince(iso: string | null, now: Date): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

/** Construit la note de progression à partir du cycle qui s'achève. */
function priorCycleNote(done: number, trainDaysCount: number, firstKg: number | null, lastKg: number | null): string {
  const expected = Math.max(1, trainDaysCount || 3) * 4;
  const pct = Math.round((done / expected) * 100);
  const assiduite = pct >= 80 ? "très bonne" : pct >= 50 ? "correcte" : "faible";
  let weight = "";
  if (firstKg != null && lastKg != null && firstKg !== lastKg) {
    const delta = +(lastKg - firstKg).toFixed(1);
    weight = ` Poids passé de ${firstKg} à ${lastKg} kg (${delta > 0 ? "+" : ""}${delta} kg).`;
  } else if (lastKg != null) {
    weight = ` Poids actuel ${lastKg} kg.`;
  }
  return `Cycle précédent : ${done} séance(s) réalisée(s) sur ~${expected} prévues, assiduité ${assiduite} (${pct}%).${weight} Si l'assiduité est bonne, augmente le volume, la charge visée et la complexité ; si elle est faible, simplifie, raccourcis et remotive.`;
}

interface RegenProfile {
  id: string;
  tenant_id: string | null;
  start_date: string | null;
  paid: boolean;
}

/**
 * Régénère le cycle d'un client abonné. Retourne true si un nouveau programme a
 * été écrit. Best-effort : renvoie false en cas d'échec (jamais d'exception).
 */
export async function regenerateCycleForUser(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  try {
    const [{ data: profile }, { data: prog }, { data: quiz }, { data: equipRows }, { count: doneCount }, { data: weights }] =
      await Promise.all([
        admin.from("profiles").select("id, tenant_id, start_date, paid").eq("id", userId).maybeSingle<RegenProfile>(),
        admin
          .from("programs")
          .select("duration_months")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ duration_months: number | null }>(),
        admin
          .from("questionnaires")
          .select("answers, train_days")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>(),
        admin.from("equipment").select("name").eq("user_id", userId).eq("enabled", true),
        admin.from("session_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
        admin
          .from("weights")
          .select("kg, measured_at")
          .eq("user_id", userId)
          .order("measured_at", { ascending: true })
          .returns<{ kg: number; measured_at: string }[]>(),
      ]);

    if (!profile || !quiz) return false;

    const trainDays = quiz.train_days ?? [];
    const equipment = (equipRows ?? []).map((e) => (e as { name: string }).name);
    const first = weights?.[0]?.kg ?? null;
    const last = weights && weights.length ? weights[weights.length - 1].kg : null;
    const note = priorCycleNote(doneCount ?? 0, trainDays.length, first, last);

    // BYOK strict : la régénération automatique est facturée au coach. Sans clé
    // tenant valide, on NE régénère PAS (jamais de repli silencieux sur la clé
    // plateforme en tâche de fond). Le cycle du client sera régénéré au prochain
    // passage, une fois la clé du coach configurée.
    const billing = await anthropicKeyForBilling(userId);
    if (billing.missing) return false;
    const result = await generateProgram(
      { answers: quiz.answers, trainDays, equipment, priorCycleNote: note },
      "medium",
      billing.key,
      profile.tenant_id,
    );

    const { error: insErr } = await admin.from("programs").insert({
      user_id: userId,
      plan: result.plan,
      model: result.model,
      duration_months: prog?.duration_months ?? null,
    });
    if (insErr) return false;

    // Nouveau cycle : on redémarre aujourd'hui et on repart d'un journal vierge
    // (les pesées et mensurations, elles, sont conservées pour l'évolution long
    // terme visible côté coach).
    const today = new Date().toISOString().slice(0, 10);
    await admin.from("profiles").update({ start_date: today }).eq("id", userId);
    await admin.from("session_logs").delete().eq("user_id", userId);

    return true;
  } catch {
    return false;
  }
}

interface SubRow {
  id: string;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  start_date: string | null;
}

/**
 * Régénère le cycle de tous les abonnés EN RÈGLE dont le cycle courant est
 * arrivé à terme (≈ 4 semaines depuis le dernier programme). Appelée par le cron
 * de facturation, après la synchro des abonnements. Retourne des compteurs.
 */
export async function autoRegenSubscribers(): Promise<{ checked: number; regenerated: number }> {
  const admin = createAdminClient();
  const now = new Date();

  const { data: subs } = await admin
    .from("profiles")
    .select("id, subscription_id, subscription_status, subscription_current_period_end, start_date")
    .not("subscription_id", "is", null)
    .returns<SubRow[]>();

  let checked = 0;
  let regenerated = 0;
  for (const s of subs ?? []) {
    if (regenerated >= REGEN_MAX_PER_RUN) break;
    // Uniquement les abonnements en règle (paiement à jour) et déjà démarrés.
    if (!subscriptionIsActive(s.subscription_status, s.subscription_current_period_end, now)) continue;
    if (!s.start_date) continue;
    checked++;

    // Cycle courant terminé ? On se base sur l'âge du dernier programme.
    const { data: lastProg } = await admin
      .from("programs")
      .select("created_at")
      .eq("user_id", s.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ created_at: string }>();
    if (daysSince(lastProg?.created_at ?? null, now) < REGEN_CYCLE_DAYS) continue;

    if (await regenerateCycleForUser(s.id)) regenerated++;
  }

  return { checked, regenerated };
}
