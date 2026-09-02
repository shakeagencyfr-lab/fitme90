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

/**
 * DEUX PRODUITS, pas six durées. Un coach vend « 3 mois » (un objectif, une
 * date) ou « 12 mois » (le programme qui apprend de toi, 4 blocs de 3 mois).
 * Ce sont les seules durées qu'une offre peut porter à la création.
 */
export const OFFER_DURATIONS_MONTHS = [3, 12] as const;
export type OfferDurationMonths = (typeof OFFER_DURATIONS_MONTHS)[number];

/**
 * Durées d'offres créées AVANT le passage à deux produits (1, 2, 6, 9 mois).
 * Toujours lisibles et servies (un client en cours ne doit rien perdre), mais
 * plus proposées à la création.
 */
export const LEGACY_OFFER_DURATIONS_MONTHS = [1, 2, 6, 9] as const;

export function isProductDuration(m: number): m is OfferDurationMonths {
  return (OFFER_DURATIONS_MONTHS as readonly number[]).includes(m);
}

/** Fréquences d'entraînement proposées : chacune a son gabarit de programme. */
export const SESSIONS_PER_WEEK = [2, 3, 4, 5] as const;
export type SessionsPerWeek = (typeof SESSIONS_PER_WEEK)[number];

/** Ramène un nombre de jours quelconque sur une fréquence qui a un gabarit. */
export function clampSessionsPerWeek(n: number): SessionsPerWeek {
  if (!Number.isFinite(n)) return 3;
  const v = Math.round(n);
  return (v <= 2 ? 2 : v >= 5 ? 5 : v) as SessionsPerWeek;
}

/** Un bloc = 3 cycles de 4 semaines ≈ 90 jours. Le 12 mois en enchaîne quatre. */
export const BLOCK_MONTHS = 3;
export const CYCLES_PER_BLOCK = 3;

export interface ProductDef {
  months: OfferDurationMonths;
  /** Nom par défaut proposé au coach (il reste libre de le changer). */
  name: string;
  /** La promesse, en une ligne : c'est elle qui vend, pas la durée. */
  promise: string;
  /** Ce que le client comprend en une phrase. */
  pitch: string;
  /** Arguments affichés sur la carte de vente. */
  bullets: string[];
  /** Nombre de blocs de 3 mois. */
  blocks: number;
}

export const PRODUCTS: Record<OfferDurationMonths, ProductDef> = {
  3: {
    months: 3,
    name: "Transformation 3 mois",
    promise: "Un objectif, une date",
    pitch: "Dans 12 semaines, tu vois la différence.",
    bullets: [
      "3 cycles de 4 semaines qui montent en intensité",
      "Programme et nutrition jour par jour",
      "Coach IA pendant 90 jours",
    ],
    blocks: 1,
  },
  12: {
    months: 12,
    name: "Évolution 12 mois",
    promise: "Le programme qui apprend de toi",
    pitch: "Ce n'est pas un PDF, c'est un coach qui te suit toute l'année.",
    bullets: [
      "4 blocs de 3 mois, chacun reconstruit sur tes résultats réels",
      "L'orientation change en cours d'année : bases, volume, force, pic",
      "Nutrition qui suit ta courbe de poids",
      "Coach IA pendant 12 mois",
    ],
    blocks: 4,
  },
};

/** Produit d'une durée, ou null pour une durée héritée (1, 2, 6, 9 mois). */
export function productFor(months: number): ProductDef | null {
  return isProductDuration(months) ? PRODUCTS[months] : null;
}

/** Équivalent mensuel d'un prix unique (arrondi au centime), pour l'ancrage. */
export function monthlyEquivalentCents(priceCents: number, months: number): number {
  if (!Number.isFinite(priceCents) || priceCents <= 0 || months <= 0) return 0;
  return Math.round(priceCents / months);
}

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
  if (cents == null) return "n.c.";
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

// ── Estimations de coût IA (BYOK), en USD. MESURÉES sur la table `ai_calls`
// après la mise en cache du prompt coach, puis arrondies vers le HAUT par
// prudence. Repères d'ordre de grandeur, pas une facture exacte.
//
// Tout tourne sur Haiku 4.5 ($1 / $5 le M) SAUF la génération de programme
// (Opus 5, $5 / $25). Le prompt du coach est mis en cache : une lecture coûte
// 10 % d'un token d'entrée, une écriture 125 %. D'où l'écart entre le premier
// message d'une session, qui écrit le cache, et les suivants qui le lisent.
//
// Mesures par appel :
//   message coach, 1er d'une session  0,0097 $   (écriture du cache)
//   message coach, suivants           0,0021 $   (lecture du cache)
//   message déclenchant un outil      0,0048 $
//   alternative d'exercice            0,0011 $
//   régénération de recettes          0,0099 $
//   adaptation du programme           0,0706 $   (1 crédit + 10 crédits)
//   génération de programme (Opus)    0,3882 $
//   résumé de mémoire (cron nocturne) 0,0029 $   par client actif et par jour
/** Coût estimé d'UN message Coach IA. Moyenne d'une session réelle : une
 * écriture de cache pour deux à trois lectures. */
export const AI_COST_COACH_MSG_USD = 0.005;
/** Coût estimé d'UNE régénération de recettes (3 recettes détaillées). Son coût
 * vient de la SORTIE, que le cache ne réduit pas. */
export const AI_COST_RECIPE_USD = 0.01;
/** Coût estimé d'UNE action IA « simple » = 1 crédit. Aligné sur l'action
 * courante la PLUS chère (la recette), les autres coûtant moins. */
export const AI_COST_ACTION_USD = 0.01;
/** Coût estimé d'UNE génération de programme (Opus, livrable premium). */
export const AI_COST_PROGRAM_USD = 0.4;
/** Ancien alias (échange générique) — conservé pour compat, aligné sur le chat. */
export const AI_COST_PER_MSG_USD = AI_COST_COACH_MSG_USD;
/** Coût IA d'onboarding d'un client (génération programme + analyse salle). */
export const AI_COST_ONBOARDING_USD = 0.4;
/**
 * Coût MOYEN d'un crédit consommé, mesuré sur le mix réel d'actions : environ
 * 208 messages de chat pour 26 recettes sur un mois type, plus la mémoire.
 * C'est la bonne base pour simuler une marge, alors que AI_COST_ACTION_USD
 * décrit l'action la PLUS chère prise isolément (la recette).
 */
export const AI_COST_CREDIT_USD = 0.006;

/** Coût de la mémoire longue : un résumé par client ACTIF et par jour (cron).
 * Non débité en crédits, c'est une charge système. */
export const AI_COST_MEMORY_USD = 0.003;

/** Coût IA récurrent estimé par client et par mois (usage typique modéré). */
export const AI_COST_PER_CLIENT_MONTH_USD = 1.4;

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
  const realMonth =
    (realMsgs * AI_COST_COACH_MSG_USD + realRecipes * AI_COST_RECIPE_USD + AI_COST_MEMORY_USD) *
    AI_REALISTIC_ACTIVE_DAYS;

  // Borne haute seulement si les DEUX plafonds sont fixés (sinon dépense illimitée).
  const bounded = msgCap > 0 && recipeCap > 0;
  const ceilingMonth = bounded
    ? (msgCap * AI_COST_COACH_MSG_USD + recipeCap * AI_COST_RECIPE_USD + AI_COST_MEMORY_USD) * 30
    : null;
  return { realMonth, ceilingMonth };
}

/**
 * Barème de débit, tel qu'appliqué par les routes IA. Toute action courante
 * (message du chat, recette régénérée, exercice alternatif, fiche) coûte 1
 * crédit IA ; une génération de programme coûte `DEFAULT_PROGRAM_CREDITS`
 * (réglable par le fournisseur).
 */
export const CREDITS_PER_AI_ACTION = 1;

export interface CreditUsageEstimate {
  /** Crédits IA qu'un client actif consomme sur un mois, usage réaliste. */
  realMonth: number;
  /**
   * Crédits IA maximum sur un mois si le client saturait ses deux plafonds tous
   * les jours. `null` si un plafond est sur « illimité » : rien ne borne alors
   * la consommation.
   */
  ceilingMonth: number | null;
}

/**
 * Équivalent de `estimateAiMonthlyCost` pour un coach en modèle CRÉDITS : mêmes
 * hypothèses d'usage, mais compté en crédits et non en dollars. Le coach n'a pas
 * de facture Anthropic dans ce modèle, il a un solde qui descend.
 */
export function estimateAiMonthlyCredits(msgCap: number, recipeCap: number): CreditUsageEstimate {
  const realMsgs = msgCap > 0 ? Math.min(msgCap, AI_REALISTIC_MSG_PER_DAY) : AI_REALISTIC_MSG_PER_DAY;
  const realRecipes = recipeCap > 0 ? Math.min(recipeCap, AI_REALISTIC_RECIPES_PER_DAY) : AI_REALISTIC_RECIPES_PER_DAY;
  const realMonth = (realMsgs + realRecipes) * CREDITS_PER_AI_ACTION * AI_REALISTIC_ACTIVE_DAYS;

  // Borne haute seulement si les DEUX plafonds sont fixés (sinon consommation illimitée).
  const bounded = msgCap > 0 && recipeCap > 0;
  const ceilingMonth = bounded ? (msgCap + recipeCap) * CREDITS_PER_AI_ACTION * 30 : null;
  return { realMonth, ceilingMonth };
}

// ── Revente de crédits IA. UN SEUL crédit : toute action IA (message, recette,
// alternative, fiche) coûte 1 crédit ; une génération de programme en coûte N,
// réglé par le fournisseur (défaut ci-dessous). Le fournisseur (revendeur ou
// plateforme) fixe son prix de revente du crédit et voit son coût et sa marge.
export const DEFAULT_AI_CREDIT_PRICE_CENTS = 40; // 0,40 € / crédit
export const DEFAULT_PROGRAM_CREDITS = 10; // une génération de programme = 10 crédits

/**
 * Montant en euros avec assez de décimales pour rester lisible sous le centime.
 * Un coût de crédit vaut quelques millièmes d'euro : affiché à 2 décimales, le
 * coût réel et le pire cas se confondaient tous les deux en « 0,01 € », ce qui
 * rendait toute simulation de marge impossible.
 */
export function formatEurPrecise(n: number): string {
  const abs = Math.abs(n);
  const decimals = abs > 0 && abs < 0.1 ? 4 : 2;
  return `${n.toFixed(decimals)} €`;
}

export interface CreditMargin {
  /** Coût Anthropic estimé (converti en €). */
  costEur: number;
  /** Ce que paie l'acheteur (en €). */
  priceEur: number;
  /** Marge du fournisseur (en €). */
  marginEur: number;
  /** Marge en % du prix de vente (0 si prix nul). */
  marginPct: number;
}

function margin(costEur: number, priceEur: number): CreditMargin {
  const marginEur = priceEur - costEur;
  return { costEur, priceEur, marginEur, marginPct: priceEur > 0 ? (marginEur / priceEur) * 100 : 0 };
}

/** Coût / prix / marge d'UN crédit consommé par une action simple (Haiku). */
export function actionCreditMargin(creditPriceCents: number): CreditMargin {
  return margin(usdToEur(AI_COST_CREDIT_USD), Math.max(0, creditPriceCents) / 100);
}

/**
 * Coût réel d'une génération de programme (Opus) rapporté aux crédits qu'elle
 * consomme : au prix unitaire donné, la génération rapporte-t-elle sa marge ?
 * Le fournisseur règle le nombre de crédits d'une génération avec ce chiffre
 * sous les yeux.
 */
export function programGenerationMargin(programCredits: number, creditPriceCents: number): CreditMargin {
  const n = Math.max(0, Math.trunc(programCredits || 0));
  return margin(usdToEur(AI_COST_PROGRAM_USD), (n * Math.max(0, creditPriceCents)) / 100);
}

/**
 * Coût / prix / marge d'un pack de crédits. Le coût est celui d'une action par
 * crédit : hypothèse prudente pour le fournisseur, puisqu'une génération de
 * programme consomme N crédits pour un coût Opus qui reste inférieur à N actions.
 */
export function creditPackMargin(credits: number, priceCents: number): CreditMargin {
  const n = Math.max(0, Math.trunc(credits || 0));
  return margin(n * actionCreditMargin(0).costEur, Math.max(0, priceCents) / 100);
}

/** Prix de vente CONSEILLÉ d'un pack : crédits × prix unitaire déjà réglé. */
export function suggestedPackPriceCents(credits: number, unitCents: number): number {
  const n = Math.max(0, Math.trunc(credits || 0));
  return n * Math.max(0, Math.round(unitCents || 0));
}

/** « 100 crédits IA », avec l'accord du singulier. */
export function creditPackContents(credits: number): string {
  const n = Math.max(0, Math.trunc(credits || 0));
  if (n <= 0) return "";
  return `${n} crédit${n > 1 ? "s" : ""} IA`;
}

/**
 * Coût MAXIMUM d'un client sur un plan, en crédits : les générations de
 * programme (une par bloc de 3 mois) plus le quota journalier d'actions IA
 * saturé chaque jour. C'est ce que le coach lit en cochant « Coach IA » sur son
 * offre : il sait ce que ce plan peut lui coûter, au pire.
 */
export function planMaxCredits(input: { programDays: number; dailyQuota: number; programCredits: number }): {
  generations: number;
  generationCredits: number;
  chatCredits: number;
  total: number;
} {
  const days = Math.max(0, Math.trunc(input.programDays || 0));
  const quota = Math.max(0, Math.trunc(input.dailyQuota || 0));
  const perProgram = Math.max(0, Math.trunc(input.programCredits || 0));
  const generations = Math.max(1, Math.round(days / (BLOCK_MONTHS * DAYS_PER_MONTH)));
  const generationCredits = generations * perProgram;
  const chatCredits = quota * days;
  return { generations, generationCredits, chatCredits, total: generationCredits + chatCredits };
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
  "plan-pdf", "dev",
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

/**
 * Version du jeu d'icônes de marque. Les fichiers d'icônes ont des URL fixes
 * (/icons/…), or les navigateurs mettent les favicons en cache très longtemps,
 * indépendamment des en-têtes. Suffixer les URL de `?v=…` force la reprise
 * après un changement de logo : à incrémenter à chaque nouveau jeu d'icônes.
 */
export const ICON_VERSION = "3";

/** URL d'une icône de marque, avec sa version (anti-cache navigateur). */
export function iconUrl(path: string): string {
  return `${path}?v=${ICON_VERSION}`;
}
