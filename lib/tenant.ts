import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODELS } from "@/lib/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret, keyHint, secretsEncryptionReady } from "@/lib/crypto";
import { attachReferral } from "@/lib/affiliation";

// BYOK STRICT (par défaut) : si le tenant n'a pas de clé Anthropic valide, on ne
// bascule PAS sur la clé plateforme (ANTHROPIC_API_KEY) pour les appels facturés
// au coach ; on refuse l'appel. Cela évite de facturer par erreur la plateforme.
// Mettre ALLOW_PLATFORM_AI_FALLBACK=1 pour autoriser le repli (déconseillé).
export const PLATFORM_AI_FALLBACK = process.env.ALLOW_PLATFORM_AI_FALLBACK === "1";
export const AI_NOT_CONFIGURED_MESSAGE =
  "L'IA n'est pas configurée pour ce coach. Le coach doit renseigner sa clé Anthropic dans son espace (Configuration IA).";

/**
 * Résout la clé Anthropic à FACTURER pour cet utilisateur (celle de son tenant).
 * `missing` vaut true si aucune clé tenant n'est disponible ET que le repli
 * plateforme est désactivé : l'appelant doit alors refuser l'appel (ne jamais
 * facturer la plateforme silencieusement).
 */
export async function anthropicKeyForBilling(
  userId: string,
): Promise<{ key: string | undefined; missing: boolean }> {
  const key = await tenantAnthropicKey(userId);
  if (key) return { key, missing: false };
  return { key: undefined, missing: !PLATFORM_AI_FALLBACK };
}

// Multi-tenant (Lot 0) : chaque coach/salle est un tenant. Ici, les helpers
// serveur pour le BYOK (Bring Your Own Key) : la clé Anthropic est propre au
// tenant, stockée chiffrée dans tenant_secrets (verrouillée au service_role).

/** tenant_id du profil de l'utilisateur (null si non rattaché). */
export async function tenantIdForUser(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null }>();
  return data?.tenant_id ?? null;
}

/**
 * Rattache un nouveau client au tenant de son coach + mémorise l'offre choisie,
 * à partir des métadonnées d'inscription (coach_slug / offer_id passées à la
 * création du compte). Idempotent : n'écrase JAMAIS un tenant/offre déjà posé,
 * et ne fait rien si les métadonnées sont absentes (inscription FitMe90 directe).
 */
export async function applyPendingCoachSelection(
  userId: string,
  meta: { coach_slug?: unknown; offer_id?: unknown; interval?: unknown; ref?: unknown } | null | undefined,
): Promise<void> {
  const slug = typeof meta?.coach_slug === "string" ? meta.coach_slug.trim() : "";
  const offerId = typeof meta?.offer_id === "string" ? meta.offer_id.trim() : "";
  const interval = meta?.interval === "year" ? "year" : meta?.interval === "month" ? "month" : "";
  const ref = typeof meta?.ref === "string" ? meta.ref.trim() : "";
  if (!slug && !offerId && !ref) return;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id, selected_offer_id, selected_interval")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null; selected_offer_id: string | null; selected_interval: string | null }>();
  // Déjà rattaché : ne rien changer.
  if (profile?.tenant_id && profile?.selected_offer_id) return;

  let tenantId: string | null = profile?.tenant_id ?? null;
  if (!tenantId && slug) {
    const { data: tenant } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();
    tenantId = tenant?.id ?? null;
  }
  if (!tenantId) return;

  // Valider que l'offre existe et appartient bien à ce tenant.
  let validOffer: string | null = profile?.selected_offer_id ?? null;
  if (!validOffer && offerId) {
    const { data: offer } = await admin
      .from("offers")
      .select("id")
      .eq("id", offerId)
      .eq("tenant_id", tenantId)
      .maybeSingle<{ id: string }>();
    validOffer = offer?.id ?? null;
  }

  const patch: Record<string, string> = {};
  if (!profile?.tenant_id) patch.tenant_id = tenantId;
  if (!profile?.selected_offer_id && validOffer) patch.selected_offer_id = validOffer;
  if (!profile?.selected_interval && interval) patch.selected_interval = interval;
  if (Object.keys(patch).length > 0) {
    await admin.from("profiles").update(patch).eq("id", userId);
  }

  // Parrainage : rattache le nouveau client à son parrain si le code est valide
  // et que l'affiliation est active pour ce coach (idempotent).
  if (ref) await attachReferral(userId, tenantId, ref);
}

async function tenantOwnKey(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("anthropic_key_enc")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ anthropic_key_enc: string | null }>();
  return decryptSecret(data?.anthropic_key_enc ?? null);
}

/**
 * Clé Anthropic (déchiffrée) à utiliser pour cet utilisateur, sinon null.
 * BYOK d'abord : la clé du tenant du client (son coach). À défaut, si le
 * revendeur parent est en mode « provider » (revendeur IA), on utilise SA clé —
 * c'est lui qui fournit et facture l'IA à ses coachs.
 */
export async function tenantAnthropicKey(userId: string): Promise<string | null> {
  const tenantId = await tenantIdForUser(userId);
  if (!tenantId) return null;

  const own = await tenantOwnKey(tenantId);
  if (own) return own;

  // Repli : clé du revendeur parent s'il est fournisseur d'IA.
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ parent_id: string | null }>();
  if (!t?.parent_id) return null;
  const { data: parent } = await admin
    .from("tenants")
    .select("ai_mode")
    .eq("id", t.parent_id)
    .maybeSingle<{ ai_mode: string | null }>();
  if (parent?.ai_mode !== "provider") return null;
  return tenantOwnKey(t.parent_id);
}

/**
 * Client Anthropic à utiliser pour cet utilisateur : la clé de SON tenant si
 * définie (BYOK), sinon repli sur la clé d'environnement (comportement actuel,
 * non cassant). En Lot 0b on pourra rendre la clé tenant OBLIGATOIRE.
 */
export class AiNotConfiguredError extends Error {
  constructor() {
    super(AI_NOT_CONFIGURED_MESSAGE);
    this.name = "AiNotConfiguredError";
  }
}

export async function anthropicForUser(userId: string): Promise<Anthropic> {
  const { key, missing } = await anthropicKeyForBilling(userId);
  if (missing) throw new AiNotConfiguredError();
  return anthropic(key);
}

export interface TenantKeyStatus {
  configured: boolean;
  hint: string | null;
  encryptionReady: boolean;
}

/** État de la clé du tenant (pour le dashboard coach). */
export async function tenantKeyStatus(tenantId: string): Promise<TenantKeyStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("anthropic_key_enc, anthropic_key_hint")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ anthropic_key_enc: string | null; anthropic_key_hint: string | null }>();
  return {
    configured: !!data?.anthropic_key_enc,
    hint: data?.anthropic_key_hint ?? null,
    encryptionReady: secretsEncryptionReady(),
  };
}

/** Vérifie qu'une clé Anthropic fonctionne (petit appel peu coûteux). */
export async function testAnthropicKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = anthropic(key);
    // On teste avec le MÊME modèle que la génération : ainsi une clé validée ici
    // fonctionne à coup sûr en production (pas de faux négatif lié à un modèle
    // indisponible sur le compte du coach).
    await client.messages.create({
      model: MODELS.generate,
      max_tokens: 4,
      messages: [{ role: "user", content: "ping" }],
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Clé invalide.";
    return { ok: false, error: msg.slice(0, 200) };
  }
}

/** Enregistre (chiffrée) la clé Anthropic d'un tenant. */
export async function setTenantAnthropicKey(tenantId: string, key: string): Promise<void> {
  const enc = encryptSecret(key.trim());
  const admin = createAdminClient();
  await admin.from("tenant_secrets").upsert({
    tenant_id: tenantId,
    anthropic_key_enc: enc,
    anthropic_key_hint: keyHint(key),
    updated_at: new Date().toISOString(),
  });
}

/** Supprime la clé Anthropic d'un tenant. */
export async function clearTenantAnthropicKey(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("tenant_secrets")
    .update({ anthropic_key_enc: null, anthropic_key_hint: null, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
}
