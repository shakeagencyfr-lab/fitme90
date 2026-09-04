/**
 * Thème de marque d'un tenant.
 *
 * Jusqu'ici la marque blanche se résumait à une couleur d'accent. Ce module la
 * transforme en un thème complet : couleurs, typographies, arrière-plan, style
 * de cartes et rayons. Le tout tient dans une seule colonne `theme` (jsonb) du
 * tenant, et se traduit en variables CSS que le reste de l'application consomme
 * déjà (`--color-brand`, `--radius-card`, `--font-archivo`…).
 *
 * Ce fichier est PUR : aucune base, aucun `server-only`. Il est donc testable
 * de bout en bout, ce qui compte parce qu'il valide des valeurs qui finissent
 * dans du CSS. Une chaîne non filtrée dans une variable CSS, c'est une porte
 * ouverte (`url(...)`, fermeture de déclaration) : rien n'en sort qui ne vienne
 * d'une liste blanche ou d'un `#rrggbb` vérifié.
 */

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Normalise une couleur hexadécimale (#rrggbb, avec ou sans dièse), sinon null. */
export function normalizeHex(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  const withHash = t.startsWith("#") ? t : `#${t}`;
  return HEX.test(withHash) ? withHash.toLowerCase() : null;
}

// ------------------------------------------------------------------ polices

/**
 * Palette typographique. Volontairement FERMÉE, contrairement au « n'importe
 * quelle police Google » des logiciels concurrents, pour deux raisons :
 *
 *   1. Vie privée. Charger une police depuis fonts.googleapis.com envoie l'IP
 *      de chaque visiteur à Google. Un tribunal allemand a déjà jugé que cela
 *      viole le RGPD, et notre CSP l'interdit (`font-src 'self'`). Ces polices
 *      sont téléchargées au build par next/font et servies depuis notre domaine.
 *   2. Rendu. Chaque famille est ici vérifiée dans l'interface réelle : pas de
 *      coach qui découvre que sa page est illisible avec une police fantaisie.
 *
 * `stack` est le repli utilisé tant que la police n'est pas chargée, et sur les
 * surfaces qui n'ont pas les variables next/font (e-mails, PDF).
 */
export const THEME_FONTS = {
  archivo: { label: "Archivo", stack: "system-ui, sans-serif", kind: "both" },
  plex: { label: "IBM Plex Sans", stack: "system-ui, sans-serif", kind: "body" },
  inter: { label: "Inter", stack: "system-ui, sans-serif", kind: "both" },
  sora: { label: "Sora", stack: "system-ui, sans-serif", kind: "both" },
  manrope: { label: "Manrope", stack: "system-ui, sans-serif", kind: "both" },
  jakarta: { label: "Plus Jakarta Sans", stack: "system-ui, sans-serif", kind: "both" },
  grotesk: { label: "Space Grotesk", stack: "system-ui, sans-serif", kind: "both" },
  bricolage: { label: "Bricolage Grotesque", stack: "system-ui, sans-serif", kind: "heading" },
  fraunces: { label: "Fraunces", stack: "Georgia, serif", kind: "heading" },
  outfit: { label: "Outfit", stack: "system-ui, sans-serif", kind: "both" },
} as const;

export type FontKey = keyof typeof THEME_FONTS;
export const FONT_KEYS = Object.keys(THEME_FONTS) as FontKey[];

/** Familles proposées pour les titres (certaines ne conviennent qu'à ça). */
export const HEADING_FONTS = FONT_KEYS.filter((k) => THEME_FONTS[k].kind !== "body");
/** Familles proposées pour le texte courant : lisibles en petit corps. */
export const BODY_FONTS = FONT_KEYS.filter((k) => THEME_FONTS[k].kind !== "heading");

export function asFont(raw: unknown, fallback: FontKey): FontKey {
  return typeof raw === "string" && (FONT_KEYS as string[]).includes(raw) ? (raw as FontKey) : fallback;
}

// ------------------------------------------------------------------ apparence

/** Arrière-plans de page. Tous en CSS pur : aucune image à héberger. */
export const BACKGROUNDS = {
  "glow-grid": "Lueur + grille",
  glow: "Lueur",
  rays: "Éclat",
  sheen: "Reflet supérieur",
  grid: "Grille",
  lines: "Lignes",
  zigzag: "Zigzag",
  dots: "Points",
  ruled: "Ligné",
  grain: "Grain",
  plain: "Uni",
} as const;
export type BackgroundKey = keyof typeof BACKGROUNDS;
export const BACKGROUND_KEYS = Object.keys(BACKGROUNDS) as BackgroundKey[];

/** Style des cartes et surfaces. */
export const CARD_STYLES = {
  paper: "Papier",
  glass: "Verre",
  flat: "Plat",
  hairline: "Contours fins",
} as const;
export type CardKey = keyof typeof CARD_STYLES;
export const CARD_KEYS = Object.keys(CARD_STYLES) as CardKey[];

/**
 * CE QU'ON PROPOSE, distinct de ce qui reste VALIDE.
 *
 * Onze fonds et quatre styles de carte, c'était trop pour une décision qui doit
 * se prendre en dix secondes : le coach comparait des nuances au lieu de
 * choisir une direction. Le sélecteur n'en montre plus que quatre et deux.
 *
 * Les autres clés restent acceptées et continuent de s'afficher : un compte qui
 * avait choisi « Zigzag » garde sa page telle quelle. Retirer une option d'un
 * menu ne doit jamais changer une page déjà publiée.
 */
export const OFFERED_BACKGROUNDS: readonly BackgroundKey[] = ["plain", "sheen", "grid", "glow"];
export const OFFERED_CARDS: readonly CardKey[] = ["paper", "flat"];

/**
 * La liste à afficher : les options proposées, plus celle déjà retenue si elle
 * n'en fait pas partie. Sans ce complément, un coach verrait un sélecteur où
 * rien n'est coché et croirait avoir perdu son réglage.
 */
export function backgroundChoices(current: BackgroundKey): BackgroundKey[] {
  return OFFERED_BACKGROUNDS.includes(current) ? [...OFFERED_BACKGROUNDS] : [...OFFERED_BACKGROUNDS, current];
}

export function cardChoices(current: CardKey): CardKey[] {
  return OFFERED_CARDS.includes(current) ? [...OFFERED_CARDS] : [...OFFERED_CARDS, current];
}

/** Rayons des coins. */
export const CORNERS = {
  rounded: "Arrondis",
  soft: "Doux",
  sharp: "Vifs",
} as const;
export type CornerKey = keyof typeof CORNERS;
export const CORNER_KEYS = Object.keys(CORNERS) as CornerKey[];

/** Échelle du logo, en pixels de hauteur dans le menu. */
export const LOGO_MIN = 20;
export const LOGO_MAX = 64;
export const LOGO_DEFAULT = 34;

// ------------------------------------------------------------------ le thème

export interface TenantTheme {
  /** Couleur principale : boutons, liens, accents. Miroir de `brand_color`. */
  primary: string;
  /** Couleur secondaire : puces, surlignages, dégradés. */
  accent: string;
  /** Réussite (validé, payé, objectif atteint). */
  success: string;
  /** Danger (erreur, suppression, retard). */
  danger: string;
  headingFont: FontKey;
  bodyFont: FontKey;
  background: BackgroundKey;
  /** L'arrière-plan respire-t-il lentement ? Neutralisé si l'appareil demande
   *  moins d'animations. */
  backgroundMotion: boolean;
  card: CardKey;
  corners: CornerKey;
  /** Hauteur du logo dans le menu, en pixels. */
  logoScale: number;
}

export const DEFAULT_THEME: TenantTheme = {
  primary: "#e0551f",
  accent: "#17191b",
  success: "#129a72",
  danger: "#dc2626",
  headingFont: "archivo",
  bodyFont: "plex",
  background: "plain",
  backgroundMotion: false,
  card: "paper",
  corners: "rounded",
  logoScale: LOGO_DEFAULT,
};

function asKey<T extends string>(raw: unknown, keys: readonly T[], fallback: T): T {
  return typeof raw === "string" && (keys as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/**
 * Relit un thème venu de la base ou d'un formulaire. Tout ce qui n'est pas
 * reconnu retombe sur le défaut : un thème mal formé ne doit jamais casser une
 * page publique, et surtout jamais laisser passer une valeur arbitraire dans
 * une variable CSS.
 */
export function normalizeTheme(raw: unknown): TenantTheme {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const color = (k: string, def: string) =>
    (typeof o[k] === "string" ? normalizeHex(o[k] as string) : null) ?? def;
  const scale = Number(o.logoScale);
  return {
    primary: color("primary", DEFAULT_THEME.primary),
    accent: color("accent", DEFAULT_THEME.accent),
    success: color("success", DEFAULT_THEME.success),
    danger: color("danger", DEFAULT_THEME.danger),
    headingFont: asFont(o.headingFont, DEFAULT_THEME.headingFont),
    bodyFont: asFont(o.bodyFont, DEFAULT_THEME.bodyFont),
    background: asKey(o.background, BACKGROUND_KEYS, DEFAULT_THEME.background),
    backgroundMotion: o.backgroundMotion === true || o.backgroundMotion === "on",
    card: asKey(o.card, CARD_KEYS, DEFAULT_THEME.card),
    corners: asKey(o.corners, CORNER_KEYS, DEFAULT_THEME.corners),
    logoScale: Number.isFinite(scale) ? Math.min(LOGO_MAX, Math.max(LOGO_MIN, Math.round(scale))) : LOGO_DEFAULT,
  };
}

/** Un thème identique au défaut n'a pas besoin d'être écrit ni injecté. */
export function isDefaultTheme(t: TenantTheme): boolean {
  return (Object.keys(DEFAULT_THEME) as (keyof TenantTheme)[]).every((k) => t[k] === DEFAULT_THEME[k]);
}

// ------------------------------------------------------------------ palettes

export interface ColorPreset {
  key: string;
  label: string;
  primary: string;
  accent: string;
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  { key: "orange", label: "Orange par défaut", primary: "#e0551f", accent: "#17191b" },
  { key: "indigo", label: "Indigo", primary: "#5b5bd6", accent: "#1e1b3a" },
  { key: "emeraude", label: "Émeraude", primary: "#0f9d73", accent: "#0d2a22" },
  { key: "rose", label: "Rose", primary: "#e0457b", accent: "#2a1220" },
  { key: "cyan", label: "Cyan", primary: "#0891b2", accent: "#0c2a33" },
  { key: "ardoise", label: "Ardoise", primary: "#475569", accent: "#0f172a" },
];

export interface StyleTheme {
  key: string;
  label: string;
  /** Ce que le thème pose. Le reste (logo, couleurs succès/danger) est conservé. */
  patch: Pick<TenantTheme, "primary" | "accent" | "headingFont" | "bodyFont" | "background" | "card" | "corners">;
}

/**
 * Thèmes prêts à l'emploi : un clic pose typographie, couleurs et apparence
 * d'un coup. C'est la porte d'entrée pour le coach qui n'a pas d'idée précise ;
 * les réglages fins restent accessibles ensuite.
 */
/**
 * Les thèmes proposés en un clic, nommés par le TYPE DE SALLE qu'ils servent
 * plutôt que par une impression esthétique. « Nébuleuse » ou « Floraison » ne
 * disaient rien à un coach de force ; « Fonte » et « Ring » se choisissent sans
 * réfléchir.
 *
 * Chacun n'emploie que des fonds et des cartes qui figurent dans le sélecteur,
 * sans quoi cliquer un thème afficherait un réglage d'apparence introuvable
 * juste en dessous. Un test le verrouille.
 */
export const STYLE_THEMES: readonly StyleTheme[] = [
  {
    key: "origine",
    label: "Origine",
    patch: { primary: "#e0551f", accent: "#17191b", headingFont: "archivo", bodyFont: "plex", background: "plain", card: "paper", corners: "rounded" },
  },
  {
    key: "fonte",
    label: "Fonte",
    patch: { primary: "#c62828", accent: "#141517", headingFont: "bricolage", bodyFont: "jakarta", background: "grid", card: "flat", corners: "sharp" },
  },
  {
    key: "terrain",
    label: "Terrain",
    patch: { primary: "#1e7a45", accent: "#10221a", headingFont: "manrope", bodyFont: "manrope", background: "sheen", card: "paper", corners: "rounded" },
  },
  {
    key: "cadence",
    label: "Cadence",
    patch: { primary: "#0e7490", accent: "#0b2530", headingFont: "grotesk", bodyFont: "inter", background: "grid", card: "flat", corners: "rounded" },
  },
  {
    key: "studio",
    label: "Studio",
    patch: { primary: "#8a5a3c", accent: "#241c17", headingFont: "fraunces", bodyFont: "inter", background: "sheen", card: "paper", corners: "soft" },
  },
  {
    key: "ring",
    label: "Ring",
    patch: { primary: "#8e1b3a", accent: "#16090f", headingFont: "archivo", bodyFont: "inter", background: "glow", card: "flat", corners: "sharp" },
  },
];

// ------------------------------------------------------------------ variables

/** Rayons par style de coins, en pixels. */
const RADII: Record<CornerKey, { control: number; btn: number; btnLg: number; card: number; cardLg: number }> = {
  rounded: { control: 9, btn: 10, btnLg: 11, card: 14, cardLg: 16 },
  soft: { control: 14, btn: 16, btnLg: 18, card: 22, cardLg: 26 },
  sharp: { control: 2, btn: 2, btnLg: 3, card: 3, cardLg: 4 },
};

/**
 * Variables CSS à poser sur le conteneur du thème. Les noms sont ceux que
 * l'application utilise déjà : aucun composant n'a besoin d'être réécrit pour
 * suivre le thème d'un coach.
 *
 * `--font-archivo` et `--font-plex` portent des noms historiques ; ce sont en
 * réalité « la police des titres » et « celle du texte ». On les remappe plutôt
 * que de renommer des centaines d'usages.
 */
export function themeVars(t: TenantTheme): Record<string, string> {
  const r = RADII[t.corners];
  return {
    "--color-brand": t.primary,
    "--color-brand-hover": `color-mix(in srgb, ${t.primary} 85%, #000)`,
    "--color-accent": t.accent,
    "--color-ok": t.success,
    "--color-danger": t.danger,
    "--font-archivo": `var(--font-wl-${t.headingFont})`,
    "--font-plex": `var(--font-wl-${t.bodyFont})`,
    "--radius-control": `${r.control}px`,
    "--radius-btn": `${r.btn}px`,
    "--radius-btn-lg": `${r.btnLg}px`,
    "--radius-card": `${r.card}px`,
    "--radius-card-lg": `${r.cardLg}px`,
    "--wl-logo-h": `${t.logoScale}px`,
  };
}

/** Attributs de données lus par les règles d'apparence de globals.css. */
export function themeAttrs(t: TenantTheme): Record<string, string> {
  return {
    "data-wl-bg": t.background,
    "data-wl-card": t.card,
    ...(t.backgroundMotion && t.background !== "plain" ? { "data-wl-motion": "on" } : {}),
  };
}

/**
 * Réconcilie le thème avec la colonne historique `brand_color`.
 *
 * La couleur principale existe à deux endroits : dans le thème, et dans
 * `tenants.brand_color` que lisent le manifest PWA, les e-mails et plusieurs
 * pages qui ignorent tout du thème. `brand_color` fait foi, et le thème s'y
 * aligne à la lecture : quel que soit le formulaire utilisé pour la changer,
 * aucune surface n'affiche une couleur périmée.
 */
export function withPrimary(theme: TenantTheme, brandColor: string | null | undefined): TenantTheme {
  const c = brandColor ? normalizeHex(brandColor) : null;
  return c ? { ...theme, primary: c } : theme;
}
