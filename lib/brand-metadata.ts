import "server-only";
import type { Metadata } from "next";
import { brandForSlug, brandForUser, type PublicBrand } from "@/lib/branding";

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

/** Pour les pages de l'app (client connecté) : marque via son tenant. */
export async function brandMetadataForUser(userId: string | null, baseTitle: string): Promise<Metadata> {
  const brand = userId ? await brandForUser(userId) : null;
  return metaFor(brand, baseTitle);
}
