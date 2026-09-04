"use server";

import { revalidatePath } from "next/cache";
import { suspendTenant, reactivateTenant, giftCredits, deleteTenantTree, setResellerSupply, setTenantPlan } from "@/lib/network-admin";
import { setSupportReturn, readSupportReturn, clearSupportReturn } from "@/lib/support-return";
import { LANDING_TEMPLATES, BUSINESS_TYPES } from "@/lib/offers";
import { whitelabelEnabled } from "@/lib/whitelabel";
import { sendEmail } from "@/lib/email";
import { setTenantCustomDomain } from "@/lib/custom-domain";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isServedInstant } from "@/lib/push-windows";
import { getAdminOrNull } from "@/lib/admin";
import { tenantNode } from "@/lib/hierarchy";
import { createChildTenantAccount } from "@/lib/admin-provision";
import { isDescendantTenant, isOwnClient, loginLinkForUser, establishSupportSession, logSupportAccess } from "@/lib/support-access";
import { broadcastPushToUsers } from "@/lib/push";
import { resolveAudience, type AudienceFilter } from "@/lib/audience";
import {
  setTenantAnthropicKey,
  clearTenantAnthropicKey,
  testAnthropicKey,
  tenantKeyStatus,
} from "@/lib/tenant";
import { secretsEncryptionReady } from "@/lib/crypto";
import { createOffer, setOfferActive, deleteOffer } from "@/lib/offers";
import { createPlan, setPlanActive, deletePlan } from "@/lib/plans";
import { cancelTenantPlan, reactivateTenantPlan, syncTenantSubscription } from "@/lib/tenant-billing";
import { deleteOwnCoachAccount } from "@/lib/account-deletion";
import { setAffiliation } from "@/lib/affiliation";
import { setProspectStatus, deleteProspect } from "@/lib/prospects";
import { createCreditPack, setCreditPackActive, deleteCreditPack, canSetProgramCredits } from "@/lib/credits";
import { setResellerWhitelabelPrice } from "@/lib/whitelabel";
import { setTenantSmtp, clearTenantSmtp, testSmtp } from "@/lib/smtp";
import { saveTenantBranding, saveTenantIdentity, saveTenantTheme, uploadTenantAsset, clearTenantAsset, type AssetKind } from "@/lib/branding";
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
import { markAllCoachNotifsRead, markCoachNotifRead, clearCoachNotifications } from "@/lib/notifications";
import { saveCoachExerciseMedia, deleteCoachExerciseMedia, uploadExerciseImage } from "@/lib/exercise-guide";
import { normalizeExerciseName } from "@/lib/exercise-library";
import { serpApiEnabled, searchPlaces, fetchPlaceDraft } from "@/lib/serpapi";
import { applyGoogleImport, saveImportDraft, readImportDraft } from "@/lib/google-apply";
import type { ImportDraft, PlaceCandidate } from "@/lib/google-import";

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

  // Les deux plafonds journaliers (messages, recettes) se règlent désormais PAR
  // OFFRE, dans l'écran Plans. On ne les écrit plus ici : les colonnes restent
  // en base comme repli pour les comptes réglés avant ce changement, et les
  // écraser avec des valeurs par défaut à chaque enregistrement de méthodologie
  // aurait modifié le comportement sans que personne ne le demande.
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
  // Sécurité : un revendeur ne peut pas rester « fournisseur d'IA » sans clé.
  // On repasse en BYOK (sans effet pour un coach, déjà en byok).
  const admin = createAdminClient();
  await admin.from("tenants").update({ ai_mode: "byok" }).eq("id", tenantId).eq("ai_mode", "provider");
  revalidatePath("/admin/compte");
  revalidatePath("/admin/ia-revenu");
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
    // Champ absent : la couleur appartient au studio de thème, on n'y touche pas.
    brandColor: formData.has("brand_color") ? String(formData.get("brand_color")) : undefined,
    tagline: String(formData.get("tagline") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    aboutEnabled: formData.get("about_enabled") === "on",
    aboutTitle: String(formData.get("about_title") ?? ""),
    aboutText: String(formData.get("about_text") ?? ""),
    language: String(formData.get("language") ?? ""),
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/marque-blanche");
  return { ok: true };
}

/** Enregistre l'identité écrite de la marque (noms, contact, liens, SEO). */
export async function saveIdentity(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const f = (k: string) => String(formData.get(k) ?? "");
  const res = await saveTenantIdentity(ctx.profile.tenant_id, {
    appName: f("app_name"),
    legalName: f("legal_name"),
    supportEmail: f("support_email"),
    termsUrl: f("terms_url"),
    privacyUrl: f("privacy_url"),
    seoTitle: f("seo_title"),
    seoDescription: f("seo_description"),
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/marque-blanche");
  return { ok: true };
}

/**
 * Enregistre le thème de marque. Le formulaire envoie le thème entier en JSON ;
 * il est intégralement revalidé côté serveur (lib/theme), donc un champ inconnu
 * ou une couleur douteuse retombe sur le défaut plutôt que d'atteindre le CSS.
 */
export async function saveTheme(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  let raw: unknown = null;
  try {
    raw = JSON.parse(String(formData.get("theme") ?? "{}"));
  } catch {
    return { error: "Thème illisible." };
  }
  const res = await saveTenantTheme(ctx.profile.tenant_id, raw);
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/marque-blanche");
  return { ok: true };
}

export interface TemplateState {
  ok?: boolean;
  error?: string;
}

/** Enregistre le template de landing choisi (onyx | lumen). */
export async function saveLandingTemplate(_prev: TemplateState, formData: FormData): Promise<TemplateState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const raw = String(formData.get("template") ?? "");
  const template = (LANDING_TEMPLATES as readonly string[]).includes(raw) ? raw : null;
  if (!template) return { error: "Template inconnu." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ landing_template: template })
    .eq("id", ctx.profile.tenant_id);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/marque-blanche");
  return { ok: true };
}

/**
 * Nature du commerce : coach indépendant ou salle. Ne touche ni aux droits ni
 * à la facturation, seulement au DISCOURS de la landing publique (une salle ne
 * vend pas la même chose qu'un coach : voir landing-templates/coach-copy.ts).
 */
export async function saveBusinessType(_prev: TemplateState, formData: FormData): Promise<TemplateState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const raw = String(formData.get("business_type") ?? "");
  if (!(BUSINESS_TYPES as readonly string[]).includes(raw)) return { error: "Type d'activité inconnu." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ business_type: raw })
    .eq("id", ctx.profile.tenant_id);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/marque-blanche");
  return { ok: true };
}

// ------------------------------------------------------------------ mon compte

export interface AccountState {
  ok?: boolean;
  error?: string;
}

/**
 * Nom de la plateforme (tenants.name). Il était figé à la création du compte
 * et n'apparaissait nulle part dans le dashboard : impossible de corriger une
 * faute de frappe une fois la landing en ligne.
 *
 * Ce nom voyage : landings publiques, e-mails, dashboards des comptes enfants.
 * On revalide donc large plutôt que la seule page d'origine.
 */
export async function saveAccountBrandName(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id;
  if (!tenantId) return { error: "Accès refusé." };

  const name = String(formData.get("brand_name") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length < 2) return { error: "Le nom doit faire au moins 2 caractères." };

  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ name }).eq("id", tenantId);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/compte");
  revalidatePath("/admin/marque-blanche");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Nom de la personne (profiles.name), affiché dans le dashboard et les e-mails. */
export async function saveAccountFullName(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.userId) return { error: "Accès refusé." };

  const name = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (name.length < 2) return { error: "Indique ton nom (2 caractères minimum)." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ name }).eq("id", ctx.userId);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/compte");
  return { ok: true };
}

/**
 * Mot de passe. Passe par le client de SESSION, pas par la clé de service :
 * Supabase impose alors que la session soit valide, ce qui empêche de changer
 * le mot de passe d'un autre compte même en falsifiant le formulaire.
 */
export async function saveAccountPassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "8 caractères minimum." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Les deux mots de passe diffèrent." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Changement impossible. Reconnecte-toi et réessaie." };
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
  revalidatePath("/admin/marque-blanche");
  return { ok: true };
}

/** Retire un asset. Appelée directement depuis le client. */
export async function removeAsset(kind: string): Promise<BrandingState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const k = asKind(kind);
  if (!k) return { error: "Type d'image invalide." };
  await clearTenantAsset(ctx.profile.tenant_id, k);
  revalidatePath("/admin/marque-blanche");
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
  // Le Coach IA est inclus par défaut ; la case l'exclut si décochée.
  const coachAi = formData.get("coach_ai") === "on";
  // Quota journalier d'actions IA par client sur ce plan (vide = défaut du coach).
  const recipesRaw = String(formData.get("recipe_ai_daily_limit") ?? "").trim();
  const recipeAiDailyLimit = recipesRaw === "" ? null : Number(recipesRaw);
  const quotaRaw = String(formData.get("coach_ai_daily_limit") ?? "").trim();
  const coachAiDailyLimit = quotaRaw === "" ? null : Number(quotaRaw);
  if (recipeAiDailyLimit != null && (!Number.isFinite(recipeAiDailyLimit) || recipeAiDailyLimit < 0)) {
    return { error: "Plafond de recettes invalide." };
  }
  if (coachAiDailyLimit != null && (!Number.isFinite(coachAiDailyLimit) || coachAiDailyLimit < 0)) {
    return { error: "Quota de messages invalide." };
  }

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
    coachAi,
    coachAiDailyLimit,
    recipeAiDailyLimit,
    billingType,
    priceCents: price.cents,
    priceMonthCents: month.cents,
    priceYearCents: year.cents,
  });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/plans");
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
  revalidatePath("/admin/plans");
}

/** Supprime une offre (form action directe). */
export async function removeOffer(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteOffer(ctx.profile.tenant_id, id);
  revalidatePath("/admin/plans");
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

/** Résilie l'abonnement du compte à son parent (fin de période). */
export async function cancelMyPlan(): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  await cancelTenantPlan(ctx.profile.tenant_id);
  revalidatePath("/admin/abonnement");
}

/** Annule une résiliation programmée. */
export async function reactivateMyPlan(): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  await reactivateTenantPlan(ctx.profile.tenant_id);
  revalidatePath("/admin/abonnement");
}

/** Re-synchronise l'abonnement avec Stripe (après une régularisation de paiement). */
export async function refreshMyBilling(): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  await syncTenantSubscription(ctx.profile.tenant_id);
  revalidatePath("/admin/abonnement");
  revalidatePath("/admin", "layout");
}

export interface DeleteAccountState {
  ok?: boolean;
  error?: string;
}

/**
 * Résiliation TOTALE et irréversible : supprime le compte coach, tous ses
 * clients et toutes les données. Exige la saisie exacte de « SUPPRIMER ».
 * Après succès, l'utilisateur n'a plus de compte : on le renvoie à l'accueil.
 */
export async function deleteMyAccount(_prev: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "SUPPRIMER") {
    return { error: "Tape SUPPRIMER (en majuscules) pour confirmer." };
  }
  const res = await deleteOwnCoachAccount(ctx.profile.tenant_id, ctx.userId);
  if (!res.ok) return { error: res.error ?? "Suppression impossible." };
  redirect("/?compte=supprime");
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
  // Dernier verrou : le formulaire ne propose que les créneaux servis, mais un
  // POST forgé pourrait viser 21 h 15. L'accepter enregistrerait une promesse
  // que le dispatcher ne tiendrait pas.
  if (!isServedInstant(at)) return { error: "Ce créneau d'envoi n'existe pas. Choisis-en un dans la liste." };
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

// ------------------------------------------------------------------ affiliation (parrainage)
export interface AffiliationState {
  ok?: boolean;
  error?: string;
}

/** Active/désactive l'affiliation et enregistre la récompense (coach). */
export async function saveAffiliation(_prev: AffiliationState, formData: FormData): Promise<AffiliationState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const enabled = formData.get("affiliation_enabled") === "on";
  const reward = String(formData.get("affiliation_reward") ?? "");
  await setAffiliation(ctx.profile.tenant_id, enabled, reward);
  revalidatePath("/admin/affiliation");
  revalidatePath("/app/parrainage");
  return { ok: true };
}

// ------------------------------------------------------------------ lead magnet / prospects
export interface LeadMagnetState {
  ok?: boolean;
  error?: string;
}

/** Active/désactive le mini-programme gratuit (lead magnet) sur la landing. */
export async function setLeadMagnetEnabled(_prev: LeadMagnetState, formData: FormData): Promise<LeadMagnetState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const enabled = formData.get("lead_magnet_enabled") === "on";
  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .upsert(
      { tenant_id: ctx.profile.tenant_id, lead_magnet_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/prospects");
  return { ok: true };
}

/**
 * Active/désactive les relances automatiques des prospects.
 *
 * Désactivé par défaut, et jamais activé à la place du coach : ces messages
 * partent en son nom, depuis son serveur d'envoi quand il en a un, et c'est sa
 * réputation d'expéditeur qui est en jeu.
 */
export async function setProspectFollowupEnabled(_prev: LeadMagnetState, formData: FormData): Promise<LeadMagnetState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const enabled = formData.get("prospect_followup_enabled") === "on";
  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .upsert(
      { tenant_id: ctx.profile.tenant_id, prospect_followup_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/admin/prospects");
  return { ok: true };
}

/** Met à jour le statut d'un prospect (form action directe). */
export async function updateProspectStatus(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;
  await setProspectStatus(ctx.profile.tenant_id, id, status);
  revalidatePath("/admin/prospects");
}

/** Supprime un prospect (form action directe). */
export async function removeProspect(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteProspect(ctx.profile.tenant_id, id);
  revalidatePath("/admin/prospects");
}

// ------------------------------------------------------------------ mode IA revendeur
export interface ResellerAiState {
  ok?: boolean;
  error?: string;
}

/**
 * Mode de fourniture de l'IA pour un revendeur :
 *  - « byok » : chaque coach branche SA propre clé Anthropic (le revendeur ne
 *    facture que les abonnements) ;
 *  - « provider » : le revendeur fournit SA clé à tous ses coachs et fixe un
 *    plafond de messages/jour par client. Il absorbe le coût IA (visible dans
 *    « Revenu IA ») et le refacture via ses paliers.
 * La clé Anthropic elle-même se règle via saveAnthropicKey (identique au coach).
 */
export async function saveResellerAiMode(_prev: ResellerAiState, formData: FormData): Promise<ResellerAiState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const tenantId = ctx.profile.tenant_id;

  const mode = formData.get("ai_mode") === "provider" ? "provider" : "byok";

  // Garde-fou : le mode « revendeur d'IA » exige que le revendeur ait branché
  // SA clé Anthropic (c'est elle qui alimente tout son réseau). Sans clé, on
  // reste en BYOK.
  if (mode === "provider") {
    const key = await tenantKeyStatus(tenantId);
    if (!key.configured) {
      return { error: "Branche d'abord ta clé Anthropic pour activer le mode revendeur d'IA." };
    }
  }

  // Plafond journalier imposé aux clients des coachs (0 = illimité). Défaut 60.
  const rawLimit = String(formData.get("ai_client_daily_limit") ?? "").trim();
  let limit = 60;
  if (rawLimit) {
    const n = Number(rawLimit);
    if (Number.isInteger(n) && n >= 0 && n <= 1000) limit = n;
    else return { error: "Plafond invalide (0 à 1000, 0 = illimité)." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ ai_mode: mode, ai_client_daily_limit: limit })
    .eq("id", tenantId);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/ia-revenu");
  return { ok: true };
}

/**
 * Tarification en crédits du revendeur d'IA. DEUX types de crédits, chacun avec
 * son prix de vente (en centimes) :
 *  - crédit IA = 1 action simple (chat / recette / exercice), modèle Haiku ;
 *  - une génération de programme consomme N crédits IA (réglable), modèle Opus.
 */
export async function saveResellerCredits(_prev: ResellerAiState, formData: FormData): Promise<ResellerAiState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const tenantId = ctx.profile.tenant_id;

  const price = Number(String(formData.get("ai_credit_price_cents") ?? "").trim());
  if (!Number.isInteger(price) || price < 0 || price > 1000000) {
    return { error: "Prix du crédit IA invalide." };
  }
  // Le nombre de crédits d'une génération est une unité de compte, pas un prix.
  // Seul celui qui paie l'IA en euros la définit ; un revendeur qui achète ses
  // crédits la reçoit de son fournisseur. La garde est ICI, côté serveur, et
  // pas seulement dans le formulaire : masquer un champ n'empêche pas de le
  // poster.
  const libre = await canSetProgramCredits(tenantId);
  let programCredits: number | null = null;
  if (libre) {
    const n = Number(String(formData.get("ai_program_credits") ?? "").trim());
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      return { error: "Nombre de crédits par génération invalide (1 à 500)." };
    }
    programCredits = n;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      ai_credit_price_cents: price,
      ...(programCredits == null ? {} : { ai_program_credits: programCredits }),
    })
    .eq("id", tenantId);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/ia-revenu");
  return { ok: true };
}

/**
 * Choix du modèle de revente du revendeur : 'subscription' (Modèle A, abonnements,
 * coachs en BYOK) ou 'credits' (Modèle B, packs de crédits, clients illimités).
 * Le Modèle crédits suppose une clé Anthropic branchée (c'est elle qui alimente
 * l'IA de tout le réseau) : on l'exige, comme pour le mode fournisseur.
 */
export async function saveResellerModelChoice(_prev: ResellerAiState, formData: FormData): Promise<ResellerAiState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const tenantId = ctx.profile.tenant_id;
  const model = formData.get("reseller_model") === "credits" ? "credits" : "subscription";

  if (model === "credits") {
    const key = await tenantKeyStatus(tenantId);
    if (!key.configured) {
      return { error: "Branche d'abord ta clé Anthropic pour vendre des crédits IA." };
    }
  }

  const admin = createAdminClient();
  // En Modèle crédits, l'IA est fournie par le revendeur → on force ai_mode.
  const patch: Record<string, string> = { reseller_model: model };
  if (model === "credits") patch.ai_mode = "provider";
  const { error } = await admin.from("tenants").update(patch).eq("id", tenantId);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/ia-revenu");
  return { ok: true };
}

/**
 * Crée un pack de crédits (revendeur). Le pack peut être HYBRIDE : crédits IA et
 * Un seul type de crédit IA par pack.
 */
export async function addCreditPack(_prev: ResellerAiState, formData: FormData): Promise<ResellerAiState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const name = String(formData.get("name") ?? "");
  const credits = Math.trunc(Number(String(formData.get("credits") ?? "").trim()));
  if (!Number.isFinite(credits) || credits <= 0) return { error: "Nombre de crédits invalide." };
  const euros = String(formData.get("price_euros") ?? "").replace(",", ".").trim();
  const priceCents = Math.round(Number(euros) * 100);
  if (!Number.isFinite(priceCents) || priceCents <= 0) return { error: "Prix invalide." };
  const res = await createCreditPack(ctx.profile.tenant_id, { name, credits, priceCents });
  if (!res.ok) return { error: res.error };
  revalidatePath("/admin/ia-revenu");
  return { ok: true };
}

/** Active / désactive un pack (form action directe). */
export async function toggleCreditPack(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = Number(formData.get("id") ?? 0);
  const active = formData.get("active") === "on";
  if (!id) return;
  await setCreditPackActive(ctx.profile.tenant_id, id, active);
  revalidatePath("/admin/ia-revenu");
}

/** Supprime un pack (form action directe). */
export async function removeCreditPack(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return;
  const id = Number(formData.get("id") ?? 0);
  if (!id) return;
  await deleteCreditPack(ctx.profile.tenant_id, id);
  revalidatePath("/admin/ia-revenu");
}

// ------------------------------------------------------------------ upsell marque blanche
/** Le revendeur fixe le prix mensuel de son upsell marque blanche (0/vide = retiré). */
export async function saveWhitelabelPrice(_prev: ResellerAiState, formData: FormData): Promise<ResellerAiState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  const raw = String(formData.get("price_euros") ?? "").replace(",", ".").trim();
  let cents: number | null = null;
  if (raw) {
    const n = Math.round(Number(raw) * 100);
    if (!Number.isFinite(n) || n < 0) return { error: "Prix invalide." };
    cents = n > 0 ? n : null;
  }
  await setResellerWhitelabelPrice(ctx.profile.tenant_id, cents);
  revalidatePath("/admin/ia-revenu");
  return { ok: true };
}

// ------------------------------------------------------------------ SMTP perso (marque blanche)
export interface SmtpState {
  ok?: boolean;
  error?: string;
  tested?: boolean;
}

/** Enregistre le SMTP perso du coach (testé avant sauvegarde). Marque blanche requise. */
export async function saveSmtp(_prev: SmtpState, formData: FormData): Promise<SmtpState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  if (!secretsEncryptionReady()) {
    return { error: "Chiffrement non configuré (SECRETS_ENC_KEY manquante côté serveur)." };
  }
  const host = String(formData.get("host") ?? "").trim();
  const portRaw = String(formData.get("port") ?? "").trim();
  const user = String(formData.get("user") ?? "").trim();
  const pass = String(formData.get("pass") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();
  const port = Number(portRaw) || 587;
  if (!host || !user || !pass || !from) return { error: "Renseigne serveur, identifiant, mot de passe et adresse d'envoi." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from.replace(/^.*<|>$/g, ""))) {
    return { error: "Adresse d'envoi invalide." };
  }

  const test = await testSmtp({ host, port, user, pass, from });
  if (!test.ok) return { error: `Connexion SMTP refusée : ${test.error ?? "vérifie les identifiants."}` };

  await setTenantSmtp(ctx.profile.tenant_id, { host, port, user, pass, from });
  revalidatePath("/admin/marque-blanche");
  return { ok: true, tested: true };
}

/** Supprime le SMTP perso (retour à l'envoi par défaut de la plateforme). */
export async function removeSmtp(): Promise<SmtpState> {
  const ctx = await getAdminOrNull();
  if (!ctx?.profile?.tenant_id) return { error: "Accès refusé." };
  await clearTenantSmtp(ctx.profile.tenant_id);
  revalidatePath("/admin/marque-blanche");
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

/** Vide toutes les notifications du coach (cloche du dashboard). */
export async function clearNotifications(): Promise<void> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id;
  if (!tenantId) return;
  await clearCoachNotifications(tenantId);
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
    revalidatePath("/admin/marque-blanche");
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

  revalidatePath("/admin/marque-blanche");
  return { ok: true, value: sub };
}

// ───────────────────────── Domaine personnalisé (marque blanche totale) ─────────────────────────
export interface DomainState {
  ok?: boolean;
  error?: string;
  value?: string;
}

/** Enregistre / retire le domaine perso du coach, puis le rattache à Vercel si possible. */
export async function saveCustomDomain(_prev: DomainState, formData: FormData): Promise<DomainState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id;
  if (!tenantId) return { error: "Aucun compte (tenant) rattaché." };
  const node = await tenantNode(tenantId);
  if (node?.kind === "coach" && !(await whitelabelEnabled(tenantId))) {
    return { error: "Débloque d'abord l'option marque blanche auprès de ton revendeur." };
  }
  const raw = String(formData.get("domain") ?? "");
  const res = await setTenantCustomDomain(tenantId, raw);
  revalidatePath("/admin/marque-blanche");
  if (!res.ok) return { error: res.error, value: raw.trim() };
  return { ok: true, value: res.domain ?? "", error: res.error };
}

/** Relance la vérification (DNS + Vercel) : la page se recharge avec l'état frais. */
export async function recheckCustomDomain(): Promise<void> {
  revalidatePath("/admin/marque-blanche");
}

/** Envoie un e-mail de test au coach depuis son SMTP (ou le service par défaut). */
export async function sendTestEmail(): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getAdminOrNull();
  if (!ctx?.email) return { ok: false, error: "Accès refusé." };
  const tenantId = ctx.profile?.tenant_id ?? null;
  const ok = await sendEmail(
    {
      to: [ctx.email],
      subject: "Test d'envoi d'e-mail",
      text: "Cet e-mail confirme que l'envoi depuis ta configuration fonctionne. Tes clients recevront leurs notifications de cette adresse.",
      html: "<p>Cet e-mail confirme que l'envoi depuis ta configuration fonctionne.</p><p>Tes clients recevront leurs notifications de cette adresse.</p>",
    },
    tenantId,
  );
  return ok ? { ok: true } : { ok: false, error: "Envoi impossible. Vérifie le SMTP (ou la clé du service par défaut)." };
}

// ───────────────────────── Réseau : création & assistance ─────────────────────────

/** Origine absolue de la requête (https://host), pour des liens copiables. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

export interface CreateAccountState {
  error?: string;
  ok?: boolean;
  /** Lien de connexion à usage unique, à copier et transmettre au titulaire. */
  link?: string;
  email?: string;
  name?: string;
}

// Création manuelle d'un compte enfant depuis le dashboard réseau. La plateforme
// crée revendeurs ou coachs ; un revendeur ne crée que des coachs. On renvoie un
// lien de connexion (valable ~1 h) que l'opérateur copie et envoie.
export async function createNetworkAccount(
  _prev: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const ctx = await getAdminOrNull();
  const actorTenantId = ctx?.profile?.tenant_id ?? null;
  if (!ctx || !actorTenantId) return { error: "Session expirée. Reconnecte-toi." };
  const node = await tenantNode(actorTenantId);
  if (!node || node.kind === "coach") return { error: "Réservé à la plateforme et aux revendeurs." };

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const email = String(formData.get("email") ?? "").trim();
  const contactName = String(formData.get("contact_name") ?? "").trim().slice(0, 40);
  // Un revendeur ne crée que des coachs ; seule la plateforme crée des revendeurs.
  const wants = String(formData.get("kind") ?? "");
  const kind: "reseller" | "coach" = node.kind === "platform" && wants === "reseller" ? "reseller" : "coach";

  const aiSupply = formData.get("ai_supply") === "platform_credits" ? "platform_credits" : "byok";
  const created = await createChildTenantAccount({ parentTenantId: actorTenantId, kind, name, email, contactName, aiSupply });
  if (!created.ok) return { error: created.error, name, email };

  const origin = await requestOrigin();
  const link = origin ? await loginLinkForUser(created.userId, "/admin", origin) : null;
  revalidatePath("/admin/reseau");
  return { ok: true, email, name, link: link ?? undefined };
}

// Connexion d'assistance (« master admin ») dans un sous-compte. Réservée à la
// plateforme et aux revendeurs, uniquement vers un compte de LEUR descendance.
// Établit une vraie session dans le compte cible (l'opérateur devra se
// reconnecter à son propre espace ensuite). Tracée dans support_access_log.
export async function supportLoginAs(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  const actorTenantId = ctx?.profile?.tenant_id ?? null;
  if (!ctx || !actorTenantId) redirect("/admin/reseau?assistance=refus");
  const node = await tenantNode(actorTenantId);
  if (!node || node.kind === "coach") redirect("/admin/reseau?assistance=refus");

  const targetUserId = String(formData.get("target_user_id") ?? "").trim();
  if (!targetUserId) redirect("/admin/reseau?assistance=refus");

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", targetUserId)
    .maybeSingle<{ tenant_id: string | null }>();
  const targetTenantId = prof?.tenant_id ?? null;
  // Autorisation : la cible doit être un compte de la descendance de l'acteur.
  if (!targetTenantId || !(await isDescendantTenant(actorTenantId, targetTenantId))) {
    redirect("/admin/reseau?assistance=refus");
  }

  // Session établie directement dans l'action (les cookies partent avec la
  // réponse) : le détour par /auth/confirm perdait la session en route.
  await logSupportAccess({ actorUserId: ctx.userId, actorTenantId, targetUserId, targetTenantId });
  const ok = await establishSupportSession(targetUserId);
  if (!ok) redirect("/admin/reseau?assistance=echec");
  // Bandeau « Retour à mon espace » dans le compte cible.
  const { data: actorRow } = await admin.from("tenants").select("name").eq("id", actorTenantId).maybeSingle<{ name: string | null }>();
  await setSupportReturn({ actorUserId: ctx.userId, actorName: actorRow?.name ?? "", targetUserId });
  redirect("/admin");
}

/**
 * Mode assistance d'un COACH sur l'un de ses clients.
 *
 * Le cas d'usage est le coaching en présentiel : pendant la séance, c'est le
 * coach qui note les charges soulevées, pas l'adhérent qui a les mains prises.
 * Il ouvre donc l'espace du client et saisit à sa place.
 *
 * Même mécanique que l'assistance réseau, garde différente. Un revendeur
 * descend dans un compte de sa DESCENDANCE ; un coach reste dans SON tenant et
 * ne peut viser qu'un compte de rôle « client ». `isOwnClient` vérifie les
 * deux, ce qui interdit au passage de prendre la main sur le compte
 * propriétaire d'une salle.
 */
export async function assistClient(formData: FormData): Promise<void> {
  const ctx = await getAdminOrNull();
  const actorTenantId = ctx?.profile?.tenant_id ?? null;
  const targetUserId = String(formData.get("target_user_id") ?? "").trim();
  const refus = `/admin/clients/${targetUserId || ""}?assistance=refus`;
  if (!ctx || !actorTenantId || !targetUserId) redirect("/admin");
  if (!(await isOwnClient(actorTenantId, targetUserId))) redirect(refus);

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("name, email")
    .eq("id", targetUserId)
    .maybeSingle<{ name: string | null; email: string | null }>();

  // Tracé avant d'agir : un accès refusé plus loin laisse quand même la trace
  // de la tentative, et un accès réussi n'est jamais silencieux.
  await logSupportAccess({ actorUserId: ctx.userId, actorTenantId, targetUserId, targetTenantId: actorTenantId });
  const ok = await establishSupportSession(targetUserId);
  if (!ok) redirect(`/admin/clients/${targetUserId}?assistance=echec`);

  await setSupportReturn({
    actorUserId: ctx.userId,
    actorName: ctx.profile?.name ?? "",
    targetUserId,
    targetName: target?.name || target?.email || "",
    backTo: `/admin/clients/${targetUserId}`,
    kind: "client",
  });
  // Directement sur la séance du jour : c'est là que le coach va saisir.
  redirect("/app/seance");
}

/** Retour à l'espace de l'opérateur après une assistance (cookie signé). */
export async function returnFromSupport(): Promise<void> {
  const back = await readSupportReturn();
  await clearSupportReturn();
  if (!back) redirect("/admin");
  const ok = await establishSupportSession(back.actorUserId);
  if (!ok) redirect("/connexion");
  // Le coach revient sur la fiche du client qu'il assistait, l'opérateur
  // réseau sur sa liste de comptes.
  redirect(back.backTo ?? "/admin/reseau");
}

// ───────────────────────── Réseau : actions sur un compte enfant ─────────────────────────
export interface NetworkState {
  ok?: boolean;
  error?: string;
  done?: "suspend" | "reactivate" | "gift" | "delete" | "supply" | "plan";
}

async function networkActor(): Promise<{ ctx: NonNullable<Awaited<ReturnType<typeof getAdminOrNull>>>; tenantId: string } | null> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!ctx || !tenantId) return null;
  const node = await tenantNode(tenantId);
  if (!node || node.kind === "coach") return null;
  return { ctx, tenantId };
}

export async function networkAction(_prev: NetworkState, formData: FormData): Promise<NetworkState> {
  const actor = await networkActor();
  if (!actor) return { error: "Accès refusé." };
  const target = String(formData.get("tenant_id") ?? "").trim();
  const op = String(formData.get("op") ?? "");
  if (!target) return { error: "Compte manquant." };
  let res: { ok: boolean; error?: string };
  if (op === "suspend") res = await suspendTenant(actor.tenantId, target);
  else if (op === "reactivate") res = await reactivateTenant(actor.tenantId, target);
  else if (op === "gift") res = await giftCredits(actor.tenantId, target, Number(formData.get("amount") ?? 0));
  else if (op === "supply") {
    const supply = formData.get("supply") === "platform_credits" ? "platform_credits" : "byok";
    res = await setResellerSupply(actor.tenantId, target, supply);
  } else if (op === "plan") {
    // « gratuit » = retirer le palier, pas un identifiant à chercher en base.
    const raw = String(formData.get("plan_id") ?? "").trim();
    res = await setTenantPlan(actor.tenantId, target, raw && raw !== "gratuit" ? raw : null);
  } else if (op === "delete") {
    const expected = String(formData.get("expected_name") ?? "").trim();
    const typed = String(formData.get("confirm_name") ?? "").trim();
    if (!expected || typed.toLowerCase() !== expected.toLowerCase()) return { error: "Le nom saisi ne correspond pas." };
    res = await deleteTenantTree(actor.tenantId, target);
  } else return { error: "Action inconnue." };
  revalidatePath("/admin/reseau");
  if (!res.ok) return { error: res.error };
  return { ok: true, done: op as NetworkState["done"] };
}


// ------------------------------------------------------------------ import de fiche Google

/**
 * Import d'une fiche d'établissement Google.
 *
 * Trois actions pour trois temps : chercher, prévisualiser, appliquer. Le
 * découpage n'est pas cosmétique. Entre la prévisualisation et l'application,
 * le coach doit voir ce qui va être écrit et pouvoir le refuser bloc par bloc :
 * un import qui écrase silencieusement une page rédigée serait pire que pas
 * d'import du tout.
 *
 * Le brouillon reste côté serveur entre les deux. Il pourrait transiter par le
 * navigateur, mais ce qui reviendrait d'un formulaire ne serait plus ce qu'on
 * y avait mis : il faudrait tout revalider, et cela redemanderait la fiche au
 * service, qui facture chaque appel.
 */

export interface GoogleSearchState {
  error?: string;
  candidates?: PlaceCandidate[];
  /** Brouillon prêt à relire, une fois une fiche choisie. */
  draft?: ImportDraft;
  importId?: string;
  /** Ce qui a été écrit, une fois l'import appliqué. */
  done?: { infos: boolean; textes: boolean; photo: boolean; avis: number };
}

/**
 * Une seule action pour les trois temps, aiguillée par le champ « etape ».
 *
 * Trois actions séparées auraient trois états indépendants, et l'écran
 * finirait par en montrer deux à la fois : relancer une recherche laisserait
 * l'aperçu précédent affiché par-dessus les nouveaux résultats. Un seul état
 * rend cette situation impossible plutôt que de demander à l'affichage de la
 * démêler.
 */
export async function googleImportStep(
  prev: GoogleSearchState,
  formData: FormData,
): Promise<GoogleSearchState> {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id;
  if (!tenantId) return { error: "Accès refusé." };

  const etape = String(formData.get("etape") ?? "");

  if (etape === "chercher") {
    if (!serpApiEnabled()) return { error: "L'import Google n'est pas configuré sur cette installation." };
    const res = await searchPlaces(String(formData.get("q") ?? ""));
    // Un état neuf : le brouillon de la recherche précédente n'a plus lieu
    // d'être à l'écran.
    return res.ok ? { candidates: res.data } : { error: res.error };
  }

  if (etape === "apercu") {
    if (!serpApiEnabled()) return { error: "L'import Google n'est pas configuré sur cette installation." };
    const res = await fetchPlaceDraft(String(formData.get("data_id") ?? ""));
    if (!res.ok) return { ...prev, error: res.error };
    const importId = await saveImportDraft(tenantId, res.data);
    if (!importId) return { ...prev, error: "Impossible de préparer l'import. Réessaie." };
    return { draft: res.data, importId };
  }

  if (etape === "appliquer") {
    const importId = String(formData.get("import_id") ?? "");
    const draft = importId ? await readImportDraft(tenantId, importId) : null;
    // Le brouillon a expiré, ou il appartient à quelqu'un d'autre : dans les
    // deux cas on recommence plutôt que d'appliquer une fiche qu'on ne peut
    // pas montrer au coach.
    if (!draft) return { error: "Import expiré. Relance la recherche." };

    const res = await applyGoogleImport(
      tenantId,
      draft,
      {
        infos: formData.get("infos") === "on",
        textes: formData.get("textes") === "on",
        photoUrl: String(formData.get("photo") ?? "") || null,
        avis: formData
          .getAll("avis")
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n) && n >= 0),
      },
      fetch,
      importId,
    );
    if (!res.ok) return { ...prev, error: res.error ?? "Enregistrement impossible." };

    revalidatePath("/admin/fiche-google");
    revalidatePath("/admin/marque-blanche");
    return { done: res.applied };
  }

  return prev;
}
