import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// QUOTA JOURNALIER d'actions IA par client. Réglé par le coach, PAR OFFRE
// (« Coach IA » coché sur le plan → quota de messages/jour), à défaut par sa
// configuration générale, et plafonné par son revendeur quand celui-ci fournit
// l'IA. Le compteur se remet au quota chaque jour à minuit (heure de Paris) :
// rien ne s'accumule, 20 par jour et 7 restants ce soir font 20 demain matin,
// pas 27. Le coach n'est débité que de ce que le client utilise réellement.

export const DEFAULT_COACH_AI_DAILY_LIMIT = 60;
export const DEFAULT_RECIPE_AI_DAILY_LIMIT = 1;
const TZ = "Europe/Paris";

// Combine deux plafonds (0 = illimité) : la contrainte la plus stricte gagne.
function tighter(a: number, b: number): number {
  if (a <= 0) return Math.max(0, b);
  if (b <= 0) return a;
  return Math.min(a, b);
}

/** Décalage (ms) entre l'heure UTC et l'heure de Paris à l'instant donné. */
function parisOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - at.getTime();
}

/** Minuit (heure de Paris) du jour courant, en Date UTC. Logique pure. */
export function parisDayStart(now: Date = new Date()): Date {
  const offset = parisOffsetMs(now);
  const local = new Date(now.getTime() + offset);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(startLocal - offset);
}

/** Prochain minuit (heure de Paris) : l'instant où le quota se remet à plein. */
export function parisNextDayStart(now: Date = new Date()): Date {
  const start = parisDayStart(now);
  // +24 h puis recalage : couvre les changements d'heure (23 h ou 25 h).
  return parisDayStart(new Date(start.getTime() + 26 * 3_600_000));
}

/**
 * Quota journalier effectif d'un client (0 = illimité) : celui de SON offre si
 * elle en fixe un, sinon celui de la configuration du coach, le tout plafonné
 * par le revendeur fournisseur d'IA.
 */
export async function coachAiDailyLimit(tenantId: string | null, userId?: string | null): Promise<number> {
  if (!tenantId) return DEFAULT_COACH_AI_DAILY_LIMIT;
  const admin = createAdminClient();

  let offerLimit: number | null = null;
  if (userId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("selected_offer_id")
      .eq("id", userId)
      .maybeSingle<{ selected_offer_id: string | null }>();
    if (prof?.selected_offer_id) {
      const { data: offer } = await admin
        .from("offers")
        .select("coach_ai_daily_limit")
        .eq("id", prof.selected_offer_id)
        .maybeSingle<{ coach_ai_daily_limit: number | null }>();
      if (offer?.coach_ai_daily_limit != null) offerLimit = Math.max(0, offer.coach_ai_daily_limit);
    }
  }

  const { data } = await admin
    .from("coach_config")
    .select("coach_ai_daily_limit")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ coach_ai_daily_limit: number | null }>();
  const coachDefault = data?.coach_ai_daily_limit == null ? DEFAULT_COACH_AI_DAILY_LIMIT : Math.max(0, data.coach_ai_daily_limit);
  const coachLimit = offerLimit ?? coachDefault;

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

/**
 * Plafond journalier de régénérations de recettes par client (0 = illimité).
 * Porté par l'OFFRE du client, comme le quota de messages ; à défaut, l'ancien
 * réglage global du coach, puis la constante.
 */
export async function recipeAiDailyLimit(tenantId: string | null, userId?: string | null): Promise<number> {
  if (!tenantId) return DEFAULT_RECIPE_AI_DAILY_LIMIT;
  const admin = createAdminClient();

  if (userId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("selected_offer_id")
      .eq("id", userId)
      .maybeSingle<{ selected_offer_id: string | null }>();
    if (prof?.selected_offer_id) {
      const { data: offer } = await admin
        .from("offers")
        .select("recipe_ai_daily_limit")
        .eq("id", prof.selected_offer_id)
        .maybeSingle<{ recipe_ai_daily_limit: number | null }>();
      if (offer?.recipe_ai_daily_limit != null) return Math.max(0, offer.recipe_ai_daily_limit);
    }
  }

  // Repli : valeur historique du coach, conservée pour ne rien casser sur les
  // comptes réglés avant que le plafond ne passe dans l'offre.
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
  /** Restant aujourd'hui (Infinity si illimité). */
  remaining: number;
  /** Instant du prochain renouvellement (minuit, heure de Paris). */
  resetsAt: string;
}

/** Compte les appels d'une route depuis minuit (Paris) et compare à la limite. */
async function checkRouteBudget(userId: string, route: string, limit: number): Promise<BudgetState> {
  const resetsAt = parisNextDayStart().toISOString();
  if (limit <= 0) return { ok: true, used: 0, limit: 0, remaining: Infinity, resetsAt };
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("route", route)
    .gte("created_at", parisDayStart().toISOString());
  const used = count ?? 0;
  return { ok: used < limit, used, limit, remaining: Math.max(0, limit - used), resetsAt };
}

/**
 * Quota du jour du Coach IA pour un client (route "coach" : messages du chat
 * et alternatives d'exercice). Les recettes ont leur propre plafond.
 */
export async function checkCoachAiBudget(userId: string, tenantId: string | null): Promise<BudgetState> {
  return checkRouteBudget(userId, "coach", await coachAiDailyLimit(tenantId, userId));
}

/** Budget des régénérations de recettes du jour pour un client (route "recipes"). */
export async function checkRecipeAiBudget(userId: string, tenantId: string | null): Promise<BudgetState> {
  return checkRouteBudget(userId, "recipes", await recipeAiDailyLimit(tenantId, userId));
}
