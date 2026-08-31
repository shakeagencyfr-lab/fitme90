"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";
import { broadcastPushToUsers } from "@/lib/push";
import { resolveAudience, type AudienceFilter } from "@/lib/audience";
import {
  setTenantAnthropicKey,
  clearTenantAnthropicKey,
  testAnthropicKey,
} from "@/lib/tenant";
import { secretsEncryptionReady } from "@/lib/crypto";
import { createOffer, setOfferActive, deleteOffer } from "@/lib/offers";
import { createPlan, setPlanActive, deletePlan } from "@/lib/plans";
import { saveTenantBranding, uploadTenantAsset, clearTenantAsset, type AssetKind } from "@/lib/branding";
import { setTenantStripeKey, clearTenantStripeKey, testStripeKey } from "@/lib/coach-payments";
import {
  clientBelongsToTenant,
  insertVipMessage,
  uploadVipImage,
  markThreadRead,
  notifyNewVipMessage,
  setTenantNotifyEmails,
} from "@/lib/vip";
import { createPromo, setPromoActive, deletePromo as deletePromoLib } from "@/lib/promo";
import { generateCoachGiftCodes } from "@/lib/gift";
import { normalizeSlug, isValidSlug } from "@/lib/config";
import { markAllCoachNotifsRead, markCoachNotifRead } from "@/lib/notifications";
import { saveCoachExerciseMedia, deleteCoachExerciseMedia, uploadExerciseImage } from "@/lib/exercise-guide";
import { normalizeExerciseName } from "@/lib/exercise-library";

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
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };

  const mode = formData.get("mode") === "custom" ? "custom" : "auto";
  const custom = String(formData.get("custom_methodology") ?? "").slice(0, 8000);
  // Prénom du coach IA : lettres/espaces/tirets, borné. Vide = valeur par défaut.
  const coachName = String(formData.get("coach_name") ?? "")
    .replace(/[^\p{L}\p{M} '-]/gu, "")
    .trim()
    .slice(0, 40);

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .upsert(
      {
        tenant_id: tenantId,
        generation_mode: mode,
        custom_methodology: custom,
        coach_name: coachName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
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

// ------------------------------------------------------------------ notes client (CRM+)
export interface NoteState {
  ok?: boolean;
  error?: string;
}

/** Ajoute une note datée du coach sur un client (visible du coach seul). */
export async function addCoachNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const clientId = String(formData.get("client_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  if (!clientId) return { error: "Client introuvable." };
  if (!body) return { error: "Écris une note." };
  const admin = createAdminClient();
  const { error } = await admin.from("coach_notes").insert({
    client_id: clientId,
    coach_id: ctx.userId,
    tenant_id: ctx.profile?.tenant_id ?? null,
    body,
  });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}

/** Supprime une note (form action directe). */
export async function deleteCoachNote(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("coach_notes").delete().eq("id", id);
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

// ------------------------------------------------------------------ personnalisation (Lot 5)
export interface BrandingState {
  ok?: boolean;
  error?: string;
}

/** Enregistre la personnalisation de la page publique (couleur, textes, à propos). */
export async function saveBranding(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const res = await saveTenantBranding(ctx.profile.tenant_id, {
    brandColor: String(formData.get("brand_color") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    aboutEnabled: formData.get("about_enabled") === "on",
    aboutTitle: String(formData.get("about_title") ?? ""),
    aboutText: String(formData.get("about_text") ?? ""),
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/offres");
  return { ok: true };
}

const ASSET_KINDS: readonly AssetKind[] = ["logo", "favicon", "portrait"];
function asKind(v: unknown): AssetKind | null {
  return typeof v === "string" && (ASSET_KINDS as readonly string[]).includes(v) ? (v as AssetKind) : null;
}

/**
 * Téléverse un asset (logo / favicon / portrait). Appelée DIRECTEMENT depuis le
 * client dès qu'une image est choisie (pas de bouton d'envoi, pas de <form>
 * imbriqué — ce qui cassait l'upload du portrait).
 */
export async function uploadAsset(formData: FormData): Promise<BrandingState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const kind = asKind(formData.get("kind"));
  if (!kind) return { error: "Type d'image invalide." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Aucun fichier." };
  const res = await uploadTenantAsset(ctx.profile.tenant_id, kind, file);
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/offres");
  return { ok: true };
}

/** Retire un asset. Appelée directement depuis le client. */
export async function removeAsset(kind: string): Promise<BrandingState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const k = asKind(kind);
  if (!k) return { error: "Type d'image invalide." };
  await clearTenantAsset(ctx.profile.tenant_id, k);
  revalidatePath("/admin/offres");
  return { ok: true };
}

// ------------------------------------------------------------------ offres (Lot 1)
export interface OfferState {
  ok?: boolean;
  error?: string;
}

/** Ajoute une offre au catalogue du tenant (max 3, durées prédéfinies). */
export async function addOffer(_prev: OfferState, formData: FormData): Promise<OfferState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  const name = String(formData.get("name") ?? "");
  const months = Number(formData.get("duration_months") ?? 0);
  const billingType = formData.get("billing_type") === "subscription" ? "subscription" : "one_time";
  const vipChat = formData.get("vip_chat") === "on";

  // Parse un montant en euros (« 190 » ou « 29,90 ») → centimes, ou null si vide.
  const toCents = (raw: unknown): { cents: number | null; bad: boolean } => {
    const s = String(raw ?? "").replace(",", ".").trim();
    if (!s) return { cents: null, bad: false };
    const n = Math.round(Number(s) * 100);
    return { cents: n, bad: !Number.isFinite(n) || n < 0 };
  };

  const price = toCents(formData.get("price_euros"));
  const month = toCents(formData.get("price_month_euros"));
  const year = toCents(formData.get("price_year_euros"));
  if (price.bad || month.bad || year.bad) {
    return { error: "Prix invalide (ex : 190 ou 29,90)." };
  }

  const res = await createOffer(tenantId, {
    name,
    durationMonths: months,
    vipChat,
    billingType,
    priceCents: price.cents,
    priceMonthCents: month.cents,
    priceYearCents: year.cents,
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/offres");
  return { ok: true };
}

/** Active / désactive une offre (form action directe). */
export async function toggleOffer(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  if (!id) return;
  await setOfferActive(ctx.profile.tenant_id, id, active);
  revalidatePath("/admin/offres");
}

/** Supprime une offre (form action directe). */
export async function removeOffer(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteOffer(ctx.profile.tenant_id, id);
  revalidatePath("/admin/offres");
}

// ------------------------------------------------------- Paliers d'abonnement (Lot C)
export interface PlanState {
  ok?: boolean;
  error?: string;
}

// Parse un montant en euros (« 49 » ou « 29,90 ») → centimes, ou null si vide.
function eurosToCents(raw: unknown): { cents: number | null; bad: boolean } {
  const s = String(raw ?? "").replace(",", ".").trim();
  if (!s) return { cents: null, bad: false };
  const n = Math.round(Number(s) * 100);
  return { cents: n, bad: !Number.isFinite(n) || n < 0 };
}

export async function addPlan(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };

  const name = String(formData.get("name") ?? "");
  const month = eurosToCents(formData.get("price_month_euros"));
  const year = eurosToCents(formData.get("price_year_euros"));
  const setup = eurosToCents(formData.get("setup_fee_euros"));
  if (month.bad || year.bad || setup.bad) {
    return { error: "Prix invalide (ex : 49 ou 29,90)." };
  }

  // Clients inclus : vide ou « illimité » = pas de limite.
  const rawLimit = String(formData.get("client_limit") ?? "").trim().toLowerCase();
  let clientLimit: number | null = null;
  if (rawLimit && rawLimit !== "illimité" && rawLimit !== "illimite") {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 0) return { error: "Nombre de clients invalide." };
    clientLimit = n;
  }

  const res = await createPlan(tenantId, {
    name,
    priceMonthCents: month.cents,
    priceYearCents: year.cents,
    setupFeeCents: setup.cents ?? 0,
    clientLimit,
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/paliers");
  return { ok: true };
}

/** Active / désactive un palier (form action directe). */
export async function togglePlan(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  if (!id) return;
  await setPlanActive(ctx.profile.tenant_id, id, active);
  revalidatePath("/admin/paliers");
}

/** Supprime un palier (form action directe). */
export async function removePlan(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deletePlan(ctx.profile.tenant_id, id);
  revalidatePath("/admin/paliers");
}

// ------------------------------------------------------------------ BYOK Stripe (Lot 3)
export interface StripeKeyState {
  ok?: boolean;
  error?: string;
}

/**
 * Enregistre la clé Stripe du coach (BYOK). Les paiements se feront sur SON
 * compte, avec SA clé. La plateforme ne touche pas l'argent et ne prélève rien.
 * On teste la clé par un petit appel avant de l'enregistrer.
 */
export async function saveStripeKey(_prev: StripeKeyState, formData: FormData): Promise<StripeKeyState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  if (!secretsEncryptionReady()) {
    return { error: "Chiffrement non configuré (SECRETS_ENC_KEY manquante côté serveur)." };
  }
  const key = String(formData.get("stripe_key") ?? "").trim();
  if (!key) return { error: "Saisis ta clé secrète Stripe." };
  if (!/^(sk|rk)_(live|test)_/.test(key)) {
    return { error: "Clé invalide : une clé secrète Stripe commence par « sk_live_ », « sk_test_ » ou « rk_live_ »." };
  }

  const test = await testStripeKey(key);
  if (!test.ok) {
    return { error: `La clé n'a pas fonctionné : ${test.error ?? "vérifie qu'elle est active."}` };
  }
  await setTenantStripeKey(tenantId, key);
  revalidatePath("/admin/paiements");
  return { ok: true };
}

/** Supprime la clé Stripe du coach. */
export async function removeStripeKey(): Promise<StripeKeyState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  await clearTenantStripeKey(tenantId);
  revalidatePath("/admin/paiements");
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
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  const enabled = formData.get("shop_enabled") === "on";
  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .upsert(
      { tenant_id: tenantId, shop_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );
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
  const { total, withPush } = await resolveAudience(readFilter(formData), ctx.profile?.tenant_id ?? null);
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

  const tenantId = ctx.profile?.tenant_id ?? null;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  const filter = readFilter(formData);
  const payload = { title, body, url, tag: "coach-broadcast" };
  // Cloisonnement : l'envoi ne touche QUE les clients de ce coach, filtre ou non.
  const { userIds, total } = await resolveAudience(filter, tenantId);
  if (total === 0) {
    return { error: hasFilter(filter) ? "Aucun client ne correspond à ce segment." : "Aucun client pour l'instant." };
  }
  const { sent } = await broadcastPushToUsers(userIds, payload);
  return { ok: true, sent, audience: total };
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
  // Cloisonnement : uniquement un client de SON tenant.
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null }>();
  if (!t || t.tenant_id !== ctx.profile?.tenant_id) return { error: "Client introuvable." };
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
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  const filter = readFilter(formData);
  const admin = createAdminClient();
  const { error } = await admin.from("scheduled_pushes").insert({
    tenant_id: tenantId,
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
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const admin = createAdminClient();
  // Cloisonnement : on ne supprime qu'une notif programmée de SON tenant.
  await admin.from("scheduled_pushes").delete().eq("id", id).eq("tenant_id", tenantId).is("sent_at", null);
  revalidatePath("/admin/notifications");
}

// ------------------------------------------------------------------ Chat VIP (Lot 2)
export interface ChatState {
  ok?: boolean;
  error?: string;
}

/** Le coach répond à un client dans le Chat VIP (texte et/ou image). */
export async function sendCoachVipMessage(_prev: ChatState, formData: FormData): Promise<ChatState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };

  const clientId = String(formData.get("client_id") ?? "").trim();
  if (!clientId) return { error: "Client introuvable." };
  const client = await clientBelongsToTenant(clientId, tenantId);
  if (!client) return { error: "Ce client n'est pas rattaché à ton compte." };

  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const file = formData.get("image");
  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const up = await uploadVipImage(clientId, file);
    if (up.error) return { error: up.error };
    imageUrl = up.url ?? null;
  }
  if (!body && !imageUrl) return { error: "Écris un message ou ajoute une image." };

  const id = await insertVipMessage({
    tenantId,
    clientId,
    sender: "coach",
    body: body || null,
    imageUrl,
  });
  if (!id) return { error: "Envoi impossible." };

  await markThreadRead(clientId, "coach");
  await notifyNewVipMessage({
    tenantId,
    clientId,
    sender: "coach",
    clientName: client.name,
    preview: body || "📷 Photo",
  });

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/admin/chat/${clientId}`);
  revalidatePath("/admin/chat");
  return { ok: true };
}

/** Marque le fil d'un client comme lu par le coach (à l'ouverture). */
export async function markCoachThreadRead(clientId: string): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const client = await clientBelongsToTenant(clientId, ctx.profile.tenant_id);
  if (!client) return;
  await markThreadRead(clientId, "coach");
  revalidatePath("/admin/chat");
}

export interface NotifyEmailsState {
  ok?: boolean;
  error?: string;
}

/** Enregistre les e-mails de notification du coach (nouveaux messages VIP). */
export async function saveNotifyEmails(_prev: NotifyEmailsState, formData: FormData): Promise<NotifyEmailsState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };

  const raw = String(formData.get("emails") ?? "");
  const emails = Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  const invalid = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalid) return { error: `Adresse invalide : ${invalid}` };
  if (emails.length > 10) return { error: "10 adresses maximum." };

  await setTenantNotifyEmails(tenantId, emails);
  revalidatePath("/admin/notifications");
  return { ok: true };
}

// ------------------------------------------------------------------ codes promo & cadeaux
export interface PromoFormState {
  ok?: boolean;
  error?: string;
}

/** Crée un code promo pour le coach (remise % ou € sur ses offres). */
export async function addPromo(_prev: PromoFormState, formData: FormData): Promise<PromoFormState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };

  const code = String(formData.get("code") ?? "");
  const type = formData.get("discount_type") === "fixed" ? "fixed" : "percent";
  const rawValue = String(formData.get("value") ?? "").replace(",", ".").trim();
  const num = Number(rawValue);
  if (!Number.isFinite(num) || num <= 0) return { error: "Valeur de remise invalide." };
  const discountValue = type === "fixed" ? Math.round(num * 100) : Math.round(num);

  const maxRaw = String(formData.get("max_uses") ?? "").trim();
  const maxUses = maxRaw ? Math.max(1, Math.round(Number(maxRaw))) : null;
  if (maxRaw && !Number.isFinite(Number(maxRaw))) return { error: "Nombre d'utilisations invalide." };

  const expRaw = String(formData.get("expires_at") ?? "").trim();
  const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(expRaw) ? `${expRaw}T23:59:59Z` : null;

  const res = await createPromo(tenantId, { code, discountType: type, discountValue, maxUses, expiresAt });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/codes");
  return { ok: true };
}

export async function togglePromo(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "on";
  if (!id) return;
  await setPromoActive(ctx.profile.tenant_id, id, active);
  revalidatePath("/admin/codes");
}

export async function removePromo(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deletePromoLib(ctx.profile.tenant_id, id);
  revalidatePath("/admin/codes");
}

export interface GiftGenState {
  ok?: boolean;
  error?: string;
  codes?: string[];
}

/** Génère des codes cadeaux gratuits pour une offre à paiement unique. */
export async function generateGiftCodesAction(_prev: GiftGenState, formData: FormData): Promise<GiftGenState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  const offerId = String(formData.get("offer_id") ?? "").trim();
  if (!offerId) return { error: "Choisis une offre." };
  const count = Math.max(1, Math.min(50, Math.round(Number(formData.get("count") ?? 1)) || 1));
  const note = String(formData.get("note") ?? "").trim() || null;
  const res = await generateCoachGiftCodes(tenantId, offerId, count, note);
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/codes");
  return { ok: true, codes: res.codes };
}

// ------------------------------------------------------------------ suppression client
const CLIENT_USER_TABLES: [string, string][] = [
  ["ai_calls", "user_id"],
  ["coach_messages", "user_id"],
  ["coach_conversations", "user_id"],
  ["equipment", "user_id"],
  ["measurements", "user_id"],
  ["photos", "user_id"],
  ["programs", "user_id"],
  ["push_subscriptions", "user_id"],
  ["questionnaires", "user_id"],
  ["session_logs", "user_id"],
  ["shopping_checks", "user_id"],
  ["weights", "user_id"],
  ["coach_notes", "client_id"],
  ["vip_messages", "client_id"],
];

/**
 * Supprime DÉFINITIVEMENT un client : toutes ses données applicatives, son
 * profil et son compte d'authentification. Réservé au coach (garde admin).
 * Action irréversible.
 */
export async function deleteClient(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx) return;
  const clientId = String(formData.get("id") ?? "").trim();
  if (!clientId || clientId === ctx.userId) return; // jamais son propre compte

  const admin = createAdminClient();
  // Cloisonnement : ne supprimer qu'un CLIENT de SON tenant (jamais un autre
  // coach, ni un client d'un autre coach).
  const { data: target } = await admin
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", clientId)
    .maybeSingle<{ tenant_id: string | null; role: string | null }>();
  if (!target || target.role === "owner" || target.tenant_id !== ctx.profile?.tenant_id) return;

  for (const [table, col] of CLIENT_USER_TABLES) {
    await admin.from(table).delete().eq(col, clientId);
  }
  // Libère d'éventuels codes cadeaux utilisés par ce client (réutilisables).
  await admin.from("gift_codes").update({ used_by: null, used_at: null }).eq("used_by", clientId);
  await admin.from("profiles").delete().eq("id", clientId);
  // Compte d'authentification (service role).
  try {
    await admin.auth.admin.deleteUser(clientId);
  } catch {
    /* le profil est déjà supprimé ; on n'échoue pas le flux pour autant */
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export interface ExerciseMediaState {
  ok?: boolean;
  error?: string;
}

/** Enregistre le média d'un exercice pour le coach (image/gif + consignes). */
export async function saveExerciseMedia(_prev: ExerciseMediaState, formData: FormData): Promise<ExerciseMediaState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) return { error: "Nom de l'exercice manquant." };
  const muscle = String(formData.get("muscle") ?? "").trim().slice(0, 80) || null;
  const instructions = String(formData.get("instructions") ?? "").trim().slice(0, 4000) || null;
  const key = normalizeExerciseName(name);
  if (!key) return { error: "Nom de l'exercice invalide." };

  let imageUrl = String(formData.get("current_image") ?? "").trim() || null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const up = await uploadExerciseImage(tenantId, key, file);
    if (up.error) return { error: up.error };
    imageUrl = up.url ?? imageUrl;
  }

  if (!imageUrl && !instructions) {
    return { error: "Ajoute au moins une image/gif ou des consignes." };
  }

  await saveCoachExerciseMedia({ tenantId, name, muscle, imageUrl, instructions });
  revalidatePath("/admin/exercices");
  return { ok: true };
}

/** Supprime un média d'exercice du coach. */
export async function removeExerciseMedia(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteCoachExerciseMedia(ctx.profile.tenant_id, id);
  revalidatePath("/admin/exercices");
}

/** Marque toutes les notifications du coach comme lues (cloche du dashboard). */
export async function markAllNotificationsRead(): Promise<void> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id;
  if (!tenantId) return;
  await markAllCoachNotifsRead(tenantId);
  revalidatePath("/admin", "layout");
}

/** Marque une notification précise comme lue (au clic). */
export async function markNotificationRead(id: string): Promise<void> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id;
  if (!tenantId || !id) return;
  await markCoachNotifRead(tenantId, id);
  revalidatePath("/admin", "layout");
}

export interface SubdomainState {
  ok?: boolean;
  error?: string;
  value?: string;
}

/**
 * Enregistre l'ADRESSE PERSONNALISÉE de la landing du coach : le nom qui apparaît
 * à la fin de l'URL (`fitme90.com/<nom>`, et aussi `<nom>.fitme90.com` si le DNS
 * générique est branché). Stocké dans la colonne `subdomain`. Vide = on retire.
 * Refuse les formes invalides, les noms réservés et ceux déjà pris.
 */
export async function saveSubdomain(_prev: SubdomainState, formData: FormData): Promise<SubdomainState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };

  const raw = String(formData.get("subdomain") ?? "");
  const admin = createAdminClient();

  // Champ vidé : on retire l'adresse personnalisée.
  if (!raw.trim()) {
    await admin.from("tenants").update({ subdomain: null }).eq("id", tenantId);
    revalidatePath("/admin/offres");
    return { ok: true, value: "" };
  }

  const sub = normalizeSlug(raw);
  if (!isValidSlug(sub)) {
    return { error: "Adresse invalide ou réservée (3 à 40 caractères : lettres, chiffres, tirets).", value: sub };
  }

  // Déjà prise par un AUTRE coach ? (unicité aussi sur le slug pour éviter les
  // collisions avec le chemin /c/[slug] d'un autre coach.)
  const { data: taken } = await admin
    .from("tenants")
    .select("id")
    .or(`subdomain.eq.${sub},slug.eq.${sub}`)
    .neq("id", tenantId)
    .maybeSingle<{ id: string }>();
  if (taken) return { error: "Cette adresse est déjà utilisée.", value: sub };

  const { error } = await admin.from("tenants").update({ subdomain: sub }).eq("id", tenantId);
  if (error) return { error: "Enregistrement impossible (adresse peut-être déjà prise).", value: sub };

  revalidatePath("/admin/offres");
  return { ok: true, value: sub };
}
