import { notFound } from "next/navigation";
import { asLandingTemplate, type Offer, type PublicTenant } from "@/lib/offers";
import { CoachOnyx } from "@/components/landing-templates/coach-onyx";
import { CoachLumen } from "@/components/landing-templates/coach-lumen";
import { CoachVolt } from "@/components/landing-templates/coach-volt";
import { CoachSage } from "@/components/landing-templates/coach-sage";
import { asLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/components/locale-provider";
import { setRequestLocale } from "@/lib/i18n/request";
import { ResellerOnyx } from "@/components/landing-templates/reseller-onyx";
import { ResellerLumen } from "@/components/landing-templates/reseller-lumen";
import type { PublicReseller } from "@/lib/reseller";
import type { Plan } from "@/lib/plans";

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
  aboutEnabled: true,
  aboutTitle: "Léa, coach diplômée d'État",
  aboutText: "Dix ans de coaching en salle et à distance. Ma méthode : de la technique propre, de la régularité, et une nutrition qui tient dans la vraie vie.",
  aboutPhotoUrl: null,
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
  landingTemplate: "onyx",
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
  const props = { tenant: { ...DEMO_TENANT, landingTemplate: asLandingTemplate(template) }, offers: DEMO_OFFERS, leadMagnet: true, locale };
  switch (asLandingTemplate(template)) {
    case "lumen":
      return <CoachLumen {...props} />;
    case "volt":
      return <CoachVolt {...props} />;
    case "sage":
      return <CoachSage {...props} />;
    default:
      return <CoachOnyx {...props} />;
  }
}
