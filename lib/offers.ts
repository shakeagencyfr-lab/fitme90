import "server-only";
import { tenantAiReady } from "@/lib/ai-readiness";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_OFFERS_PER_TENANT, isProductDuration } from "@/lib/config";
import { normalizeTheme, withPrimary, type TenantTheme } from "@/lib/theme";
import { PRODUCT_NAME } from "@/lib/config";
import { whitelabelAccess } from "@/lib/whitelabel";
import { poweredByHiddenFor } from "@/lib/whitelabel-rules";

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
  /**
   * Le plan VIT : ses clients y ont accès et il peut en recevoir de nouveaux.
   * Désactiver coupe l'accès de tout le monde.
   */
  is_active: boolean;
  /**
   * Le plan est VISIBLE sur la page publique de vente.
   *
   * Distinct de `is_active` parce qu'un plan sur mesure existe : le coach le
   * retire de sa vitrine et continue d'y inscrire lui-même les clients
   * concernés. Confondre les deux l'obligeait à choisir entre exposer un plan
   * privé et couper l'accès de ceux qui sont dessus.
   */
  is_listed: boolean;
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
  "id, tenant_id, name, duration_months, price_cents, currency, position, is_active, is_listed, vip_chat, coach_ai, coach_ai_daily_limit, recipe_ai_daily_limit, billing_type, price_month_cents, price_year_cents, created_at";

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
  /**
   * Le badge « Propulsé par » du pied de page : le nom de qui héberge ce
   * coach (son revendeur, sinon la plateforme). Null quand le coach a le pack
   * marque blanche et a choisi de le retirer.
   */
  poweredBy: { name: string } | null;
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
      "id, name, slug, parent_id, app_name, brand_color, tagline, headline, logo_url, logo_dark_url, favicon_url, landing_template, business_type, about_enabled, about_title, about_text, about_photo_url, theme, seo_title, seo_description, google_rating, google_reviews_count, google_maps_url",
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
      parent_id: string | null;
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
  const [{ data: secret }, aiReady, poweredBy] = await Promise.all([
    admin
      .from("tenant_secrets")
      .select("stripe_key_enc")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{ stripe_key_enc: string | null }>(),
    tenantAiReady(tenant.id),
    poweredByFor(tenant.id, tenant.parent_id),
  ]);
  const chargesEnabled = !!secret?.stripe_key_enc && aiReady;

  const [{ data }, { data: avis }] = await Promise.all([
    admin
      .from("offers")
      .select(OFFER_COLS)
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      // Un plan masqué reste vivant pour ses clients, mais ne s'affiche pas :
      // c'est ce qui permet au coach de garder un plan sur mesure hors vitrine.
      .eq("is_listed", true)
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
      poweredBy,
    },
    offers: sellable,
  };
}

/**
 * Le nom qui signe le badge « Propulsé par » d'un coach : son revendeur (au
 * nom d'application qu'il s'est donné, sinon son nom), ou la plateforme.
 */
export async function poweredByNameFor(tenantId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: self } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ parent_id: string | null }>();
  return hostName(self?.parent_id ?? null);
}

async function hostName(parentId: string | null): Promise<string> {
  const admin = createAdminClient();
  const query = admin.from("tenants").select("name, app_name");
  const { data } = await (parentId
    ? query.eq("id", parentId)
    : query.eq("kind", "platform").order("created_at", { ascending: true }).limit(1)
  ).maybeSingle<{ name: string | null; app_name: string | null }>();
  return data?.app_name?.trim() || data?.name?.trim() || PRODUCT_NAME;
}

/**
 * Le badge du pied de page, ou null si le coach a le pack marque blanche ET a
 * choisi de le retirer. Le pack se relit ici, sur le chemin public : un pack
 * qui tombe fait revenir le badge sans que personne n'ait rien à faire.
 */
async function poweredByFor(tenantId: string, parentId: string | null): Promise<{ name: string } | null> {
  const access = await whitelabelAccess(tenantId);
  if (poweredByHiddenFor(access)) return null;
  return { name: await hostName(parentId) };
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

/**
 * Les programmes qu'un client de ce coach peut choisir lui-même : actifs, en
 * vitrine, et avec au moins un prix. Un plan privé (retiré de la vitrine)
 * reste réservé aux inscriptions faites à la main par le coach.
 */
export async function chooseableOffers(tenantId: string): Promise<Offer[]> {
  const all = await listOffers(tenantId);
  return all.filter(
    (o) => o.is_active && o.is_listed && ((o.price_cents ?? 0) > 0 || (o.price_month_cents ?? 0) > 0),
  );
}

/**
 * Rattache un client à un programme de SON coach, tant qu'il n'a pas payé.
 *
 * Un client arrivé sans offre (lien de parrainage, inscription directe sur
 * la page du coach) doit pouvoir en choisir une au moment de payer ; sans
 * ça, il tombait sur le tarif générique de la plateforme, qui n'est pas
 * celui de son coach. Le WHERE porte le tenant : un identifiant d'offre
 * d'un autre coach ne passe pas.
 */
export async function assignOfferToClient(userId: string, offerId: string): Promise<CreateOfferResult> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id, paid")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null; paid: boolean | null }>();
  if (!prof?.tenant_id) return { ok: false, error: "Aucun coach rattaché." };
  if (prof.paid) return { ok: false, error: "Programme déjà débloqué." };
  const offers = await chooseableOffers(prof.tenant_id);
  const offer = offers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, error: "Programme introuvable." };
  const { error } = await admin.from("profiles").update({ selected_offer_id: offer.id }).eq("id", userId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}

/** Crée une offre en respectant le plafond de MAX_OFFERS_PER_TENANT. */
export interface CreateOfferInput {
  name: string;
  durationMonths: number;
  vipChat?: boolean;
  coachAi?: boolean;
  /** Quota journalier d'actions IA par client (0 = illimité, null = défaut du coach). */
  coachAiDailyLimit?: number | null;
  /**
   * Un programme se paie EN UNE FOIS (`priceCents`) et/ou EN N MENSUALITÉS
   * (`priceMonthCents` × durée en mois). Au moins un des deux. Avec les deux,
   * la page de vente montre une bascule, et le coach peut rendre le paiement
   * en une fois plus avantageux.
   */
  priceCents?: number | null;
  priceMonthCents?: number | null;
  /** Historique : plus proposé à la création. */
  priceYearCents?: number | null;
  /** Historique : dérivé des prix quand il n'est pas donné. */
  billingType?: BillingType;
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

  const priceCents = input.priceCents && input.priceCents > 0 ? input.priceCents : null;
  const priceMonthCents = input.priceMonthCents && input.priceMonthCents > 0 ? input.priceMonthCents : null;

  if (!validCents(input.priceCents) || !validCents(input.priceMonthCents)) {
    return { ok: false, error: "Prix invalide." };
  }
  if (priceCents == null && priceMonthCents == null) {
    return { ok: false, error: "Renseigne au moins un prix : en une fois, ou par mois." };
  }
  // La colonne survit pour les lectures d'avant : « one_time » dès qu'on peut
  // payer en une fois (les cartes cadeaux et l'achat offert en dépendent),
  // « subscription » quand seules les mensualités existent.
  const billingType: BillingType = priceCents != null ? "one_time" : "subscription";

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
    price_cents: priceCents,
    price_month_cents: priceMonthCents,
    price_year_cents: null,
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
}

/**
 * Modifie un plan existant. Le tenant est dans le WHERE et pas seulement
 * vérifié avant : un identifiant d'offre volé ne suffit pas à éditer le plan
 * d'un autre coach.
 *
 * LE PRIX N'EST PLUS MODIFIABLE, et c'est un retrait volontaire. Il décrit ce
 * que les clients déjà inscrits ont payé : le changer réécrit après coup le
 * contrat d'une vente conclue, sans qu'aucun d'eux le sache. Pour vendre à un
 * autre tarif, on crée un nouveau plan et on masque l'ancien de la vitrine
 * (`is_listed`) : les clients en cours gardent le leur, la page publique ne
 * montre que le nouveau, et l'ancien reste disponible pour une inscription
 * faite à la main.
 *
 * Restent modifiables les réglages qui n'engagent pas de prix : le nom, le
 * Coach IA et son quota. Ce dernier est relu à chaque message
 * (lib/coach-ai-budget.ts), il change donc immédiatement pour tout le monde,
 * clients déjà inscrits compris.
 */
export async function updateOffer(
  tenantId: string,
  offerId: string,
  input: UpdateOfferInput,
): Promise<CreateOfferResult> {
  const trimmed = input.name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, error: "Donne un nom au plan." };
  if (!offerId) return { ok: false, error: "Plan introuvable." };

  const coachAi = input.coachAi !== false;
  const admin = createAdminClient();
  const { error, count } = await admin
    .from("offers")
    .update(
      {
        name: trimmed,
        vip_chat: !!input.vipChat,
        coach_ai: coachAi,
        // Coach IA décoché : le quota n'a plus d'objet, on le remet à null
        // plutôt que de laisser un nombre orphelin qui réapparaîtrait au
        // rallumage.
        coach_ai_daily_limit:
          coachAi && input.coachAiDailyLimit != null && Number.isFinite(input.coachAiDailyLimit)
            ? Math.max(0, Math.min(1000, Math.trunc(input.coachAiDailyLimit)))
            : null,
      },
      { count: "exact" },
    )
    .eq("id", offerId)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: "Modification impossible." };
  if (!count) return { ok: false, error: "Plan introuvable." };
  return { ok: true };
}

/**
 * Affiche ou masque un plan sur la page publique, sans toucher à sa vie.
 *
 * Masquer n'est pas désactiver : le plan continue de servir ses clients et
 * d'en accepter de nouveaux inscrits à la main, il quitte seulement la
 * vitrine.
 */
export async function setOfferListed(
  tenantId: string,
  offerId: string,
  listed: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("offers")
    .update({ is_listed: listed })
    .eq("id", offerId)
    .eq("tenant_id", tenantId);
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
