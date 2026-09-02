import { notFound } from "next/navigation";
import { asLandingTemplate, type Offer, type PublicTenant } from "@/lib/offers";
import { CoachOnyx } from "@/components/landing-templates/coach-onyx";
import { CoachLumen } from "@/components/landing-templates/coach-lumen";
import { CoachVolt } from "@/components/landing-templates/coach-volt";
import { CoachSage } from "@/components/landing-templates/coach-sage";
import { asLocale } from "@/lib/i18n";

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
