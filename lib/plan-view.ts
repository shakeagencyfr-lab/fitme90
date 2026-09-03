// Mise en forme des paliers d'abonnement pour l'écran « Mon abonnement ».
//
// L'écran affichait les deux prix côte à côte (« 49 €/mois · 490 €/an ») puis
// les répétait sur deux boutons, sans jamais dire ce que l'annuel fait gagner
// ni ce qu'une place coûte. Tout est calculé ici, hors composant, pour rester
// testable et identique partout.

import type { Plan } from "@/lib/plans";

export type Interval = "month" | "year";

/** Prix affiché pour un intervalle donné, en centimes. null = non proposé. */
export function priceFor(p: Plan, interval: Interval): number | null {
  return interval === "month" ? p.price_month_cents : p.price_year_cents;
}

/** Le palier est-il souscriptible dans cet intervalle ? */
export function availableIn(p: Plan, interval: Interval): boolean {
  return priceFor(p, interval) != null;
}

/**
 * Coût MENSUEL équivalent, en centimes : c'est la seule base honnête pour
 * comparer un prix annuel à un prix mensuel. Arrondi au centime.
 */
export function monthlyEquivalentCents(p: Plan, interval: Interval): number | null {
  const price = priceFor(p, interval);
  if (price == null) return null;
  return interval === "month" ? price : Math.round(price / 12);
}

export interface AnnualSaving {
  /** Économie annuelle en centimes par rapport à 12 mensualités. */
  cents: number;
  /** Économie en pourcentage, arrondie à l'entier. */
  percent: number;
  /** Équivalent en mensualités offertes, arrondi au demi-mois. */
  freeMonths: number;
}

/**
 * Ce que l'annuel fait gagner face à 12 mensualités. null si l'un des deux
 * prix manque, ou si l'annuel n'est pas moins cher (rien à annoncer).
 */
export function annualSaving(p: Plan): AnnualSaving | null {
  const m = p.price_month_cents;
  const y = p.price_year_cents;
  if (m == null || y == null || m <= 0) return null;
  const full = m * 12;
  const cents = full - y;
  if (cents <= 0) return null;
  return {
    cents,
    percent: Math.round((cents / full) * 100),
    freeMonths: Math.round((cents / m) * 2) / 2,
  };
}

/**
 * Coût mensuel d'une place, à capacité pleine, en centimes. null si le palier
 * est illimité (pas de dénominateur) ou sans prix. C'est le chiffre qui dit
 * si monter d'un palier revient moins cher à la place.
 */
export function perClientMonthlyCents(p: Plan, interval: Interval): number | null {
  const monthly = monthlyEquivalentCents(p, interval);
  if (monthly == null || p.client_limit == null || p.client_limit <= 0) return null;
  return Math.round(monthly / p.client_limit);
}

/** Capacité d'un palier, en clair. */
export function capacityLabel(limit: number | null): string {
  if (limit == null) return "Clients illimités";
  return `${limit} client${limit > 1 ? "s" : ""}`;
}

export type CapacityTone = "ok" | "tight" | "full";

export interface CapacityView {
  used: number;
  limit: number | null;
  unlimited: boolean;
  /** Remplissage de 0 à 1 ; 0 quand illimité (la jauge n'a pas de fond). */
  ratio: number;
  tone: CapacityTone;
  /** Places restantes ; null si illimité. */
  remaining: number | null;
}

/**
 * Lecture de la capacité pour la jauge. « tight » à partir de 80 % : c'est le
 * moment où prévenir, pas quand la limite est déjà atteinte.
 */
export function capacityView(cap: { used: number; limit: number | null; unlimited: boolean }): CapacityView {
  const { used, limit, unlimited } = cap;
  if (unlimited || limit == null) {
    return { used, limit: null, unlimited: true, ratio: 0, tone: "ok", remaining: null };
  }
  const safeLimit = Math.max(0, limit);
  const remaining = Math.max(0, safeLimit - used);
  const ratio = safeLimit === 0 ? 1 : Math.min(1, used / safeLimit);
  const tone: CapacityTone = remaining === 0 ? "full" : ratio >= 0.8 ? "tight" : "ok";
  return { used, limit: safeLimit, unlimited: false, ratio, tone, remaining };
}

/**
 * Palier à mettre en avant : le MOINS cher qui offre strictement plus de places
 * que la capacité actuelle. Un coach au complet voit ainsi d'un coup d'œil le
 * plus petit pas qui le débloque, au lieu de comparer toute la grille.
 * null si la capacité actuelle est déjà illimitée ou si aucun palier ne fait
 * mieux. Le palier en cours n'est jamais proposé.
 */
export function suggestedPlanId(
  plans: Plan[],
  currentLimit: number | null,
  currentPlanId: string | null,
  interval: Interval,
): string | null {
  if (currentLimit == null) return null; // déjà illimité
  const better = plans
    .filter((p) => p.id !== currentPlanId && availableIn(p, interval))
    .filter((p) => p.client_limit == null || p.client_limit > currentLimit);
  if (better.length === 0) return null;
  // Le moins cher d'abord ; à prix égal, la plus petite capacité qui débloque.
  const sorted = [...better].sort((a, b) => {
    const pa = priceFor(a, interval) ?? Number.MAX_SAFE_INTEGER;
    const pb = priceFor(b, interval) ?? Number.MAX_SAFE_INTEGER;
    if (pa !== pb) return pa - pb;
    const la = a.client_limit ?? Number.MAX_SAFE_INTEGER;
    const lb = b.client_limit ?? Number.MAX_SAFE_INTEGER;
    return la - lb;
  });
  return sorted[0].id;
}

/** Paliers triés par capacité croissante, illimité en dernier. */
export function sortByCapacity(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    const la = a.client_limit ?? Number.MAX_SAFE_INTEGER;
    const lb = b.client_limit ?? Number.MAX_SAFE_INTEGER;
    if (la !== lb) return la - lb;
    return a.position - b.position;
  });
}
