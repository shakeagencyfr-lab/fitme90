// Constantes produit FitMe90. Centralisées pour éviter les valeurs
// magiques dispersées (prix, durées) et garder une source unique.

/** Prix unique du programme, en euros. Paiement une fois pour 90 jours. */
export const PRICE_EUR = 190;

/** Montant en centimes pour Stripe (Stripe raisonne en plus petite unité). */
export const PRICE_CENTS = PRICE_EUR * 100;

export const CURRENCY = "eur";

/** Durée du programme actif : coach IA disponible, séances loggables. */
export const PROGRAM_DAYS = 90;

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
/** Prénom du coach IA (persona). Deviendra un réglage par tenant en marque
 *  blanche ; centralisé ici pour n'avoir qu'une seule source. */
export const COACH_NAME = "Sébastien";
/** Persona / signature du coach affichée dans l'app et les prompts. */
export const COACH_CREDENTIAL = "Coach professionnel diplômé d'État";
/** Phrase « créé par » pour la landing et les pages légales. */
export const COACH_ORIGIN =
  "coach professionnel diplômé d'État et de l'université des sports";
