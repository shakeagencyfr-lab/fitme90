import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAY_MS } from "@/lib/ratelimit";

// Budgets journaliers PAR CLIENT, réglés par le coach pour maîtriser le coût IA
// (BYOK). Deux compteurs SÉPARÉS :
//  - le chat Coach IA (route "coach", modèle Haiku, peu coûteux) ;
//  - les régénérations de recettes (route "recipes", modèle Sonnet, plus cher),
//    bornées à un petit nombre par jour pour garantir un plafond de dépense.
// Les séparer évite qu'un client dépense tout son budget en recettes (chères).

export const DEFAULT_COACH_AI_DAILY_LIMIT = 60;
export const DEFAULT_RECIPE_AI_DAILY_LIMIT = 1;

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

/** Plafond journalier de régénérations de recettes par client (0 = illimité). */
export async function recipeAiDailyLimit(tenantId: string | null): Promise<number> {
  if (!tenantId) return DEFAULT_RECIPE_AI_DAILY_LIMIT;
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_config")
    .select("recipe_ai_daily_limit")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ recipe_ai_daily_limit: number | null }>();
  return data?.recipe_ai_daily_limit == null
    ? DEFAULT_RECIPE_AI_DAILY_LIMIT
    : Math.max(0, data.recipe_ai_daily_limit);
}

export interface BudgetState {
  ok: boolean;
  used: number;
  limit: number; // 0 = illimité
}

/** Compte les appels d'une route sur les dernières 24 h et compare à la limite. */
async function checkRouteBudget(userId: string, route: string, limit: number): Promise<BudgetState> {
  if (limit <= 0) return { ok: true, used: 0, limit: 0 }; // illimité
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("route", route)
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
  const used = count ?? 0;
  return { ok: used < limit, used, limit };
}

/**
 * Budget du CHAT Coach IA du jour pour un client (route "coach" uniquement).
 * Les recettes ont leur propre plafond (checkRecipeAiBudget).
 */
export async function checkCoachAiBudget(userId: string, tenantId: string | null): Promise<BudgetState> {
  return checkRouteBudget(userId, "coach", await coachAiDailyLimit(tenantId));
}

/** Budget des régénérations de recettes du jour pour un client (route "recipes"). */
export async function checkRecipeAiBudget(userId: string, tenantId: string | null): Promise<BudgetState> {
  return checkRouteBudget(userId, "recipes", await recipeAiDailyLimit(tenantId));
}
