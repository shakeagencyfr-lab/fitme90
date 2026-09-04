import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listPlans, type Plan } from "@/lib/plans";
import { asLandingTemplate, type LandingTemplate } from "@/lib/offers";
import { normalizeTheme, withPrimary, type TenantTheme } from "@/lib/theme";

// Résolution publique d'un revendeur par son slug, pour sa landing marque
// blanche (/r/[slug]) : sa marque + les paliers qu'il propose aux coachs/salles.

export interface PublicReseller {
  id: string;
  name: string;
  slug: string;
  brandColor: string | null;
  tagline: string | null;
  headline: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  landingTemplate: LandingTemplate;
  /** Thème de marque appliqué à la landing du revendeur. */
  theme: TenantTheme;
}

export interface PublicResellerLanding {
  reseller: PublicReseller;
  plans: Plan[];
}

export async function publicResellerBySlug(slug: string): Promise<PublicResellerLanding | null> {
  const key = (slug ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(key)) return null;

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, slug, kind, app_name, brand_color, tagline, headline, logo_url, logo_dark_url, landing_template, theme")
    .eq("slug", key)
    .eq("kind", "reseller")
    .maybeSingle<{
      id: string;
      name: string;
      slug: string;
      kind: string;
      app_name: string | null;
      brand_color: string | null;
      tagline: string | null;
      headline: string | null;
      logo_url: string | null;
      logo_dark_url: string | null;
      landing_template: string | null;
      theme: unknown;
    }>();
  if (!tenant) return null;

  // Paliers vendables : actifs et avec au moins un prix.
  const plans = (await listPlans(tenant.id)).filter(
    (p) => p.is_active && (p.price_month_cents != null || p.price_year_cents != null),
  );

  return {
    reseller: {
      id: tenant.id,
      name: tenant.app_name?.trim() || tenant.name,
      slug: tenant.slug,
      brandColor: tenant.brand_color,
      tagline: tenant.tagline,
      headline: tenant.headline,
      logoUrl: tenant.logo_url,
      logoDarkUrl: tenant.logo_dark_url,
      landingTemplate: asLandingTemplate(tenant.landing_template),
      theme: withPrimary(normalizeTheme(tenant.theme), tenant.brand_color),
    },
    plans,
  };
}
