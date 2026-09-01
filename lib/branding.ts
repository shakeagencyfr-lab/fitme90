import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Personnalisation de la page publique du coach : couleur, textes, logo,
// favicon et section « à propos » optionnelle (portrait + paragraphe).

export interface Branding {
  brandColor: string | null;
  tagline: string | null;
  headline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  aboutEnabled: boolean;
  aboutTitle: string | null;
  aboutText: string | null;
  aboutPhotoUrl: string | null;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Normalise une couleur hex (#rrggbb) ou renvoie null. */
/** Couleur d'accent d'un coach par son slug (pour brander les pages auth), ou null. */
export async function accentForSlug(slug: string): Promise<string | null> {
  if (!slug) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("brand_color")
    .eq("slug", slug)
    .maybeSingle<{ brand_color: string | null }>();
  return data?.brand_color ?? null;
}

export function normalizeColor(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withHash = t.startsWith("#") ? t : `#${t}`;
  return HEX.test(withHash) ? withHash.toLowerCase() : null;
}

// Marque « publique » minimale d'un coach : ce qu'il faut pour habiller l'app en
// marque blanche (logo, favicon, couleur, nom). Sert aux pages auth, à l'app, au
// questionnaire, à la génération et au manifest PWA.
export interface PublicBrand {
  name: string;
  slug: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandColor: string | null;
}

interface BrandRow {
  name: string;
  slug: string;
  brand_color: string | null;
  logo_url: string | null;
  favicon_url: string | null;
}

const BRAND_COLS = "name, slug, brand_color, logo_url, favicon_url";

function toPublicBrand(d: BrandRow | null): PublicBrand | null {
  if (!d) return null;
  return {
    name: d.name,
    slug: d.slug,
    logoUrl: d.logo_url,
    faviconUrl: d.favicon_url,
    brandColor: d.brand_color,
  };
}

/** Marque d'un coach par son slug (pages auth arrivant depuis /c/[slug]). */
export async function brandForSlug(slug: string): Promise<PublicBrand | null> {
  if (!slug) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select(BRAND_COLS).eq("slug", slug).maybeSingle<BrandRow>();
  return toPublicBrand(data);
}

/** Marque du coach auquel appartient un utilisateur connecté (app en marque blanche). */
export async function brandForUser(userId: string): Promise<PublicBrand | null> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null }>();
  if (!prof?.tenant_id) return null;
  const { data } = await admin.from("tenants").select(BRAND_COLS).eq("id", prof.tenant_id).maybeSingle<BrandRow>();
  return toPublicBrand(data);
}

const COLS =
  "brand_color, tagline, headline, logo_url, favicon_url, about_enabled, about_title, about_text, about_photo_url";

interface Row {
  brand_color: string | null;
  tagline: string | null;
  headline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  about_enabled: boolean | null;
  about_title: string | null;
  about_text: string | null;
  about_photo_url: string | null;
}

function toBranding(d: Row | null): Branding {
  return {
    brandColor: d?.brand_color ?? null,
    tagline: d?.tagline ?? null,
    headline: d?.headline ?? null,
    logoUrl: d?.logo_url ?? null,
    faviconUrl: d?.favicon_url ?? null,
    aboutEnabled: !!d?.about_enabled,
    aboutTitle: d?.about_title ?? null,
    aboutText: d?.about_text ?? null,
    aboutPhotoUrl: d?.about_photo_url ?? null,
  };
}

export async function tenantBranding(tenantId: string): Promise<Branding> {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select(COLS).eq("id", tenantId).maybeSingle<Row>();
  return toBranding(data);
}

/** Marque affichée dans le bandeau d'un dashboard (nom + logo + accent). */
export interface DashboardBrand {
  name: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  /** Favicon chargé dans « Marque blanche » : icône d'onglet et d'application. */
  faviconUrl: string | null;
}

/**
 * Marque de la PLATEFORME (tenant racine) : favicon et logo chargés dans sa
 * section « Marque blanche ». C'est le repli de toutes les pages sans marque
 * plus précise (accueil, auth sans slug, dashboards de la plateforme).
 */
export async function platformBrand(): Promise<DashboardBrand | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("name, logo_url, brand_color, favicon_url")
    .eq("kind", "platform")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ name: string | null; logo_url: string | null; brand_color: string | null; favicon_url: string | null }>();
  if (!data) return null;
  return { name: data.name, logoUrl: data.logo_url, brandColor: data.brand_color, faviconUrl: data.favicon_url };
}

/**
 * Marque du tenant PARENT — celle qui doit habiller le dashboard d'un tenant.
 * Un coach voit la marque de son revendeur ; un revendeur celle de la plateforme.
 * Renvoie null si le tenant n'a pas de parent (plateforme) : le bandeau retombe
 * alors sur le wordmark My Fitness App par défaut.
 */
export async function parentDashboardBrand(tenantId: string | null): Promise<DashboardBrand | null> {
  if (!tenantId) return null;
  const admin = createAdminClient();
  const { data: self } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ parent_id: string | null }>();
  if (!self?.parent_id) return null;
  const { data: parent } = await admin
    .from("tenants")
    .select("name, logo_url, brand_color, favicon_url")
    .eq("id", self.parent_id)
    .maybeSingle<{ name: string | null; logo_url: string | null; brand_color: string | null; favicon_url: string | null }>();
  if (!parent) return null;
  return { name: parent.name, logoUrl: parent.logo_url, brandColor: parent.brand_color, faviconUrl: parent.favicon_url };
}

export interface SaveBrandingResult {
  ok: boolean;
  error?: string;
}

/** Enregistre les textes / couleur / activation de la section « à propos ». */
export async function saveTenantBranding(
  tenantId: string,
  input: {
    brandColor: string;
    tagline: string;
    headline: string;
    aboutEnabled: boolean;
    aboutTitle: string;
    aboutText: string;
  },
): Promise<SaveBrandingResult> {
  const colorRaw = input.brandColor.trim();
  const brand_color = colorRaw ? normalizeColor(colorRaw) : null;
  if (colorRaw && !brand_color) {
    return { ok: false, error: "Couleur invalide (format attendu : #e0551f)." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      brand_color,
      tagline: input.tagline.trim().slice(0, 160) || null,
      headline: input.headline.trim().slice(0, 90) || null,
      about_enabled: input.aboutEnabled,
      about_title: input.aboutTitle.trim().slice(0, 90) || null,
      about_text: input.aboutText.trim().slice(0, 1200) || null,
    })
    .eq("id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}

const ASSET_COLUMN = {
  logo: "logo_url",
  favicon: "favicon_url",
  portrait: "about_photo_url",
} as const;
export type AssetKind = keyof typeof ASSET_COLUMN;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);
const MAX_BYTES = 3 * 1024 * 1024; // 3 Mo

function extFor(type: string): string {
  if (type.includes("png")) return "png";
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("svg")) return "svg";
  if (type.includes("icon")) return "ico";
  return "bin";
}

/** Téléverse un asset (logo / favicon / portrait) et enregistre son URL. */
export async function uploadTenantAsset(
  tenantId: string,
  kind: AssetKind,
  file: File,
): Promise<SaveBrandingResult> {
  if (!file || file.size === 0) return { ok: false, error: "Aucun fichier." };
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Format non supporté (PNG, JPG, WEBP, SVG ou ICO)." };
  }
  if (file.size > MAX_BYTES) return { ok: false, error: "Fichier trop lourd (3 Mo max)." };

  const admin = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${tenantId}/${kind}-${Date.now()}.${extFor(file.type)}`;
  const { error: upErr } = await admin.storage
    .from("tenant-assets")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return { ok: false, error: "Téléversement impossible." };

  const url = admin.storage.from("tenant-assets").getPublicUrl(path).data.publicUrl;
  const { error } = await admin
    .from("tenants")
    .update({ [ASSET_COLUMN[kind]]: url })
    .eq("id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}

/** Supprime la référence d'un asset (sans effacer le fichier du bucket). */
export async function clearTenantAsset(tenantId: string, kind: AssetKind): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenants").update({ [ASSET_COLUMN[kind]]: null }).eq("id", tenantId);
}
