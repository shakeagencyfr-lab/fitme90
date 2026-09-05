import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicOffersBySlug, type Offer, type PublicTenant } from "@/lib/offers";
import { asSiteTemplate, MAX_SERVICES, MAX_SITE_PHOTOS, type SiteTemplate } from "@/lib/site-templates";
import { leadMagnetEnabled } from "@/lib/prospects";
import type { OpeningDay } from "@/lib/google-import";

/**
 * Le mini-site public d'un coach : /web/<adresse>.
 *
 * DEUX PAGES, DEUX MÉTIERS. La landing /c/<slug> vend un programme en ligne :
 * elle argumente, elle chiffre, elle pousse au paiement. Ce site-ci présente
 * l'établissement : qui, quoi, où, quand, ce qu'en disent les clients. Il se
 * termine par une section qui introduit les programmes et renvoie vers la
 * landing, ce qui donne enfin une destination aux informations reprises de la
 * fiche Google : adresse, horaires, photos, avis n'avaient jusqu'ici aucune
 * page où s'afficher.
 *
 * L'adresse du site est distincte du slug de landing. Un coach nommera
 * volontiers son site « seb-coaching » et sa page de vente « transformation » ;
 * les confondre l'aurait obligé à choisir.
 */

export interface SiteService {
  title: string;
  body: string;
}

export interface PublicSite {
  /** Marque, thème, logos : la même identité que la landing. */
  tenant: PublicTenant;
  /** Offres vendables, pour la section « programmes en ligne ». */
  offers: Offer[];
  webSlug: string;
  template: SiteTemplate;
  /** Phrase d'accroche du site (à défaut, la tagline de la landing). */
  intro: string | null;
  services: SiteService[];
  photos: string[];
  programsTitle: string | null;
  programsText: string | null;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  openingHours: OpeningDay[];
  /** Catégorie Google (« salle de sport », « coach sportif »), si importée. */
  category: string | null;
  /** Le mini-programme gratuit est-il ouvert ? (bandeau de capture) */
  leadMagnet: boolean;
}

/** Normalise la liste de prestations lue en base. */
export function readServices(raw: unknown): SiteService[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => {
      if (!v || typeof v !== "object") return null;
      const o = v as Record<string, unknown>;
      const title = typeof o.title === "string" ? o.title.trim() : "";
      const body = typeof o.body === "string" ? o.body.trim() : "";
      return title ? { title: title.slice(0, 80), body: body.slice(0, 400) } : null;
    })
    .filter((v): v is SiteService => v !== null)
    .slice(0, MAX_SERVICES);
}

/**
 * Normalise la galerie.
 *
 * Seules les adresses de NOTRE stockage sont servies. Une photo Google est
 * recopiée chez nous à l'import ; laisser passer une adresse externe ferait
 * fuiter la visite de chaque lecteur vers un tiers, et l'adresse expirerait.
 */
export function readPhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === "string" && /^https:\/\/[^\s]+$/.test(v))
    .slice(0, MAX_SITE_PHOTOS);
}

/** Normalise les horaires lus en base (jour + créneau, tels que Google les écrit). */
export function readHours(raw: unknown): OpeningDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => {
      if (!v || typeof v !== "object") return null;
      const o = v as Record<string, unknown>;
      const day = typeof o.day === "string" ? o.day.trim() : "";
      const hours = typeof o.hours === "string" ? o.hours.trim() : "";
      return day && hours ? { day: day.slice(0, 24), hours: hours.slice(0, 60) } : null;
    })
    .filter((v): v is OpeningDay => v !== null)
    .slice(0, 7);
}

/**
 * Le site publiable d'une adresse, ou null.
 *
 * Rend null quand le coach n'a pas ouvert son site : un site désactivé doit
 * répondre « introuvable », pas afficher une page à moitié remplie que son
 * propriétaire croyait privée.
 */
export async function publicSiteBySlug(webSlug: string): Promise<PublicSite | null> {
  const key = webSlug.toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(key)) return null;

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tenants")
    .select(
      "id, slug, web_enabled, web_slug, web_template, web_intro, web_services, web_photos, web_programs_title, web_programs_text, address, phone, website_url, opening_hours, google_category",
    )
    .eq("web_slug", key)
    .maybeSingle<{
      id: string;
      slug: string;
      web_enabled: boolean | null;
      web_slug: string | null;
      web_template: string | null;
      web_intro: string | null;
      web_services: unknown;
      web_photos: unknown;
      web_programs_title: string | null;
      web_programs_text: string | null;
      address: string | null;
      phone: string | null;
      website_url: string | null;
      opening_hours: unknown;
      google_category: string | null;
    }>();
  if (!row || !row.web_enabled) return null;

  // La marque, le thème et les offres sont exactement ceux de la landing : un
  // coach règle son identité UNE fois, et ses deux pages la portent.
  const landing = await publicOffersBySlug(row.slug);
  if (!landing) return null;

  const leadMagnet = await leadMagnetEnabled(row.id);

  return {
    tenant: landing.tenant,
    offers: landing.offers,
    webSlug: row.web_slug ?? key,
    template: asSiteTemplate(row.web_template),
    intro: row.web_intro?.trim() || null,
    services: readServices(row.web_services),
    photos: readPhotos(row.web_photos),
    programsTitle: row.web_programs_title?.trim() || null,
    programsText: row.web_programs_text?.trim() || null,
    address: row.address,
    phone: row.phone,
    websiteUrl: row.website_url,
    openingHours: readHours(row.opening_hours),
    category: row.google_category,
    leadMagnet,
  };
}

/** Réglages du mini-site pour le tableau de bord (y compris désactivé). */
export interface SiteSettings {
  enabled: boolean;
  webSlug: string | null;
  template: SiteTemplate;
  intro: string | null;
  services: SiteService[];
  photos: string[];
  programsTitle: string | null;
  programsText: string | null;
  address: string | null;
  phone: string | null;
  websiteUrl: string | null;
  openingHours: OpeningDay[];
}

export async function siteSettings(tenantId: string): Promise<SiteSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select(
      "web_enabled, web_slug, web_template, web_intro, web_services, web_photos, web_programs_title, web_programs_text, address, phone, website_url, opening_hours",
    )
    .eq("id", tenantId)
    .maybeSingle<Record<string, unknown>>();
  return {
    enabled: !!data?.web_enabled,
    webSlug: (data?.web_slug as string | null) ?? null,
    template: asSiteTemplate(data?.web_template as string | null),
    intro: (data?.web_intro as string | null) ?? null,
    services: readServices(data?.web_services),
    photos: readPhotos(data?.web_photos),
    programsTitle: (data?.web_programs_title as string | null) ?? null,
    programsText: (data?.web_programs_text as string | null) ?? null,
    address: (data?.address as string | null) ?? null,
    phone: (data?.phone as string | null) ?? null,
    websiteUrl: (data?.website_url as string | null) ?? null,
    openingHours: readHours(data?.opening_hours),
  };
}

/**
 * L'adresse est-elle libre ?
 *
 * On vérifie les TROIS colonnes d'adressage (mini-site, landing, sous-domaine)
 * et pas seulement `web_slug`. Techniquement, `/web/x` et `/x` sont deux
 * chemins distincts et pourraient coexister ; c'est justement le problème.
 * Deux professionnels différents derrière deux adresses qui ne diffèrent que
 * par un préfixe, c'est une confusion garantie au premier bouche-à-oreille.
 *
 * Le compte lui-même est exclu de la vérification : réutiliser SON propre slug
 * de landing comme adresse de site est au contraire le choix le plus naturel.
 */
export async function webSlugAvailable(candidate: string, tenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id")
    .or(`web_slug.eq.${candidate},slug.eq.${candidate},subdomain.eq.${candidate}`)
    .neq("id", tenantId)
    .limit(1);
  return (data ?? []).length === 0;
}
