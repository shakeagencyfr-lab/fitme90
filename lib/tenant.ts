import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret, keyHint, secretsEncryptionReady } from "@/lib/crypto";

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

/** Clé Anthropic (déchiffrée) du tenant de l'utilisateur, sinon null. */
export async function tenantAnthropicKey(userId: string): Promise<string | null> {
  const tenantId = await tenantIdForUser(userId);
  if (!tenantId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("anthropic_key_enc")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ anthropic_key_enc: string | null }>();
  return decryptSecret(data?.anthropic_key_enc ?? null);
}

/**
 * Client Anthropic à utiliser pour cet utilisateur : la clé de SON tenant si
 * définie (BYOK), sinon repli sur la clé d'environnement (comportement actuel,
 * non cassant). En Lot 0b on pourra rendre la clé tenant OBLIGATOIRE.
 */
export async function anthropicForUser(userId: string): Promise<Anthropic> {
  const key = await tenantAnthropicKey(userId);
  return anthropic(key ?? undefined);
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
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
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
