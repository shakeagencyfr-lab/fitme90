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
  created_at: string;
}

const OFFER_COLS =
  "id, tenant_id, name, duration_months, price_cents, currency, position, is_active, vip_chat, created_at";

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
  const { data: tenant } = await admin
    .from("tenants")
    .select(
      "id, name, slug, brand_color, tagline, headline, logo_url, favicon_url, about_enabled, about_title, about_text, about_photo_url",
    )
    .eq("slug", slug)
    .maybeSingle<{
      id: string;
      name: string;
      slug: string;
      brand_color: string | null;
      tagline: string | null;
      headline: string | null;
      logo_url: string | null;
      favicon_url: string | null;
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
    .not("price_cents", "is", null)
    .order("position", { ascending: true });

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
      aboutEnabled: !!tenant.about_enabled,
      aboutTitle: tenant.about_title,
      aboutText: tenant.about_text,
      aboutPhotoUrl: tenant.about_photo_url,
    },
    offers: (data ?? []) as Offer[],
  };
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
export async function createOffer(
  tenantId: string,
  name: string,
  durationMonths: number,
  priceCents: number | null,
  vipChat = false,
): Promise<CreateOfferResult> {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Donne un nom à l'offre." };
  if (!isValidDuration(durationMonths)) {
    return { ok: false, error: "Durée non autorisée." };
  }
  if (priceCents != null && (!Number.isFinite(priceCents) || priceCents < 0)) {
    return { ok: false, error: "Prix invalide." };
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
    duration_months: durationMonths,
    price_cents: priceCents,
    vip_chat: vipChat,
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
