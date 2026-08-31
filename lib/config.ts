// Constantes produit My Fitness App. Centralisées pour éviter les valeurs
// magiques dispersées (prix, durées) et garder une source unique.

/** Prix unique du programme, en euros. Paiement une fois pour 90 jours. */
export const PRICE_EUR = 190;

/** Montant en centimes pour Stripe (Stripe raisonne en plus petite unité). */
export const PRICE_CENTS = PRICE_EUR * 100;

export const CURRENCY = "eur";

/** Durée du programme actif : coach IA disponible, séances loggables. */
export const PROGRAM_DAYS = 90;

/** Couleur d'accent par défaut de la page publique (orange My Fitness App). */
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

/** Fenêtre de consultation en lecture seule après la fin du programme (ou après
 *  un impayé). Le plan reste lisible et exportable en PDF pendant ce délai. */
export const GRACE_DAYS = 14;

/** Dernier jour où le plan reste consultable (durée programme + grâce). */
export const ACCESS_DAYS = PROGRAM_DAYS + GRACE_DAYS;

/** Délai après un impayé d'abonnement au-delà duquel le compte client est
 *  définitivement supprimé (RGPD : on ne conserve pas des données non payées). */
export const PURGE_AFTER_DAYS = 14;

/** Plafonds d'appels au modèle (BUILD_PLAN étape 4). */
export const LIMIT_GENERATE_TOTAL = 3; // par utilisateur, au total
export const LIMIT_COACH_PER_DAY = 60; // messages par jour (défaut historique)
export const LIMIT_RECIPES_PER_DAY = 20;
export const LIMIT_ANALYZE_GYM_TOTAL = 10;

// ── Estimations de coût IA (BYOK), en USD. Fondées sur la conso RÉELLE mesurée
// (table ai_calls) et les tarifs publics Anthropic, arrondies vers le HAUT par
// prudence. Repères d'ordre de grandeur, pas une facture exacte.
//
// Tout tourne désormais sur Haiku 4.5 ($1 / $5 le M) SAUF la génération du
// programme (Opus 5, $5 / $25). Mesuré : un message chat ≈ 12k in + 150 out
// ≈ $0.013 ; une régénération de recettes ≈ 2k in + 3,8k out ≈ $0.02 ; une
// génération de programme ≈ 9k in + 12,5k out sur Opus ≈ $0.36.
/** Coût estimé d'UN message Coach IA (chat, Haiku). */
export const AI_COST_COACH_MSG_USD = 0.015;
/** Coût estimé d'UNE régénération de recettes (Haiku). */
export const AI_COST_RECIPE_USD = 0.02;
/** Coût estimé d'UNE action IA « simple » = 1 crédit (chat / recette / exercice, Haiku). */
export const AI_COST_ACTION_USD = 0.02;
/** Coût estimé d'UNE génération de programme (Opus, livrable premium). */
export const AI_COST_PROGRAM_USD = 0.4;
/** Ancien alias (échange générique) — conservé pour compat, aligné sur le chat. */
export const AI_COST_PER_MSG_USD = AI_COST_COACH_MSG_USD;
/** Coût IA d'onboarding d'un client (génération programme + analyse salle). */
export const AI_COST_ONBOARDING_USD = 0.35;
/** Coût IA récurrent estimé par client et par mois (usage typique modéré). */
export const AI_COST_PER_CLIENT_MONTH_USD = 1.5;

// Taux de conversion indicatif USD→EUR pour afficher un coût lisible en euros
// (le tarif Anthropic est en USD, la revente du revendeur en EUR). Approx.
export const USD_TO_EUR = 0.92;
export function usdToEur(usd: number): number {
  return usd * USD_TO_EUR;
}

// Hypothèses d'usage RÉALISTE pour un client engagé (≠ le plafond de sécurité).
// Sert à afficher une estimation crédible plutôt que le pire cas théorique.
/** Messages Coach IA / jour pour un client vraiment actif. */
export const AI_REALISTIC_MSG_PER_DAY = 8;
/** Jours d'activité réelle par mois (un client n'utilise pas l'app tous les jours). */
export const AI_REALISTIC_ACTIVE_DAYS = 26;
/** Recettes régénérées / jour pour un client actif (comportement réel, ≠ plafond). */
export const AI_REALISTIC_RECIPES_PER_DAY = 1;

export interface AiCostEstimate {
  /** Usage réaliste d'un client actif, par mois. */
  realMonth: number;
  /** Borne haute garantie, par mois. `null` = non borné (un plafond est illimité). */
  ceilingMonth: number | null;
}

/**
 * Estimation du coût IA mensuel par client.
 * `realMonth` : usage RÉALISTE, piloté par le comportement (≈8 messages + 1
 *   recette/jour, ~26 j/mois). Les plafonds ne le réduisent que s'ils sont plus
 *   bas que ce comportement. Ainsi, AUTORISER plus (plafond haut ou illimité) ne
 *   fait jamais monter l'estimation réaliste.
 * `ceilingMonth` : pire cas garanti = les deux plafonds saturés chaque jour sur
 *   30 jours. `null` si un plafond est sur « illimité » (0) : le coût n'est alors
 *   pas borné. `msgCap`/`recipeCap` : 0 = illimité.
 */
export function estimateAiMonthlyCost(msgCap: number, recipeCap: number): AiCostEstimate {
  const realMsgs = msgCap > 0 ? Math.min(msgCap, AI_REALISTIC_MSG_PER_DAY) : AI_REALISTIC_MSG_PER_DAY;
  const realRecipes = recipeCap > 0 ? Math.min(recipeCap, AI_REALISTIC_RECIPES_PER_DAY) : AI_REALISTIC_RECIPES_PER_DAY;
  const realMonth = (realMsgs * AI_COST_COACH_MSG_USD + realRecipes * AI_COST_RECIPE_USD) * AI_REALISTIC_ACTIVE_DAYS;

  // Borne haute seulement si les DEUX plafonds sont fixés (sinon dépense illimitée).
  const bounded = msgCap > 0 && recipeCap > 0;
  const ceilingMonth = bounded ? (msgCap * AI_COST_COACH_MSG_USD + recipeCap * AI_COST_RECIPE_USD) * 30 : null;
  return { realMonth, ceilingMonth };
}

// ── Revente de crédits IA (mode « revendeur d'IA »). DEUX types de crédits,
// réglés chacun avec son propre prix de vente (le revendeur voit coût + marge) :
//  - « crédit IA » = 1 action simple (chat / recette / exercice) — modèle Haiku ;
//  - « crédit programme IA » = 1 génération de programme — modèle Opus (plus cher).
export const DEFAULT_AI_CREDIT_PRICE_CENTS = 40; // 0,40 € / crédit IA
export const DEFAULT_AI_PROGRAM_CREDIT_PRICE_CENTS = 200; // 2,00 € / crédit programme

export interface CreditMargin {
  /** Coût Anthropic estimé (converti en €). */
  costEur: number;
  /** Ce que paie le client (en €). */
  priceEur: number;
  /** Marge du revendeur (en €). */
  marginEur: number;
  /** Marge en % du prix de vente (0 si prix nul). */
  marginPct: number;
}

function margin(costEur: number, priceEur: number): CreditMargin {
  const marginEur = priceEur - costEur;
  return { costEur, priceEur, marginEur, marginPct: priceEur > 0 ? (marginEur / priceEur) * 100 : 0 };
}

/** Coût / prix / marge d'UN crédit IA (1 action simple, Haiku). */
export function actionCreditMargin(creditPriceCents: number): CreditMargin {
  return margin(usdToEur(AI_COST_ACTION_USD), Math.max(0, creditPriceCents) / 100);
}

/** Coût / prix / marge d'UN crédit programme IA (1 génération, Opus). */
export function programCreditMargin(programPriceCents: number): CreditMargin {
  return margin(usdToEur(AI_COST_PROGRAM_USD), Math.max(0, programPriceCents) / 100);
}

export const PRODUCT_NAME = "My Fitness App";

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
  "app", "admin", "api", "auth", "c", "r", "revendeurs", "generation", "questionnaire", "salle",
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
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "") || ROOT_DOMAIN || "myfitnessapp.fit";

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
