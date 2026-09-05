import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiCall, RecordedUsage } from "@/lib/anthropic";

// Rate limit minimal sans dépendance : table ai_calls + compte glissant.
// L'accès à ai_calls passe par le service role (le client n'y a aucun droit,
// cf. schema.sql), donc impossible à contourner en supprimant ses lignes.

/** `block` = génération d'un bloc suivant (même modèle que `generate`, compté à part pour ne pas consommer le plafond de premières générations). */
export type AiRoute = "generate" | "block" | "coach" | "recipes" | "analyze-gym" | "exercise" | "key-test";

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
    .eq("route", route)
    // Le journal porte une ligne par APPEL API ; le quota, lui, compte des
    // ACTIONS. Un message du chat qui déclenche deux tours d'outils écrit trois
    // lignes : sans ce filtre, il mangerait trois messages du forfait client.
    .eq("counts_for_quota", true);
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
  | "memoire"
  /** Le « ping » qui valide une clé Anthropic au moment où on l'enregistre. */
  | "verif-cle";

export interface CallMeta {
  /** Tenant de l'appelant, dénormalisé : l'historique réseau se lit sans jointure. */
  tenantId?: string | null;
  /** Modèle réellement appelé (ne plus le déduire du route). */
  model?: string | null;
  action?: AiAction;
  /** Crédits débités par cette action au compte (0 en BYOK). */
  credits?: number | null;
  /**
   * Crédits débités au FOURNISSEUR du compte par son propre fournisseur (ce
   * que la plateforme a pris au revendeur). Un revendeur en crédits
   * plateforme lit sa dépense ici, et n'a pas besoin de dollars pour ça.
   */
  supplierCredits?: number | null;
  /** Identifiant de la requête API, pour rapprocher la ligne de la facture. */
  requestId?: string | null;
  /**
   * Faux pour les appels SUPPLÉMENTAIRES d'une même action (tours d'outils,
   * relance de génération) et pour ceux dont le résultat a été jeté : ils
   * comptent au journal, jamais au quota.
   */
  countsForQuota?: boolean;
}

/** Enregistre un appel effectué (après succès de l'appel externe). */
export async function recordCall(
  userId: string,
  route: AiRoute,
  usage?: Partial<RecordedUsage>,
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
    supplier_credits: meta?.supplierCredits ?? 0,
    request_id: meta?.requestId ?? null,
    counts_for_quota: meta?.countsForQuota ?? true,
  });
}

/**
 * Journalise une SÉRIE d'appels API en une ligne chacun.
 *
 * C'est la forme normale dès qu'une action métier peut coûter plus d'un appel :
 * le chat avec ses tours d'outils, la génération avec sa relance. Additionner
 * leurs jetons dans une seule ligne, comme on le faisait, produisait deux
 * mensonges : le modèle affiché était celui du premier appel (une régénération
 * Sonnet tarifée au prix de Haiku), et un appel dont le résultat était jeté
 * disparaissait purement du journal alors qu'Anthropic l'avait facturé.
 *
 * Seule la PREMIÈRE ligne porte les crédits et compte pour le quota : les
 * suivantes sont le détail technique du même geste, pas un geste de plus.
 *
 * Une liste vide n'écrit rien : aucun appel n'a abouti, donc rien n'a été
 * facturé.
 */
export async function recordCalls(
  userId: string,
  route: AiRoute,
  calls: ApiCall[],
  meta?: Omit<CallMeta, "model" | "requestId">,
): Promise<void> {
  if (!calls.length) return;
  const admin = createAdminClient();
  await admin.from("ai_calls").insert(
    calls.map((call, i) => ({
      user_id: userId,
      route,
      input_tokens: call.usage.input_tokens,
      output_tokens: call.usage.output_tokens,
      cache_read_tokens: call.usage.cache_read_tokens,
      cache_write_tokens: call.usage.cache_write_tokens,
      cache_write_1h_tokens: call.usage.cache_write_1h_tokens,
      tenant_id: meta?.tenantId ?? null,
      model: call.model,
      action: meta?.action ?? null,
      credits: i === 0 ? (meta?.credits ?? null) : 0,
      supplier_credits: i === 0 ? (meta?.supplierCredits ?? 0) : 0,
      request_id: call.requestId,
      counts_for_quota: i === 0 ? (meta?.countsForQuota ?? true) : false,
    })),
  );
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;
