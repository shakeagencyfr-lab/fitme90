import "server-only";
import { asLocale, isLocale, type Locale } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeHex, normalizeTheme, withPrimary, type TenantTheme } from "@/lib/theme";

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
  /** Langue par défaut des clients (fr | en). */
  language: Locale;
  /** Identité écrite : ce qui s'affiche dans les en-têtes, e-mails et pieds de page. */
  identity: BrandIdentity;
  /** Thème complet (couleurs, polices, apparence). */
  theme: TenantTheme;
  /** Logo pour fond sombre, icône carrée d'application. */
  logoDarkUrl: string | null;
  appIconUrl: string | null;
}

/**
 * Identité écrite de la marque. Séparée du visuel parce qu'elle sort de l'écran :
 * ces valeurs partent dans les e-mails transactionnels, les métadonnées de la
 * page publique et les mentions légales. Tous les champs sont facultatifs et
 * retombent sur le nom du tenant.
 */
export interface BrandIdentity {
  /** Nom de l'application chez ce tenant (en-têtes, e-mails, onglet). */
  appName: string | null;
  /** Raison sociale, pour les pieds de page et les mentions légales. */
  legalName: string | null;
  /** Adresse de contact et d'expédition affichée aux clients. */
  supportEmail: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

const EMPTY_IDENTITY: BrandIdentity = {
  appName: null, legalName: null, supportEmail: null,
  termsUrl: null, privacyUrl: null, seoTitle: null, seoDescription: null,
};

/** Normalise une couleur hex (#rrggbb) ou renvoie null. Voir lib/theme. */
export const normalizeColor = normalizeHex;

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

// Marque « publique » minimale d'un coach : ce qu'il faut pour habiller l'app en
// marque blanche (logo, favicon, couleur, nom). Sert aux pages auth, à l'app, au
// questionnaire, à la génération et au manifest PWA.
export interface PublicBrand {
  /** Nom affiché : `app_name` s'il est posé, sinon le nom du tenant. */
  name: string;
  slug: string | null;
  logoUrl: string | null;
  /** Variante du logo pour fond sombre (le logo clair y disparaîtrait). */
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  /** Icône carrée : écran d'accueil PWA, menu replié. */
  appIconUrl: string | null;
  brandColor: string | null;
  theme: TenantTheme;
  identity: BrandIdentity;
}

interface BrandRow {
  name: string;
  slug: string;
  brand_color: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  app_icon_url: string | null;
  theme: unknown;
  app_name: string | null;
  legal_name: string | null;
  support_email: string | null;
  terms_url: string | null;
  privacy_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

const IDENTITY_COLS = "app_name, legal_name, support_email, terms_url, privacy_url, seo_title, seo_description";
const BRAND_COLS = `name, slug, brand_color, logo_url, logo_dark_url, favicon_url, app_icon_url, theme, ${IDENTITY_COLS}`;

function toIdentity(d: Partial<BrandRow> | null): BrandIdentity {
  if (!d) return EMPTY_IDENTITY;
  return {
    appName: d.app_name ?? null,
    legalName: d.legal_name ?? null,
    supportEmail: d.support_email ?? null,
    termsUrl: d.terms_url ?? null,
    privacyUrl: d.privacy_url ?? null,
    seoTitle: d.seo_title ?? null,
    seoDescription: d.seo_description ?? null,
  };
}

/**
 * La couleur d'accent historique (`brand_color`) et la couleur principale du
 * thème sont le MÊME réglage vu de deux endroits. `brand_color` fait foi : il
 * est écrit par l'ancien formulaire, lu par le manifest PWA et par du code qui
 * ignore tout du thème. On l'y réinjecte à la lecture pour qu'aucune surface
 * n'affiche une couleur périmée, quel que soit le formulaire utilisé.
 */
function themeOf(d: { theme?: unknown; brand_color?: string | null } | null): TenantTheme {
  return withPrimary(normalizeTheme(d?.theme), d?.brand_color);
}

function toPublicBrand(d: BrandRow | null): PublicBrand | null {
  if (!d) return null;
  return {
    name: d.app_name?.trim() || d.name,
    slug: d.slug,
    logoUrl: d.logo_url,
    logoDarkUrl: d.logo_dark_url,
    faviconUrl: d.favicon_url,
    appIconUrl: d.app_icon_url,
    brandColor: d.brand_color,
    theme: themeOf(d),
    identity: toIdentity(d),
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
  `brand_color, tagline, headline, logo_url, logo_dark_url, favicon_url, app_icon_url, about_enabled, about_title, about_text, about_photo_url, language, theme, ${IDENTITY_COLS}`;

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
  language?: string | null;
  logo_dark_url?: string | null;
  app_icon_url?: string | null;
  theme?: unknown;
  app_name?: string | null;
  legal_name?: string | null;
  support_email?: string | null;
  terms_url?: string | null;
  privacy_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

function toBranding(d: Row | null): Branding {
  return {
    language: asLocale(d?.language),
    brandColor: d?.brand_color ?? null,
    tagline: d?.tagline ?? null,
    headline: d?.headline ?? null,
    logoUrl: d?.logo_url ?? null,
    faviconUrl: d?.favicon_url ?? null,
    aboutEnabled: !!d?.about_enabled,
    aboutTitle: d?.about_title ?? null,
    aboutText: d?.about_text ?? null,
    aboutPhotoUrl: d?.about_photo_url ?? null,
    logoDarkUrl: d?.logo_dark_url ?? null,
    appIconUrl: d?.app_icon_url ?? null,
    theme: themeOf(d),
    identity: toIdentity(d),
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
  logoDarkUrl: string | null;
  brandColor: string | null;
  /** Favicon chargé dans « Marque blanche » : icône d'onglet et d'application. */
  faviconUrl: string | null;
  /** Thème du parent : c'est lui qui habille le dashboard de ses filleuls. */
  theme: TenantTheme;
}

const DASH_COLS = "name, logo_url, logo_dark_url, brand_color, favicon_url, theme";

interface DashRow {
  name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  brand_color: string | null;
  favicon_url: string | null;
  theme: unknown;
}

function toDashboardBrand(d: DashRow | null): DashboardBrand | null {
  if (!d) return null;
  return {
    name: d.name,
    logoUrl: d.logo_url,
    logoDarkUrl: d.logo_dark_url,
    brandColor: d.brand_color,
    faviconUrl: d.favicon_url,
    theme: themeOf(d),
  };
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
    .select(DASH_COLS)
    .eq("kind", "platform")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<DashRow>();
  return toDashboardBrand(data);
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
    .select(DASH_COLS)
    .eq("id", self.parent_id)
    .maybeSingle<DashRow>();
  return toDashboardBrand(parent);
}

export interface SaveBrandingResult {
  ok: boolean;
  error?: string;
}

/** Enregistre les textes / couleur / activation de la section « à propos ». */
export async function saveTenantBranding(
  tenantId: string,
  input: {
    /** Absent = ne pas toucher à la couleur (c'est le studio de thème qui la
     *  pilote désormais ; ce formulaire ne doit pas l'effacer au passage). */
    brandColor?: string;
    tagline: string;
    headline: string;
    aboutEnabled: boolean;
    aboutTitle: string;
    aboutText: string;
    /** Langue par défaut des clients de ce tenant (fr | en). */
    language?: string;
  },
): Promise<SaveBrandingResult> {
  const colorRaw = input.brandColor?.trim();
  const brand_color = colorRaw ? normalizeColor(colorRaw) : null;
  if (colorRaw && !brand_color) {
    return { ok: false, error: "Couleur invalide (format attendu : #e0551f)." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      ...(input.brandColor === undefined ? {} : { brand_color }),
      tagline: input.tagline.trim().slice(0, 160) || null,
      headline: input.headline.trim().slice(0, 90) || null,
      about_enabled: input.aboutEnabled,
      about_title: input.aboutTitle.trim().slice(0, 90) || null,
      about_text: input.aboutText.trim().slice(0, 1200) || null,
      ...(isLocale(input.language) ? { language: input.language } : {}),
    })
    .eq("id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}

const ASSET_COLUMN = {
  logo: "logo_url",
  "logo-dark": "logo_dark_url",
  favicon: "favicon_url",
  "app-icon": "app_icon_url",
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
  // Un favicon ou une icône d'application se découpe en rond sur l'écran
  // d'accueil : sans transparence, le JPG y laisse un carré blanc.
  if ((kind === "favicon" || kind === "app-icon") && file.type.includes("jpeg")) {
    return { ok: false, error: "Le JPG n'a pas de fond transparent. Utilise un PNG, un WEBP ou un SVG." };
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

// ------------------------------------------------------------------ identité écrite

/**
 * Une adresse http(s) et rien d'autre. Ces valeurs finissent dans un attribut
 * `href` servi aux clients du coach : un `javascript:` accepté ici serait une
 * faille XSS offerte à quiconque a un compte revendeur.
 */
function safeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

/** Adresse e-mail plausible, sans prétendre la valider mieux qu'un envoi réel. */
function safeEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/.test(t) && t.length <= 190 ? t : null;
}

const cut = (v: string, n: number) => v.trim().slice(0, n) || null;

/** Enregistre l'identité écrite de la marque (noms, contact, liens, SEO). */
export async function saveTenantIdentity(
  tenantId: string,
  input: Record<keyof BrandIdentity, string>,
): Promise<SaveBrandingResult> {
  const terms = input.termsUrl.trim();
  const privacy = input.privacyUrl.trim();
  const email = input.supportEmail.trim();
  const termsUrl = terms ? safeUrl(terms) : null;
  const privacyUrl = privacy ? safeUrl(privacy) : null;
  const supportEmail = email ? safeEmail(email) : null;

  if (terms && !termsUrl) return { ok: false, error: "Lien des conditions invalide (il doit commencer par https://)." };
  if (privacy && !privacyUrl) return { ok: false, error: "Lien de confidentialité invalide (il doit commencer par https://)." };
  if (email && !supportEmail) return { ok: false, error: "Adresse de support invalide." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({
      app_name: cut(input.appName, 60),
      legal_name: cut(input.legalName, 120),
      support_email: supportEmail,
      terms_url: termsUrl,
      privacy_url: privacyUrl,
      seo_title: cut(input.seoTitle, 70),
      seo_description: cut(input.seoDescription, 180),
    })
    .eq("id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}

// ------------------------------------------------------------------ thème

/**
 * Enregistre le thème. La couleur principale est écrite AUSSI dans
 * `brand_color`, la colonne historique : le manifest PWA, les e-mails et
 * plusieurs pages la lisent directement, et deux sources de vérité finiraient
 * par diverger. Le thème reste maître, `brand_color` en est le reflet.
 */
export async function saveTenantTheme(tenantId: string, raw: unknown): Promise<SaveBrandingResult> {
  const theme = normalizeTheme(raw);
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ theme, brand_color: theme.primary })
    .eq("id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}
