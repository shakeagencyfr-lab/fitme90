// Bascule 3 mois → 12 mois : logique PURE (testable, importable côté client).
// C'est la machine à revenu du modèle à deux produits : à la semaine 10, le
// client voit ses résultats, il est au sommet de sa motivation, et on lui
// propose de PROLONGER en déduisant ce qu'il a déjà payé. Il ne rachète pas.

import type { Offer } from "@/lib/offers";

/** Jour de programme à partir duquel la bascule est proposée (semaine 10). */
export const UPSELL_FROM_DAY = 64;

export interface EligibilityInput {
  day: number;
  phase: string;
  /** Durée du programme en cours, en mois (null = inconnu). */
  durationMonths: number | null;
  /** Le client paie déjà chaque mois : rien à basculer, son programme continue. */
  subscribed: boolean;
}

/**
 * Le client peut-il se voir proposer la bascule ? Uniquement un client 3 mois
 * en paiement unique, à partir de la semaine 10, tant que son accès est ouvert
 * (programme actif ou période de consultation).
 */
export function upgradeEligible({ day, phase, durationMonths, subscribed }: EligibilityInput): boolean {
  if (subscribed) return false;
  if (durationMonths !== 3) return false;
  if (phase !== "active" && phase !== "grace") return false;
  return day >= UPSELL_FROM_DAY;
}

/**
 * L'offre 12 mois vers laquelle basculer : une offre ACTIVE du même coach, en
 * paiement unique, avec un prix. S'il y en a plusieurs, la moins chère (on ne
 * pousse jamais le client vers le plus cher par défaut).
 */
export function pickUpgradeOffer(offers: Offer[], currentOfferId: string | null): Offer | null {
  const candidates = offers.filter(
    (o) =>
      o.id !== currentOfferId &&
      o.is_active &&
      o.duration_months === 12 &&
      o.billing_type === "one_time" &&
      o.price_cents != null &&
      o.price_cents > 0,
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, o) => ((o.price_cents ?? 0) < (best.price_cents ?? 0) ? o : best));
}

/**
 * Ce qu'il reste à payer : prix du 12 mois moins ce qui a déjà été réglé pour
 * le 3 mois. Jamais négatif ; zéro signifie que le coach a fixé un 12 mois
 * moins cher que son 3 mois, cas absurde qu'on n'encaisse pas.
 */
export function upgradePriceCents(twelveMonthCents: number, alreadyPaidCents: number): number {
  const a = Number.isFinite(twelveMonthCents) ? Math.max(0, Math.round(twelveMonthCents)) : 0;
  const b = Number.isFinite(alreadyPaidCents) ? Math.max(0, Math.round(alreadyPaidCents)) : 0;
  return Math.max(0, a - b);
}
