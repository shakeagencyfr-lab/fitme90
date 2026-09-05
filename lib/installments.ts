/**
 * Un programme se paie EN UNE FOIS, ou EN N MENSUALITÉS qui s'arrêtent
 * d'elles-mêmes, N étant la durée du programme en mois (3 ou 12).
 *
 * Ce n'est pas un abonnement : il y a une fin, connue d'avance, et c'est
 * Stripe qui l'applique (`cancel_at` posé sur l'abonnement dès la première
 * échéance, relu par le cron). Le client voit son échéancier et peut changer
 * de carte ; il n'a rien à faire pour que ça s'arrête.
 *
 * Pur : ni base, ni Stripe. Les appelants apportent les faits, ce module rend
 * les règles, et les tests les vérifient à sec.
 */

export type PaymentMode = "once" | "installments";

/** Ce qu'il faut d'une offre pour décider comment elle se paie. */
export interface PriceFacts {
  price_cents: number | null;
  price_month_cents: number | null;
  duration_months: number;
}

/** Les façons de payer que l'offre propose, dans l'ordre d'affichage. */
export function paymentModes(o: PriceFacts): PaymentMode[] {
  const modes: PaymentMode[] = [];
  if (o.price_cents != null && o.price_cents > 0) modes.push("once");
  if (o.price_month_cents != null && o.price_month_cents > 0 && o.duration_months > 0) modes.push("installments");
  return modes;
}

/** Le nombre de mensualités : autant que de mois de programme. */
export function installmentCount(o: PriceFacts): number {
  return Math.max(1, Math.trunc(o.duration_months));
}

/** Ce que coûtent les N mensualités mises bout à bout, ou null sans mensualité. */
export function installmentsTotalCents(o: PriceFacts): number | null {
  if (o.price_month_cents == null || o.price_month_cents <= 0) return null;
  return o.price_month_cents * installmentCount(o);
}

/**
 * Le mode retenu : la préférence du client si l'offre la propose, sinon la
 * seule disponible. `month` est la valeur historique de « mensualités » dans
 * `profiles.selected_interval`, `once` la nouvelle.
 */
export function resolvePaymentMode(preferred: string | null | undefined, modes: PaymentMode[]): PaymentMode | null {
  if (modes.length === 0) return null;
  if (preferred === "once" && modes.includes("once")) return "once";
  if ((preferred === "month" || preferred === "installments") && modes.includes("installments")) return "installments";
  return modes[0];
}

/** Ajoute des mois calendaires à un instant Unix (secondes), en UTC. */
export function addMonthsUnix(startUnix: number, months: number): number {
  const d = new Date(startUnix * 1000);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  // Le 31 janvier + 1 mois tombe le 28 ou 29 février, pas le 3 mars.
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return Math.floor(d.getTime() / 1000);
}

/**
 * L'instant où Stripe doit arrêter l'abonnement pour qu'il ait produit
 * EXACTEMENT N factures : le début de ce qui serait la (N+1)e période. Stripe
 * annule à cette date avant de facturer, comme une résiliation en fin de
 * période posée d'avance.
 */
export function cancelAtFor(startUnix: number, installments: number): number {
  return addMonthsUnix(startUnix, Math.max(1, Math.trunc(installments)));
}

/**
 * Toutes les mensualités ont-elles été réglées ?
 *
 * Oui quand l'abonnement s'est arrêté À la date prévue (l'annulation vient de
 * `cancel_at`, pas d'un client qui a coupé avant). Un abonnement coupé plus
 * tôt, ou tombé en impayé, n'est pas soldé : l'accès suivra alors l'état de
 * l'abonnement, comme avant.
 */
export function paidInFull(status: string | null, cancelAtUnix: number | null, canceledAtUnix: number | null): boolean {
  if (status !== "canceled" || cancelAtUnix == null || canceledAtUnix == null) return false;
  // Une minute de marge : Stripe horodate l'annulation au passage du cron, pas
  // à la seconde exacte.
  return canceledAtUnix >= cancelAtUnix - 60;
}

/** L'échéancier tel que le client le lit. */
export interface Schedule {
  count: number;
  monthlyCents: number;
  totalCents: number;
  /** Mensualités déjà passées (la première compte dès le paiement). */
  paid: number;
  /** Prochaine mensualité, ou null quand tout est réglé. */
  nextAt: string | null;
  /** Dernière mensualité prévue. */
  lastAt: string;
  /** Plus aucun prélèvement à venir. */
  done: boolean;
}

/**
 * Reconstitue l'échéancier depuis la date du premier paiement : la k-ième
 * mensualité tombe k-1 mois après. On ne devine pas ce que Stripe a encaissé,
 * on dit ce qui est prévu ; le statut de l'abonnement dit s'il tient.
 */
export function scheduleFor(startIso: string, monthlyCents: number, count: number, now: Date = new Date()): Schedule {
  const n = Math.max(1, Math.trunc(count));
  const start = Math.floor(new Date(startIso).getTime() / 1000);
  const nowUnix = Math.floor(now.getTime() / 1000);
  const dates = Array.from({ length: n }, (_, k) => addMonthsUnix(start, k));
  const paid = dates.filter((d) => d <= nowUnix).length;
  const next = dates.find((d) => d > nowUnix) ?? null;
  return {
    count: n,
    monthlyCents,
    totalCents: monthlyCents * n,
    paid,
    nextAt: next == null ? null : new Date(next * 1000).toISOString(),
    lastAt: new Date(dates[n - 1] * 1000).toISOString(),
    done: next == null,
  };
}
