import "server-only";
import type { Metadata } from "next";
import { brandForSlug, brandForUser, parentDashboardBrand, platformBrand, type PublicBrand } from "@/lib/branding";
import { PRODUCT_NAME, iconUrl } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { whitelabelEnabled } from "@/lib/whitelabel";

// Métadonnées (titre + favicon d'onglet) adaptées au coach, en marque blanche.
// Le favicon du coach devient l'icône d'onglet ; sinon on garde celui de My Fitness App.

function metaFor(brand: PublicBrand | null, baseTitle: string): Metadata {
  const suffix = brand?.name ?? "My Fitness App";
  const meta: Metadata = { title: `${baseTitle}, ${suffix}` };
  if (brand?.faviconUrl) {
    meta.icons = { icon: [{ url: brand.faviconUrl }], apple: [{ url: brand.faviconUrl }] };
    meta.applicationName = brand.name;
  }
  return meta;
}

/** Pour les pages arrivant depuis /c/[slug] ou /r/[slug] (auth) : marque via le
 *  slug. `c` = coach/salle, `r` = revendeur ; brandForSlug résout les deux. */
export async function brandMetadata(
  searchParams: Promise<{ c?: string; r?: string }>,
  baseTitle: string,
): Promise<Metadata> {
  const sp = await searchParams;
  const slug = sp.c ?? sp.r;
  const brand = slug ? await brandForSlug(slug) : null;
  return metaFor(brand, baseTitle);
}

/**
 * Pour les pages de l'app (client connecté) : marque via son tenant.
 *
 * L'onglet porte le nom et le favicon du coach : c'est son socle. Mais l'icône
 * « apple-touch » et le nom d'application servent à l'INSTALLATION sur iOS,
 * et l'application installée au nom du coach fait partie du pack marque
 * blanche. Sans le pack, ces deux-là viennent de qui héberge le coach.
 */
export async function brandMetadataForUser(userId: string | null, baseTitle: string): Promise<Metadata> {
  if (!userId) return metaFor(null, baseTitle);
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null }>();
  const coachTenantId = prof?.tenant_id ?? null;
  const [brand, packed] = await Promise.all([brandForUser(userId), whitelabelEnabled(coachTenantId)]);
  const meta = metaFor(brand, baseTitle);
  if (!brand || packed) return meta;

  const host = (await parentDashboardBrand(coachTenantId)) ?? (await platformBrand());
  const hostName = host?.name ?? PRODUCT_NAME;
  meta.icons = {
    icon: brand.faviconUrl
      ? [{ url: brand.faviconUrl }]
      : [{ url: iconUrl("/icons/favicon-32.png"), sizes: "32x32", type: "image/png" }],
    apple: [{ url: host?.faviconUrl ?? iconUrl("/icons/apple-touch-icon.png") }],
  };
  meta.applicationName = hostName;
  meta.appleWebApp = { capable: true, title: hostName, statusBarStyle: "default" };
  return meta;
}
