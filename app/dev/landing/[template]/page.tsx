import { notFound } from "next/navigation";
import { asLandingTemplate, type Offer, type PublicTenant } from "@/lib/offers";
import { CoachOnyx } from "@/components/landing-templates/coach-onyx";
import { CoachLumen } from "@/components/landing-templates/coach-lumen";
import { CoachVolt } from "@/components/landing-templates/coach-volt";
import { CoachSage } from "@/components/landing-templates/coach-sage";
import { CoachKinetic } from "@/components/landing-templates/coach-kinetic";
import { CoachAurora } from "@/components/landing-templates/coach-aurora";
import { asLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/components/locale-provider";
import { setRequestLocale } from "@/lib/i18n/request";
import { ResellerOnyx } from "@/components/landing-templates/reseller-onyx";
import { ResellerLumen } from "@/components/landing-templates/reseller-lumen";
import type { PublicReseller } from "@/lib/reseller";
import type { Plan } from "@/lib/plans";
import { DEFAULT_THEME } from "@/lib/theme";

export const dynamic = "force-dynamic";

// Aperçu des templates de landing coach avec des données fictives, pour le
// design et les tests visuels. Désactivé sauf si LANDING_PREVIEW=1 (jamais en
// production : aucune donnée réelle, mais inutile d'exposer la route).
const DEMO_TENANT: PublicTenant = {
  id: "demo",
  name: "Studio Forme",
  slug: "demo",
  chargesEnabled: true,
  brandColor: "#e0551f",
  tagline: null,
  headline: "Transforme ton corps, encadré par un vrai coach.",
  logoUrl: null,
  faviconUrl: null,
  landingTemplate: "onyx",
  businessType: "coach",
  aboutEnabled: true,
  aboutTitle: "Léa, coach diplômée d'État",
  aboutText: "Dix ans de coaching en salle et à distance. Ma méthode : de la technique propre, de la régularité, et une nutrition qui tient dans la vraie vie.",
  aboutPhotoUrl: null,
  logoDarkUrl: null,
  theme: DEFAULT_THEME,
  seoTitle: null,
  seoDescription: null,
  // Avis fictifs, de longueurs volontairement inégales : c'est ainsi qu'ils
  // arrivent d'une vraie fiche, et c'est là que la grille se casse si les
  // cartes ne s'alignent pas par le bas.
  testimonials: [
    {
      id: "a1",
      author: "Marion T.",
      body: "Trois mois et je passe enfin la barre des 40 kg au développé couché. Le suivi hebdomadaire fait toute la différence.",
      rating: 5,
      publishedLabel: "il y a 2 mois",
      source: "google",
    },
    {
      id: "a2",
      author: "Karim B.",
      body: "Sérieux et à l'écoute.",
      rating: 5,
      publishedLabel: "il y a 5 mois",
      source: "google",
    },
    {
      id: "a3",
      author: "Sophie L.",
      body: "J'avais arrêté trois fois avant. Là j'en suis à ma huitième semaine sans en manquer une seule, parce que le programme tient compte de mes horaires décalés et que je ne me retrouve jamais devant une séance impossible.",
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

const DEMO_OFFERS: Offer[] = [
  offer({}),
  offer({ id: "o2", name: "Évolution 12 mois", duration_months: 12, price_cents: 39900, vip_chat: true, position: 1 }),
];

// Aperçu des templates revendeur : /dev/landing/reseller-onyx, /dev/landing/reseller-lumen.
const DEMO_RESELLER: PublicReseller = {
  id: "demo-reseller",
  name: "Fit Network",
  slug: "demo-reseller",
  brandColor: "#e0551f",
  tagline: null,
  headline: null,
  logoUrl: null,
  logoDarkUrl: null,
  landingTemplate: "onyx",
  theme: DEFAULT_THEME,
};

function plan(partial: Partial<Plan>): Plan {
  return {
    id: "p1",
    tenant_id: "demo-reseller",
    name: "Starter",
    price_month_cents: 3900,
    price_year_cents: 39000,
    client_limit: 10,
    setup_fee_cents: 0,
    site_included: false,
    is_active: true,
    position: 0,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

const DEMO_PLANS: Plan[] = [
  plan({}),
  plan({ id: "p2", name: "Pro", price_month_cents: 6900, price_year_cents: 69000, client_limit: 50, position: 1 }),
  plan({ id: "p3", name: "Studio", price_month_cents: 12900, price_year_cents: null, client_limit: null, setup_fee_cents: 29900, position: 2 }),
];

export default async function LandingPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ template: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  if (process.env.LANDING_PREVIEW !== "1") notFound();
  const { template } = await params;
  const sp = await searchParams;
  const locale = asLocale(sp.lang);
  if (template === "reseller-onyx" || template === "reseller-lumen") {
    setRequestLocale(locale);
    const reseller = { ...DEMO_RESELLER, landingTemplate: template === "reseller-lumen" ? ("lumen" as const) : ("onyx" as const) };
    return (
      <LocaleProvider locale={locale}>
        {template === "reseller-lumen" ? <ResellerLumen reseller={reseller} plans={DEMO_PLANS} /> : <ResellerOnyx reseller={reseller} plans={DEMO_PLANS} />}
      </LocaleProvider>
    );
  }
  setRequestLocale(locale);
  const props = { tenant: { ...DEMO_TENANT, landingTemplate: asLandingTemplate(template) }, offers: DEMO_OFFERS, leadMagnet: true, locale };
  const page = (() => {
    switch (asLandingTemplate(template)) {
      case "lumen":
        return <CoachLumen {...props} />;
      case "volt":
        return <CoachVolt {...props} />;
      case "sage":
        return <CoachSage {...props} />;
      case "kinetic":
        return <CoachKinetic {...props} />;
      case "aurora":
        return <CoachAurora {...props} />;
      default:
        return <CoachOnyx {...props} />;
    }
  })();
  // Comme la vraie page publique : sans ce fournisseur, la bascule de langue
  // s'affiche sur la locale par défaut au lieu de celle rendue.
  return <LocaleProvider locale={locale}>{page}</LocaleProvider>;
}
