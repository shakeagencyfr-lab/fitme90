import "server-only";
import { tenantAiReady } from "@/lib/ai-readiness";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_OFFERS_PER_TENANT, isProductDuration } from "@/lib/config";
import { normalizeTheme, withPrimary, type TenantTheme } from "@/lib/theme";

// Catalogue d'offres d'un tenant (coach/salle) : jusqu'à 3 formules, chacune
// avec une durée prédéfinie. Les clients choisiront leur offre plus tard (via
// la landing + le checkout) ; ici, la gestion côté coach.

export type BillingType = "one_time" | "subscription";

export interface Offer {
  id: string;
  tenant_id: string;
  name: string;
  /** 3 ou 12 pour les deux produits ; 1, 2, 6, 9 sur les offres héritées. */
  duration_months: number;
  price_cents: number | null;
  currency: string;
  position: number;
  is_active: boolean;
  vip_chat: boolean;
  coach_ai: boolean;
  /** Quota journalier d'actions IA par client sur CE plan (null = réglage général du coach). */
  coach_ai_daily_limit: number | null;
  /** Régénérations de recettes / jour / client (0 = illimité, null = défaut). */
  recipe_ai_daily_limit: number | null;
  billing_type: BillingType;
  price_month_cents: number | null;
  price_year_cents: number | null;
  created_at: string;
}

const OFFER_COLS =
  "id, tenant_id, name, duration_months, price_cents, currency, position, is_active, vip_chat, coach_ai, coach_ai_daily_limit, recipe_ai_daily_limit, billing_type, price_month_cents, price_year_cents, created_at";

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

/** Une offre ne se crée plus que sur l'un des deux produits (3 ou 12 mois). */
export function isValidDuration(m: number): boolean {
  return isProductDuration(m);
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

// Le registre des templates vit dans un module sans « server-only » : le
// sélecteur côté client en a besoin à l'exécution. Réexporté ici pour ne pas
// casser les imports existants.
import { LANDING_TEMPLATES, PREMIUM_TEMPLATES, asLandingTemplate, type LandingTemplate } from "@/lib/landing-templates";
export { LANDING_TEMPLATES, PREMIUM_TEMPLATES, asLandingTemplate };
export type { LandingTemplate };

/**
 * Nature du commerce. Choisit le DISCOURS de la landing publique : un coach
 * indépendant vend sa signature, une salle vend son équipe et son parc de
 * machines. Aucun effet sur les droits ni la facturation.
 */
export type BusinessType = "coach" | "gym";
export const BUSINESS_TYPES: readonly BusinessType[] = ["coach", "gym"] as const;

export function asBusinessType(v: string | null | undefined): BusinessType {
  return v === "gym" ? "gym" : "coach";
}
/** Un témoignage affiché sur la page publique. */
export interface PublicTestimonial {
  id: string;
  author: string;
  body: string;
  rating: number | null;
  /** Date telle que la source l'écrit (« il y a 2 mois »), jamais réinterprétée. */
  publishedLabel: string | null;
  /** « google » quand l'avis vient d'une fiche importée, sinon saisi à la main. */
  source: string | null;
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
  businessType: BusinessType;
  aboutEnabled: boolean;
  aboutTitle: string | null;
  aboutText: string | null;
  aboutPhotoUrl: string | null;
  /** Variante du logo pour fond sombre (les templates Onyx / Volt en ont besoin). */
  logoDarkUrl: string | null;
  /** Thème de marque : couleurs, polices, apparence de la page publique. */
  theme: TenantTheme;
  /** Métadonnées de référencement, si le coach les a renseignées. */
  seoTitle: string | null;
  seoDescription: string | null;
  /** Témoignages actifs, dans l'ordre choisi. */
  testimonials: PublicTestimonial[];
  /** Note Google de l'établissement, quand sa fiche a été importée. */
  googleRating: number | null;
  googleReviewsCount: number | null;
  googleMapsUrl: string | null;
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
      "id, name, slug, app_name, brand_color, tagline, headline, logo_url, logo_dark_url, favicon_url, landing_template, business_type, about_enabled, about_title, about_text, about_photo_url, theme, seo_title, seo_description, google_rating, google_reviews_count, google_maps_url",
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
      app_name: string | null;
      brand_color: string | null;
      tagline: string | null;
      headline: string | null;
      logo_url: string | null;
      favicon_url: string | null;
      landing_template: string | null;
      business_type: string | null;
      about_enabled: boolean | null;
      about_title: string | null;
      about_text: string | null;
      about_photo_url: string | null;
      logo_dark_url: string | null;
      theme: unknown;
      seo_title: string | null;
      seo_description: string | null;
      google_rating: number | null;
      google_reviews_count: number | null;
      google_maps_url: string | null;
    }>();
  if (!tenant) return null;

  // Deux conditions pour vendre, et non une seule. L'encaissement ne suffit
  // pas : sans IA disponible au bout de la chaîne de fourniture, le client
  // paierait un programme que l'application ne saurait pas générer.
  const [{ data: secret }, aiReady] = await Promise.all([
    admin
      .from("tenant_secrets")
      .select("stripe_key_enc")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{ stripe_key_enc: string | null }>(),
    tenantAiReady(tenant.id),
  ]);
  const chargesEnabled = !!secret?.stripe_key_enc && aiReady;

  const [{ data }, { data: avis }] = await Promise.all([
    admin
      .from("offers")
      .select(OFFER_COLS)
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("position", { ascending: true }),
    admin
      .from("testimonials")
      .select("id, author, body, rating, published_label, source")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("position", { ascending: true })
      .limit(12)
      .returns<{
        id: string;
        author: string;
        body: string;
        rating: number | null;
        published_label: string | null;
        source: string | null;
      }[]>(),
  ]);

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
      // Le nom d'application, quand il est posé, remplace le nom du compte
      // partout où le visiteur voit la marque.
      name: tenant.app_name?.trim() || tenant.name,
      slug: tenant.slug,
      chargesEnabled,
      brandColor: tenant.brand_color,
      tagline: tenant.tagline,
      headline: tenant.headline,
      logoUrl: tenant.logo_url,
      faviconUrl: tenant.favicon_url,
      landingTemplate: asLandingTemplate(tenant.landing_template),
      businessType: asBusinessType(tenant.business_type),
      aboutEnabled: !!tenant.about_enabled,
      aboutTitle: tenant.about_title,
      aboutText: tenant.about_text,
      aboutPhotoUrl: tenant.about_photo_url,
      logoDarkUrl: tenant.logo_dark_url,
      // `brand_color` fait foi sur la couleur principale : c'est la colonne que
      // lisent le manifest PWA et l'ancien formulaire.
      theme: withPrimary(normalizeTheme(tenant.theme), tenant.brand_color),
      seoTitle: tenant.seo_title,
      seoDescription: tenant.seo_description,
      testimonials: (avis ?? []).map((a) => ({
        id: a.id,
        author: a.author,
        body: a.body,
        rating: a.rating,
        publishedLabel: a.published_label,
        source: a.source,
      })),
      googleRating: tenant.google_rating,
      googleReviewsCount: tenant.google_reviews_count,
      googleMapsUrl: tenant.google_maps_url,
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
  /** Quota journalier d'actions IA par client (0 = illimité, null = défaut du coach). */
  coachAiDailyLimit?: number | null;
  /** Régénérations de recettes / jour / client (0 = illimité, null = défaut). */
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
    return { ok: false, error: "Choisis un produit : 3 mois ou 12 mois." };
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
    coach_ai_daily_limit:
      input.coachAi !== false && input.coachAiDailyLimit != null && Number.isFinite(input.coachAiDailyLimit)
        ? Math.max(0, Math.min(1000, Math.trunc(input.coachAiDailyLimit)))
        : null,
    // La colonne survit pour les offres créées avant l'unification, mais on
    // n'écrit plus dedans : un seul quota couvre désormais les trois actions.
    recipe_ai_daily_limit: null,
    position: count ?? 0,
  });
  if (error) return { ok: false, error: "Création impossible." };
  return { ok: true };
}

/**
 * Ce qu'un coach peut changer sur un plan DÉJÀ CRÉÉ.
 *
 * Deux champs manquent délibérément : `durationMonths` et `billingType`. Ils ne
 * décrivent pas un réglage, ils décrivent ce qui a été VENDU. Faire passer un
 * plan de 3 à 12 mois recalculerait la fenêtre d'accès de tous les clients déjà
 * inscrits dessus, et basculer un paiement unique en abonnement laisserait des
 * abonnements Stripe rattachés à un plan qui n'en est plus un. Pour changer
 * l'un ou l'autre, on crée un nouveau plan : les clients en cours gardent le
 * leur, ce qui est exactement le comportement attendu.
 */
export interface UpdateOfferInput {
  name: string;
  vipChat?: boolean;
  coachAi?: boolean;
  /** Quota journalier de messages au Coach IA par client (0 = illimité, null = défaut du coach). */
  coachAiDailyLimit?: number | null;
  priceCents?: number | null;
  priceMonthCents?: number | null;
  priceYearCents?: number | null;
}

/**
 * Modifie un plan existant. Le tenant est dans le WHERE et pas seulement
 * vérifié avant : un identifiant d'offre volé ne suffit pas à éditer le plan
 * d'un autre coach.
 *
 * Les prix écrits ici valent pour les PROCHAINS acheteurs. Un abonnement Stripe
 * déjà en cours reste sur le prix auquel il a été souscrit, c'est Stripe qui le
 * porte, pas cette ligne. Le quota Coach IA, lui, est relu à chaque message
 * (lib/coach-ai-budget.ts) : il change immédiatement pour tout le monde, y
 * compris les clients déjà inscrits.
 */
export async function updateOffer(
  tenantId: string,
  offerId: string,
  input: UpdateOfferInput,
): Promise<CreateOfferResult> {
  const trimmed = input.name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Donne un nom au plan." };
  if (!offerId) return { ok: false, error: "Plan introuvable." };

  const admin = createAdminClient();
  // On relit le plan pour connaître son mode de paiement : c'est lui qui décide
  // quelle colonne de prix a un sens, et il n'est pas modifiable ici.
  const { data: current } = await admin
    .from("offers")
    .select("id, billing_type")
    .eq("id", offerId)
    .eq("tenant_id", tenantId)
    .maybeSingle<{ id: string; billing_type: BillingType }>();
  if (!current) return { ok: false, error: "Plan introuvable." };

  const priceCents = input.priceCents ?? null;
  const priceMonthCents = input.priceMonthCents ?? null;
  const priceYearCents = input.priceYearCents ?? null;
  if (!validCents(priceCents) || !validCents(priceMonthCents) || !validCents(priceYearCents)) {
    return { ok: false, error: "Prix invalide." };
  }
  if (current.billing_type === "subscription" && priceMonthCents == null && priceYearCents == null) {
    return { ok: false, error: "Renseigne au moins un prix (mensuel ou annuel)." };
  }

  const coachAi = input.coachAi !== false;
  const { error } = await admin
    .from("offers")
    .update({
      name: trimmed,
      price_cents: current.billing_type === "one_time" ? priceCents : null,
      price_month_cents: current.billing_type === "subscription" ? priceMonthCents : null,
      price_year_cents: current.billing_type === "subscription" ? priceYearCents : null,
      vip_chat: !!input.vipChat,
      coach_ai: coachAi,
      // Coach IA décoché : le quota n'a plus d'objet, on le remet à null plutôt
      // que de laisser un nombre orphelin qui réapparaîtrait au rallumage.
      coach_ai_daily_limit:
        coachAi && input.coachAiDailyLimit != null && Number.isFinite(input.coachAiDailyLimit)
          ? Math.max(0, Math.min(1000, Math.trunc(input.coachAiDailyLimit)))
          : null,
    })
    .eq("id", offerId)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: "Modification impossible." };
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
