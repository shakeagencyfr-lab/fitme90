import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// QUOTA JOURNALIER d'actions IA par client.
//
// UN SEUL COMPTEUR, POUR TOUT.
//
// Il y en avait deux : les messages d'un côté, les recettes de l'autre. Le
// coach devait donc régler deux nombres, et le client se heurtait à deux murs
// différents sans jamais savoir lequel il approchait. Une seule limite couvre
// désormais les trois actions que le client peut déclencher : parler au Coach
// IA, régénérer une recette, demander une alternative à un exercice.
//
// Ce que ça coûte en clarté du côté du coût : une recette coûte plus cher
// qu'un message, donc un quota unique se chiffre au prix de l'action la plus
// chère. C'est le bon compromis : un plafond légèrement pessimiste vaut mieux
// que deux réglages que personne ne comprend.
//
// Réglé par le coach PAR OFFRE, à défaut par sa configuration générale, et
// plafonné par son revendeur quand celui-ci fournit l'IA. Le compteur se remet
// au quota chaque jour à minuit (heure de Paris) : rien ne s'accumule, 20 par
// jour et 7 restants ce soir font 20 demain matin, pas 27. Le coach n'est
// débité que de ce que le client utilise réellement.

export const DEFAULT_COACH_AI_DAILY_LIMIT = 60;

/**
 * Les routes qui consomment le quota du client.
 *
 * Cette liste EST la définition de « une action IA ». Toute nouvelle route
 * déclenchée par un client doit y figurer, sans quoi elle échapperait au
 * plafond et donc à la facture que le coach croit maîtriser.
 */
export const CLIENT_AI_ROUTES = ["coach", "recipes"] as const;

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

export interface BudgetState {
  ok: boolean;
  used: number;
  limit: number; // 0 = illimité
  /** Restant aujourd'hui (Infinity si illimité). */
  remaining: number;
  /** Instant du prochain renouvellement (minuit, heure de Paris). */
  resetsAt: string;
}

/**
 * Le quota du jour d'un client : TOUTES ses actions IA confondues.
 *
 * Le comptage porte sur l'ensemble des routes clientes, pas sur une seule.
 * C'est ce qui rend la promesse tenable : « 20 actions par jour » veut dire
 * vingt, quoi qu'on en fasse, et pas vingt d'un genre plus une poignée d'un
 * autre.
 */
export async function checkClientAiBudget(userId: string, tenantId: string | null): Promise<BudgetState> {
  const limit = await coachAiDailyLimit(tenantId, userId);
  const resetsAt = parisNextDayStart().toISOString();
  if (limit <= 0) return { ok: true, used: 0, limit: 0, remaining: Infinity, resetsAt };
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("route", [...CLIENT_AI_ROUTES])
    .gte("created_at", parisDayStart().toISOString());
  const used = count ?? 0;
  return { ok: used < limit, used, limit, remaining: Math.max(0, limit - used), resetsAt };
}
