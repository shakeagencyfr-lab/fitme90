import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAY_MS } from "@/lib/ratelimit";

// Budget journalier partagé du Coach IA (messages + régénération de recettes),
// PAR CLIENT, réglé par le coach pour maîtriser le coût IA (BYOK). Les deux
// routes (coach, recipes) consomment le même compteur quotidien.

/** Routes comptées dans le budget Coach IA. */
const BUDGET_ROUTES = ["coach", "recipes"] as const;

export const DEFAULT_COACH_AI_DAILY_LIMIT = 60;

/** Limite journalière configurée par le coach (0 = illimité). */
export async function coachAiDailyLimit(tenantId: string | null): Promise<number> {
  if (!tenantId) return DEFAULT_COACH_AI_DAILY_LIMIT;
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_config")
    .select("coach_ai_daily_limit")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ coach_ai_daily_limit: number | null }>();
  const v = data?.coach_ai_daily_limit;
  return v == null ? DEFAULT_COACH_AI_DAILY_LIMIT : Math.max(0, v);
}

export interface BudgetState {
  ok: boolean;
  used: number;
  limit: number; // 0 = illimité
}

/**
 * Vérifie le budget Coach IA du jour pour un client. Compte les appels coach +
 * recettes des dernières 24 h et compare à la limite configurée par son coach.
 */
export async function checkCoachAiBudget(userId: string, tenantId: string | null): Promise<BudgetState> {
  const limit = await coachAiDailyLimit(tenantId);
  if (limit <= 0) return { ok: true, used: 0, limit: 0 }; // illimité

  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("route", BUDGET_ROUTES as unknown as string[])
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
  const used = count ?? 0;
  return { ok: used < limit, used, limit };
}
