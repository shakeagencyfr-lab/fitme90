import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Rate limit minimal sans dépendance : table ai_calls + compte glissant.
// L'accès à ai_calls passe par le service role (le client n'y a aucun droit,
// cf. schema.sql), donc impossible à contourner en supprimant ses lignes.

/** `block` = génération d'un bloc suivant (même modèle que `generate`, compté à part pour ne pas consommer le plafond de premières générations). */
export type AiRoute = "generate" | "block" | "coach" | "recipes" | "analyze-gym" | "exercise";

/** Nombre d'appels de l'utilisateur sur `route` depuis `sinceMs` (ou au total). */
async function countCalls(
  userId: string,
  route: AiRoute,
  sinceMs?: number,
  action?: AiAction,
): Promise<number> {
  const admin = createAdminClient();
  let query = admin
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("route", route);
  // Deux choses très différentes partagent le seau `block` : la génération
  // automatique du bloc suivant (mensuelle, à l'initiative du système) et
  // l'adaptation demandée par un client blessé. Les compter ensemble ferait
  // manger le quota de l'une par l'autre.
  if (action) query = query.eq("action", action);
  if (sinceMs) {
    query = query.gte("created_at", new Date(Date.now() - sinceMs).toISOString());
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Vérifie un plafond. `windowMs` absent = plafond total (ex. génération).
 * Retourne { ok } ; si !ok, l'appelant renvoie 429.
 */
export async function checkLimit(
  userId: string,
  route: AiRoute,
  max: number,
  windowMs?: number,
): Promise<{ ok: boolean; used: number; max: number }> {
  const used = await countCalls(userId, route, windowMs);
  return { ok: used < max, used, max };
}

/**
 * Le même plafond, restreint à UNE action précise du seau. Sert quand deux
 * usages partagent une route mais pas leur quota (l'adaptation demandée par le
 * client et la génération automatique du bloc suivant, toutes deux `block`).
 */
export async function checkActionLimit(
  userId: string,
  route: AiRoute,
  action: AiAction,
  max: number,
  windowMs?: number,
): Promise<{ ok: boolean; used: number; max: number }> {
  const used = await countCalls(userId, route, windowMs, action);
  return { ok: used < max, used, max };
}

/**
 * Action métier à l'origine de l'appel. Distincte de `route`, qui reste le seau
 * de quota : la fiche exercice compte dans le plafond « coach » sans être un
 * message, et le résumé de mémoire tourne la nuit sans utilisateur devant.
 */
export type AiAction =
  | "message"
  | "recette"
  | "recette-photo"
  | "alternative"
  | "fiche-exercice"
  | "generation"
  | "bloc"
  /** Régénération déclenchée depuis le chat parce que le client s'est blessé. */
  | "adaptation"
  | "analyse-salle"
  | "memoire";

export interface CallMeta {
  /** Tenant de l'appelant, dénormalisé : l'historique réseau se lit sans jointure. */
  tenantId?: string | null;
  /** Modèle réellement appelé (ne plus le déduire du route). */
  model?: string | null;
  action?: AiAction;
  /** Crédits débités par cette action (0 en BYOK). */
  credits?: number | null;
}

/** Enregistre un appel effectué (après succès de l'appel externe). */
export async function recordCall(
  userId: string,
  route: AiRoute,
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    /** Tokens servis par le cache de prompt (facturés 10 % d'un token d'entrée). */
    cache_read_tokens?: number;
    /** Tokens écrits dans le cache 5 minutes (facturés 125 %). */
    cache_write_tokens?: number;
    /** Tokens écrits dans le cache 1 heure (facturés 200 %). */
    cache_write_1h_tokens?: number;
  },
  meta?: CallMeta,
): Promise<void> {
  const admin = createAdminClient();
  await admin.from("ai_calls").insert({
    user_id: userId,
    route,
    input_tokens: usage?.input_tokens ?? null,
    output_tokens: usage?.output_tokens ?? null,
    cache_read_tokens: usage?.cache_read_tokens ?? null,
    cache_write_tokens: usage?.cache_write_tokens ?? null,
    cache_write_1h_tokens: usage?.cache_write_1h_tokens ?? null,
    tenant_id: meta?.tenantId ?? null,
    model: meta?.model ?? null,
    action: meta?.action ?? null,
    credits: meta?.credits ?? null,
  });
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
