import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  OFFER_DURATIONS_MONTHS,
  MAX_OFFERS_PER_TENANT,
  type OfferDurationMonths,
} from "@/lib/config";

// Catalogue d'offres d'un tenant (coach/salle) : jusqu'à 3 formules, chacune
// avec une durée prédéfinie. Les clients choisiront leur offre plus tard (via
// la landing + le checkout) ; ici, la gestion côté coach.

export type BillingType = "one_time" | "subscription";

export interface Offer {
  id: string;
  tenant_id: string;
  name: string;
  duration_months: OfferDurationMonths;
  price_cents: number | null;
  currency: string;
  position: number;
  is_active: boolean;
  vip_chat: boolean;
  coach_ai: boolean;
  billing_type: BillingType;
  price_month_cents: number | null;
  price_year_cents: number | null;
  created_at: string;
}

const OFFER_COLS =
  "id, tenant_id, name, duration_months, price_cents, currency, position, is_active, vip_chat, coach_ai, billing_type, price_month_cents, price_year_cents, created_at";

/** Prix d'une offre pour un intervalle donné (abonnement), en centimes. */
export function subscriptionPrice(offer: Offer, interval: "month" | "year"): number | null {
  return interval === "year" ? offer.price_year_cents : offer.price_month_cents;
}

/** L'offre propose-t-elle les deux récurrences (pour le comparateur d'économies) ? */
export function hasBothIntervals(offer: Offer): boolean {
  return offer.billing_type === "subscription"
    && offer.price_month_cents != null
    && offer.price_year_cents != null;
}

export function isValidDuration(m: number): m is OfferDurationMonths {
  return (OFFER_DURATIONS_MONTHS as readonly number[]).includes(m);
}

/** Offres d'un tenant, ordonnées (pour le dashboard). */
export async function listOffers(tenantId: string): Promise<Offer[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offers")
    .select(OFFER_COLS)
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Offer[];
}

export type LandingTemplate = "onyx" | "lumen";

/** Normalise la valeur stockée en une clé de template connue (défaut onyx). */
export function asLandingTemplate(v: string | null | undefined): LandingTemplate {
  return v === "lumen" ? "lumen" : "onyx";
}

export interface PublicTenant {
  id: string;
  name: string;
  slug: string;
  chargesEnabled: boolean;
  brandColor: string | null;
  tagline: string | null;
  headline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  landingTemplate: LandingTemplate;
  aboutEnabled: boolean;
  aboutTitle: string | null;
  aboutText: string | null;
  aboutPhotoUrl: string | null;
}

export interface PublicTenantOffers {
  tenant: PublicTenant;
  offers: Offer[];
}

/**
 * Offres publiques d'un coach par son slug : uniquement les offres ACTIVES et
 * dotées d'un prix. Pour la landing publique /c/[slug].
 */
export async function publicOffersBySlug(slug: string): Promise<PublicTenantOffers | null> {
  const admin = createAdminClient();
  // On résout par slug OU par sous-domaine personnalisé (alias marque blanche).
  // L'identifiant vient de l'URL : on le restreint à des caractères sûrs avant de
  // construire le filtre `.or()` (pas d'injection dans la chaîne de filtre).
  const key = slug.toLowerCase();
  const safe = /^[a-z0-9-]{1,63}$/.test(key);
  const query = admin
    .from("tenants")
    .select(
      "id, name, slug, brand_color, tagline, headline, logo_url, favicon_url, landing_template, about_enabled, about_title, about_text, about_photo_url",
    );
  const { data: tenant } = await (safe
    ? query.or(`slug.eq.${key},subdomain.eq.${key}`)
    : query.eq("slug", slug)
  )
    .limit(1)
    .maybeSingle<{
      id: string;
      name: string;
      slug: string;
      brand_color: string | null;
      tagline: string | null;
      headline: string | null;
      logo_url: string | null;
      favicon_url: string | null;
      landing_template: string | null;
      about_enabled: boolean | null;
      about_title: string | null;
      about_text: string | null;
      about_photo_url: string | null;
    }>();
  if (!tenant) return null;

  // Le coach peut encaisser si sa clé Stripe (BYOK) est configurée.
  const { data: secret } = await admin
    .from("tenant_secrets")
    .select("stripe_key_enc")
    .eq("tenant_id", tenant.id)
    .maybeSingle<{ stripe_key_enc: string | null }>();
  const chargesEnabled = !!secret?.stripe_key_enc;

  const { data } = await admin
    .from("offers")
    .select(OFFER_COLS)
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  // On ne publie que les offres réellement vendables : un prix unique, ou au
  // moins un prix récurrent pour les abonnements.
  const sellable = ((data ?? []) as Offer[]).filter((o) =>
    o.billing_type === "subscription"
      ? o.price_month_cents != null || o.price_year_cents != null
      : o.price_cents != null,
  );

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      chargesEnabled,
      brandColor: tenant.brand_color,
      tagline: tenant.tagline,
      headline: tenant.headline,
      logoUrl: tenant.logo_url,
      faviconUrl: tenant.favicon_url,
      landingTemplate: asLandingTemplate(tenant.landing_template),
      aboutEnabled: !!tenant.about_enabled,
      aboutTitle: tenant.about_title,
      aboutText: tenant.about_text,
      aboutPhotoUrl: tenant.about_photo_url,
    },
    offers: sellable,
  };
}

/** Template de landing d'un tenant par slug/sous-domaine (requête légère). */
export async function landingTemplateBySlug(slug: string): Promise<LandingTemplate> {
  const key = (slug ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(key)) return "onyx";
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("landing_template")
    .or(`slug.eq.${key},subdomain.eq.${key}`)
    .limit(1)
    .maybeSingle<{ landing_template: string | null }>();
  return asLandingTemplate(data?.landing_template);
}

/** Une offre par son id (ou null). */
export async function getOffer(offerId: string): Promise<Offer | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("offers")
    .select(OFFER_COLS)
    .eq("id", offerId)
    .maybeSingle<Offer>();
  return (data as Offer) ?? null;
}

/**
 * Le Coach IA est-il inclus pour ce client ? Vrai s'il n'a pas d'offre
 * sélectionnée (inscription directe) ou si son offre inclut le Coach IA.
 * Faux uniquement si son offre l'exclut explicitement (upsell par plan).
 */
export async function clientCoachAiIncluded(userId: string): Promise<boolean> {
  const offer = await clientOffer(userId);
  return !offer || offer.coach_ai;
}

/** L'offre choisie par un client (via profiles.selected_offer_id), ou null. */
export async function clientOffer(userId: string): Promise<Offer | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("selected_offer_id")
    .eq("id", userId)
    .maybeSingle<{ selected_offer_id: string | null }>();
  if (!profile?.selected_offer_id) return null;
  return getOffer(profile.selected_offer_id);
}

export interface CreateOfferResult {
  ok: boolean;
  error?: string;
}

/** Crée une offre en respectant le plafond de MAX_OFFERS_PER_TENANT. */
export interface CreateOfferInput {
  name: string;
  durationMonths: number;
  vipChat?: boolean;
  coachAi?: boolean;
  billingType?: BillingType;
  /** Paiement unique */
  priceCents?: number | null;
  /** Abonnement */
  priceMonthCents?: number | null;
  priceYearCents?: number | null;
}

function validCents(c: number | null | undefined): boolean {
  return c == null || (Number.isFinite(c) && c >= 0);
}

export async function createOffer(tenantId: string, input: CreateOfferInput): Promise<CreateOfferResult> {
  const trimmed = input.name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Donne un nom à l'offre." };
  if (!isValidDuration(input.durationMonths)) {
    return { ok: false, error: "Durée non autorisée." };
  }

  const billingType: BillingType = input.billingType === "subscription" ? "subscription" : "one_time";
  const priceCents = input.priceCents ?? null;
  const priceMonthCents = input.priceMonthCents ?? null;
  const priceYearCents = input.priceYearCents ?? null;

  if (!validCents(priceCents) || !validCents(priceMonthCents) || !validCents(priceYearCents)) {
    return { ok: false, error: "Prix invalide." };
  }
  if (billingType === "subscription" && priceMonthCents == null && priceYearCents == null) {
    return { ok: false, error: "Renseigne au moins un prix (mensuel ou annuel)." };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("offers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((count ?? 0) >= MAX_OFFERS_PER_TENANT) {
    return { ok: false, error: `Maximum ${MAX_OFFERS_PER_TENANT} offres par compte.` };
  }
  const { error } = await admin.from("offers").insert({
    tenant_id: tenantId,
    name: trimmed,
    duration_months: input.durationMonths,
    billing_type: billingType,
    price_cents: billingType === "one_time" ? priceCents : null,
    price_month_cents: billingType === "subscription" ? priceMonthCents : null,
    price_year_cents: billingType === "subscription" ? priceYearCents : null,
    vip_chat: !!input.vipChat,
    coach_ai: input.coachAi !== false,
    position: count ?? 0,
  });
  if (error) return { ok: false, error: "Création impossible." };
  return { ok: true };
}

/** Active / désactive une offre (sans la supprimer). */
export async function setOfferActive(
  tenantId: string,
  offerId: string,
  active: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("offers")
    .update({ is_active: active })
    .eq("id", offerId)
    .eq("tenant_id", tenantId);
}

/** Supprime une offre du catalogue. */
export async function deleteOffer(tenantId: string, offerId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("offers").delete().eq("id", offerId).eq("tenant_id", tenantId);
}
