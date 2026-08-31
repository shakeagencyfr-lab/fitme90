// Constantes produit FitMe90. Centralisées pour éviter les valeurs
// magiques dispersées (prix, durées) et garder une source unique.

/** Prix unique du programme, en euros. Paiement une fois pour 90 jours. */
export const PRICE_EUR = 190;

/** Montant en centimes pour Stripe (Stripe raisonne en plus petite unité). */
export const PRICE_CENTS = PRICE_EUR * 100;

export const CURRENCY = "eur";

/** Durée du programme actif : coach IA disponible, séances loggables. */
export const PROGRAM_DAYS = 90;

/** Couleur d'accent par défaut de la page publique (orange FitMe90). */
export const DEFAULT_BRAND_COLOR = "#e0551f";

/** Durées d'offres proposables par un coach (en mois). Choix prédéfinis. */
export const OFFER_DURATIONS_MONTHS = [1, 2, 3, 6, 9, 12] as const;
export type OfferDurationMonths = (typeof OFFER_DURATIONS_MONTHS)[number];

/** Nombre max d'offres qu'un coach/salle peut proposer simultanément. */
export const MAX_OFFERS_PER_TENANT = 3;

/** Convention : 1 mois de programme = 30 jours (aligné sur un cycle ≈ 4 sem.). */
export const DAYS_PER_MONTH = 30;

/** Jours de programme pour une durée en mois (ex. 3 mois = 90 jours). */
export function programDaysForMonths(months: number): number {
  return Math.round(months * DAYS_PER_MONTH);
}

/**
 * Commission plateforme par défaut (points de base : 100 = 1 %) prélevée en
 * application_fee sur chaque paiement Connect. Surchargeable par tenant.
 * Défaut 0 : aucune commission tant que tu ne l'as pas fixée.
 */
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 0) || 0;

/** Formate un montant en centimes → « 190 € » / « 29,90 € ». */
export function formatEuros(cents: number | null | undefined): string {
  if (cents == null) return "—";
  const euros = cents / 100;
  const s = Number.isInteger(euros)
    ? String(euros)
    : euros.toFixed(2).replace(".", ",");
  return `${s} €`;
}

/** Fenêtre de consultation en lecture seule après la fin du programme. */
export const GRACE_DAYS = 30;

/** Dernier jour où le plan reste consultable (90 + 30). */
export const ACCESS_DAYS = PROGRAM_DAYS + GRACE_DAYS; // 120

/** Plafonds d'appels au modèle (BUILD_PLAN étape 4). */
export const LIMIT_GENERATE_TOTAL = 3; // par utilisateur, au total
export const LIMIT_COACH_PER_DAY = 60; // messages par jour
export const LIMIT_RECIPES_PER_DAY = 20;
export const LIMIT_ANALYZE_GYM_TOTAL = 10;

export const PRODUCT_NAME = "FitMe90";

/**
 * Domaine racine pour les sous-domaines coach (ex "fitme90.com"), sans protocole
 * ni "www". Vide tant qu'aucun domaine n'est configuré : la fonctionnalité de
 * sous-domaine reste alors inactive (le proxy ne réécrit rien). À définir dans
 * l'environnement Vercel une fois le wildcard DNS (*.domaine) en place.
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/^www\./, "")
  .replace(/\/.*$/, "");

// Segments de 1er niveau déjà utilisés par l'app : un slug coach personnalisé
// (chemin `fitme90.com/<slug>`) ne doit JAMAIS entrer en collision avec eux.
// À garder en phase avec les routes de `app/` (dossiers + groupes (auth)/(legal)).
export const RESERVED_PATH_SEGMENTS = new Set([
  "app", "admin", "api", "auth", "c", "generation", "questionnaire", "salle",
  "connexion", "inscription", "inscription-coach", "inscription-revendeur", "verifie-tes-mails", "mot-de-passe-oublie",
  "reinitialiser", "cgv", "confidentialite", "mentions-legales",
  "_next", "icons", "favicon.ico", "manifest.webmanifest", "sw.js",
  "robots.txt", "sitemap.xml",
]);

/** Sous-domaines réservés (jamais attribués à un coach). */
export const RESERVED_SUBDOMAINS = new Set([
  "www", "mail", "email", "static", "assets", "cdn", "img", "images",
  "blog", "docs", "help", "support", "status", "dashboard", "login",
  "account", "billing", "stripe", "vercel",
]);

/** Ensemble complet des slugs interdits (chemin + sous-domaine). */
const RESERVED_SLUGS = new Set<string>([...RESERVED_PATH_SEGMENTS, ...RESERVED_SUBDOMAINS]);

/** Normalise une saisie de slug (adresse personnalisée) : minuscules, tirets. */
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 40);
}

/** Un slug personnalisé est-il valide et libre (forme + non réservé) ? */
export function isValidSlug(sub: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(sub) && !RESERVED_SLUGS.has(sub);
}

/** Un segment de chemin peut-il être réécrit vers une landing coach ? */
export function isRewritablePathSegment(seg: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(seg) && !RESERVED_PATH_SEGMENTS.has(seg);
}

/** Base publique du site (sans slash final), ex "https://fitme90.com". */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

/** Nom d'hôte du site public (sans protocole), pour l'affichage "fitme90.com/xxx". */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "") || ROOT_DOMAIN || "fitme90.com";

/** URL de la landing d'un coach par son slug d'adresse personnalisée (chemin). */
export function coachPathUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const base = SITE_URL || (ROOT_DOMAIN ? `https://${ROOT_DOMAIN}` : "");
  return base ? `${base}/${slug}` : `/${slug}`;
}

/** URL complète de la landing d'un coach sur son sous-domaine (ou null). */
export function coachSubdomainUrl(sub: string | null | undefined): string | null {
  if (!sub || !ROOT_DOMAIN) return null;
  return `https://${sub}.${ROOT_DOMAIN}`;
}

/** Normalise un domaine personnalisé (premium) : hôte nu, minuscules. */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

/** Un domaine personnalisé est-il d'une forme plausible ? (validation légère) */
export function isValidDomain(d: string): boolean {
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d);
}
/** Prénom du coach IA (persona). Deviendra un réglage par tenant en marque
 *  blanche ; centralisé ici pour n'avoir qu'une seule source. */
export const COACH_NAME = "Sébastien";
/** Persona / signature du coach affichée dans l'app et les prompts. */
export const COACH_CREDENTIAL = "Coach professionnel diplômé d'État";
/** Phrase « créé par » pour la landing et les pages légales. */
export const COACH_ORIGIN =
  "coach professionnel diplômé d'État et de l'université des sports";
