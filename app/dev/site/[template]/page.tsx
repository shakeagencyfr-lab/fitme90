import { notFound } from "next/navigation";
import { asSiteTemplate } from "@/lib/site-templates";
import type { PublicSite } from "@/lib/site";
import type { Offer, PublicTenant } from "@/lib/offers";
import { SiteAtelier } from "@/components/site-templates/site-atelier";
import { SiteNocturne } from "@/components/site-templates/site-nocturne";
import { SiteVitrine } from "@/components/site-templates/site-vitrine";
import { asLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/components/locale-provider";
import { setRequestLocale } from "@/lib/i18n/request";
import { DEFAULT_THEME } from "@/lib/theme";

export const dynamic = "force-dynamic";

// Aperçu des habillages du mini-site avec des données fictives, pour le design
// et les tests visuels. Désactivé sauf si LANDING_PREVIEW=1 : aucune donnée
// réelle n'y transite, mais inutile d'exposer la route en production.
//
// Les données de démonstration sont volontairement INÉGALES : un avis d'une
// ligne à côté d'un avis de cinq, une prestation sans description, un jour de
// fermeture. C'est ainsi qu'arrive une vraie fiche, et c'est exactement là que
// les grilles se cassent.

const DEMO_TENANT: PublicTenant = {
  id: "demo",
  name: "Studio Forme",
  slug: "demo",
  chargesEnabled: true,
  brandColor: "#e0551f",
  tagline: "Coaching individuel et petits groupes, à Nice.",
  headline: "Studio Forme",
  logoUrl: null,
  faviconUrl: null,
  landingTemplate: "onyx",
  businessType: "coach",
  aboutEnabled: true,
  aboutTitle: "Léa, coach diplômée d'État",
  aboutText:
    "Dix ans de coaching en salle et à distance. Ma méthode tient en trois mots : technique propre, régularité, et une nutrition qui tient dans la vraie vie.\n\nLe studio est privatisé pendant les séances individuelles. Pas d'attente, pas de regard, pas de musique qu'on subit.",
  aboutPhotoUrl: null,
  logoDarkUrl: null,
  theme: DEFAULT_THEME,
  seoTitle: null,
  seoDescription: null,
  poweredBy: { name: "Forge Fit" },
  testimonials: [
    {
      id: "a1",
      author: "Marion T.",
      body: "Trois mois et je passe enfin la barre des 40 kg au développé couché. Le suivi hebdomadaire fait toute la différence.",
      rating: 5,
      publishedLabel: "il y a 2 mois",
      source: "google",
    },
    { id: "a2", author: "Karim B.", body: "Sérieux et à l'écoute.", rating: 5, publishedLabel: "il y a 5 mois", source: "google" },
    {
      id: "a3",
      author: "Sophie L.",
      body: "J'avais arrêté trois fois avant. Là j'en suis à ma huitième semaine sans en manquer une seule, parce que le programme tient compte de mes horaires décalés.",
      rating: 4,
      publishedLabel: "il y a 1 an",
      source: "google",
    },
  ],
  googleRating: 4.8,
  googleReviewsCount: 214,
  googleMapsUrl: "https://www.google.com/maps",
};

function offer(partial: Partial<Offer>): Offer {
  return {
    id: "o1",
    tenant_id: "demo",
    name: "Transformation 3 mois",
    duration_months: 3,
    price_cents: 14900,
    currency: "eur",
    position: 0,
    is_active: true,
    is_listed: true,
    vip_chat: false,
    coach_ai: true,
    coach_ai_daily_limit: null,
    recipe_ai_daily_limit: null,
    billing_type: "one_time",
    price_month_cents: null,
    price_year_cents: null,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

const DEMO_SITE: PublicSite = {
  tenant: DEMO_TENANT,
  offers: [offer({}), offer({ id: "o2", name: "Évolution 12 mois", duration_months: 12, price_cents: 39900, position: 1 })],
  webSlug: "demo",
  template: "atelier",
  intro: "Un studio privatisé au coeur de Nice, pour progresser sans se blesser et sans y passer ses soirées.",
  services: [
    { title: "Séance individuelle", body: "Une heure en face à face, technique corrigée en direct." },
    { title: "Duo", body: "À deux, même exigence, tarif partagé." },
    { title: "Bilan de départ", body: "" },
  ],
  photos: [],
  programsTitle: null,
  programsText: null,
  address: "2 Avenue Saint-Augustin, 06200 Nice",
  phone: "04 93 00 00 00",
  websiteUrl: "https://exemple.fr",
  openingHours: [
    { day: "Lundi", hours: "07:00 - 20:00" },
    { day: "Mardi", hours: "07:00 - 20:00" },
    { day: "Mercredi", hours: "09:00 - 18:00" },
    { day: "Jeudi", hours: "07:00 - 20:00" },
    { day: "Vendredi", hours: "07:00 - 17:00" },
    { day: "Samedi", hours: "09:00 - 13:00" },
    { day: "Dimanche", hours: "Fermé" },
  ],
  category: "Coach sportif",
  leadMagnet: true,
};

export default async function SitePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ template: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  const { template } = await params;
  const locale = asLocale((await searchParams).lang);
  setRequestLocale(locale);

  const site = { ...DEMO_SITE, template: asSiteTemplate(template) };
  const props = { site, locale };
  const page =
    site.template === "nocturne" ? <SiteNocturne {...props} />
    : site.template === "vitrine" ? <SiteVitrine {...props} />
    : <SiteAtelier {...props} />;

  return <LocaleProvider locale={locale}>{page}</LocaleProvider>;
}
