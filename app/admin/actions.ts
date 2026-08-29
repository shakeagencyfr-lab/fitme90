"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";
import { broadcastPush, broadcastPushToUsers } from "@/lib/push";
import { resolveAudience, type AudienceFilter } from "@/lib/audience";
import {
  setTenantAnthropicKey,
  clearTenantAnthropicKey,
  testAnthropicKey,
} from "@/lib/tenant";
import { secretsEncryptionReady } from "@/lib/crypto";

/** Normalise les champs de segmentation reçus du formulaire coach. */
function readFilter(formData: FormData): AudienceFilter {
  const sex = String(formData.get("filter_sex") ?? "").trim();
  const goal = String(formData.get("filter_goal") ?? "").trim();
  const phaseRaw = String(formData.get("filter_phase") ?? "all").trim();
  const phase = phaseRaw === "active" || phaseRaw === "paid" ? phaseRaw : "all";
  return { sex, goal, phase };
}

export interface ConfigState {
  ok?: boolean;
  error?: string;
}

// Enregistre la configuration de génération (mode + méthodologie personnalisée).
// Réservé aux admins (double contrôle serveur).
export async function saveCoachConfig(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };

  const mode = formData.get("mode") === "custom" ? "custom" : "auto";
  const custom = String(formData.get("custom_methodology") ?? "").slice(0, 8000);

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .update({ generation_mode: mode, custom_methodology: custom, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/config");
  return { ok: true };
}

// ------------------------------------------------------------------ BYOK (clé Anthropic)
export interface ByokState {
  ok?: boolean;
  error?: string;
  tested?: boolean;
}

/**
 * Enregistre la clé Anthropic du tenant (coach/salle). BYOK : chaque compte
 * fournit SA clé, chiffrée au repos (tenant_secrets, service_role only). On
 * teste la clé par un petit appel avant de l'enregistrer.
 */
export async function saveAnthropicKey(_prev: ByokState, formData: FormData): Promise<ByokState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  if (!secretsEncryptionReady()) {
    return { error: "Chiffrement non configuré (SECRETS_ENC_KEY manquante côté serveur)." };
  }
  const key = String(formData.get("anthropic_key") ?? "").trim();
  if (!key) return { error: "Saisis ta clé Anthropic." };
  if (!/^sk-ant-/.test(key)) {
    return { error: "Clé invalide : une clé Anthropic commence par « sk-ant- »." };
  }

  const test = await testAnthropicKey(key);
  if (!test.ok) {
    return { error: `La clé n'a pas fonctionné : ${test.error ?? "vérifie qu'elle est active."}` };
  }
  await setTenantAnthropicKey(tenantId, key);
  revalidatePath("/admin/compte");
  return { ok: true, tested: true };
}

/** Supprime la clé Anthropic du tenant (retour au comportement par défaut). */
export async function removeAnthropicKey(): Promise<ByokState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  await clearTenantAnthropicKey(tenantId);
  revalidatePath("/admin/compte");
  return { ok: true };
}

// ------------------------------------------------------------------ boutique
export interface ShopState {
  ok?: boolean;
  error?: string;
}

/** Active ou désactive la boutique pour tous les clients. */
export async function setShopEnabled(_prev: ShopState, formData: FormData): Promise<ShopState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const enabled = formData.get("shop_enabled") === "on";
  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .update({ shop_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/shop");
  revalidatePath("/app/shop");
  return { ok: true };
}

/** Ajoute un produit à la boutique (image via URL, lien vers la boutique externe). */
export async function addShopProduct(_prev: ShopState, formData: FormData): Promise<ShopState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const image_url = String(formData.get("image_url") ?? "").trim().slice(0, 1000);
  const link_url = String(formData.get("link_url") ?? "").trim().slice(0, 1000);
  const position = Number(formData.get("position") ?? 0) || 0;
  if (!title) return { error: "Le titre est obligatoire." };
  if (link_url && !/^https?:\/\//i.test(link_url)) return { error: "Le lien doit commencer par http(s)://" };
  if (image_url && !/^https?:\/\//i.test(image_url)) return { error: "L'image doit être une URL http(s)://" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_products")
    .insert({ title, description, image_url, link_url, position });
  if (error) return { error: "Ajout impossible." };
  revalidatePath("/admin/shop");
  revalidatePath("/app/shop");
  return { ok: true };
}

/** Supprime un produit (form action directe). */
export async function deleteShopProduct(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("shop_products").delete().eq("id", id);
  revalidatePath("/admin/shop");
  revalidatePath("/app/shop");
}

// --------------------------------------------------------------- notifications
export interface NotifState {
  ok?: boolean;
  error?: string;
  sent?: number;
  audience?: number;
}

/** État renvoyé par l'aperçu d'audience (segmentation). */
export interface AudienceState {
  total: number;
  withPush: number;
}

const hasFilter = (f: AudienceFilter) => !!(f.sex || f.goal || (f.phase && f.phase !== "all"));

/** Aperçu : combien de clients (et d'abonnés push) correspondent au segment. */
export async function previewAudience(formData: FormData): Promise<AudienceState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { total: 0, withPush: 0 };
  const { total, withPush } = await resolveAudience(readFilter(formData));
  return { total, withPush };
}

/**
 * Envoie une notification push immédiatement. Si un segment est précisé
 * (sexe, objectif, phase), l'envoi est CIBLÉ ; sinon il va à tous les abonnés.
 */
export async function sendBroadcastNow(_prev: NotifState, formData: FormData): Promise<NotifState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const body = String(formData.get("body") ?? "").trim().slice(0, 300);
  const url = String(formData.get("url") ?? "").trim().slice(0, 300) || "/app";
  if (!title || !body) return { error: "Titre et message sont obligatoires." };

  const filter = readFilter(formData);
  const payload = { title, body, url, tag: "coach-broadcast" };
  if (hasFilter(filter)) {
    const { userIds, total } = await resolveAudience(filter);
    if (total === 0) return { error: "Aucun client ne correspond à ce segment." };
    const { sent } = await broadcastPushToUsers(userIds, payload);
    return { ok: true, sent, audience: total };
  }
  const { sent } = await broadcastPush(payload);
  return { ok: true, sent };
}

/** Envoie une notification push à UN seul client (fiche CRM). */
export async function sendPushToClient(_prev: NotifState, formData: FormData): Promise<NotifState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const userId = String(formData.get("user_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const body = String(formData.get("body") ?? "").trim().slice(0, 300);
  const url = String(formData.get("url") ?? "").trim().slice(0, 300) || "/app";
  if (!userId) return { error: "Client introuvable." };
  if (!title || !body) return { error: "Titre et message sont obligatoires." };
  const { sent } = await broadcastPushToUsers([userId], { title, body, url, tag: "coach-direct" });
  return { ok: true, sent };
}

/** Programme une notification pour une date/heure future. */
export async function scheduleBroadcast(_prev: NotifState, formData: FormData): Promise<NotifState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const body = String(formData.get("body") ?? "").trim().slice(0, 300);
  const url = String(formData.get("url") ?? "").trim().slice(0, 300) || "/app";
  const when = String(formData.get("send_at") ?? "");
  if (!title || !body) return { error: "Titre et message sont obligatoires." };
  const at = new Date(when);
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now()) return { error: "Choisis une date future." };
  const filter = readFilter(formData);
  const admin = createAdminClient();
  const { error } = await admin.from("scheduled_pushes").insert({
    title,
    body,
    url,
    send_at: at.toISOString(),
    filter_sex: filter.sex || null,
    filter_goal: filter.goal || null,
    filter_phase: filter.phase && filter.phase !== "all" ? filter.phase : null,
  });
  if (error) return { error: "Programmation impossible." };
  revalidatePath("/admin/notifications");
  return { ok: true };
}

/** Annule une notification programmée non encore envoyée (form action directe). */
export async function deleteScheduled(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("scheduled_pushes").delete().eq("id", id).is("sent_at", null);
  revalidatePath("/admin/notifications");
}
