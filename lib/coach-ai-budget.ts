import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAY_MS } from "@/lib/ratelimit";

// Budget journalier partagé du Coach IA (messages + régénération de recettes),
// PAR CLIENT, réglé par le coach pour maîtriser le coût IA (BYOK). Les deux
// routes (coach, recipes) consomment le même compteur quotidien.

/** Routes comptées dans le budget Coach IA. */
const BUDGET_ROUTES = ["coach", "recipes"] as const;

export const DEFAULT_COACH_AI_DAILY_LIMIT = 60;

// Combine deux plafonds (0 = illimité) : la contrainte la plus stricte gagne.
function tighter(a: number, b: number): number {
  if (a <= 0) return Math.max(0, b);
  if (b <= 0) return a;
  return Math.min(a, b);
}

/**
 * Limite journalière effective par client (0 = illimité) : celle réglée par le
 * coach, PLAFONNÉE par celle imposée par son revendeur quand ce dernier fournit
 * l'IA (mode « provider »).
 */
export async function coachAiDailyLimit(tenantId: string | null): Promise<number> {
  if (!tenantId) return DEFAULT_COACH_AI_DAILY_LIMIT;
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_config")
    .select("coach_ai_daily_limit")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ coach_ai_daily_limit: number | null }>();
  const coachLimit = data?.coach_ai_daily_limit == null ? DEFAULT_COACH_AI_DAILY_LIMIT : Math.max(0, data.coach_ai_daily_limit);

  // Plafond du revendeur fournisseur d'IA.
  const { data: t } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ parent_id: string | null }>();
  if (!t?.parent_id) return coachLimit;
  const { data: parent } = await admin
    .from("tenants")
    .select("ai_mode, ai_client_daily_limit")
    .eq("id", t.parent_id)
    .maybeSingle<{ ai_mode: string | null; ai_client_daily_limit: number | null }>();
  if (parent?.ai_mode !== "provider") return coachLimit;
  return tighter(coachLimit, Math.max(0, parent.ai_client_daily_limit ?? 0));
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
