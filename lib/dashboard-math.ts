/**
 * Arithmétique du tableau de bord, sans base de données.
 *
 * Il n'existe pas de table « ventes » : une vente se reconstitue depuis le
 * client (sa date d'inscription, l'offre qu'il a choisie, l'état de son
 * abonnement). Tout ce raisonnement vit ici, en fonctions pures, pour qu'il
 * soit vérifiable ligne à ligne par des tests plutôt que par une capture
 * d'écran du dashboard.
 *
 * Deux natures de revenu, à ne jamais additionner sans le dire :
 *   - la vente UNIQUE est encaissée une fois, le mois de l'achat ;
 *   - l'abonnement produit un revenu RÉCURRENT, qu'on ramène au mois (MRR).
 * Un mois donné vaut donc « ventes uniques du mois + MRR courant ».
 */

export type BillingType = "one_time" | "subscription";

/** Une ligne de vente reconstituée : un client et l'offre qu'il a prise. */
export interface SaleRow {
  /** Date de création du compte client : notre meilleure date d'achat. */
  createdAt: string;
  paid: boolean;
  offerName: string | null;
  billingType: BillingType | null;
  priceCents: number | null;
  priceMonthCents: number | null;
  priceYearCents: number | null;
  /** Cadence choisie par le client sur un abonnement. */
  interval: "month" | "year" | null;
  subStatus: string | null;
}

/** Clé de mois « AAAA-MM », en UTC pour ne pas glisser d'un jour selon le lieu. */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Les `n` derniers mois, du plus ancien au plus récent, `now` inclus. */
export function lastMonths(now: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
  }
  return out;
}

/** Un abonnement encaisse-t-il encore ? « annulé en fin de période » compte : il paie jusqu'au bout. */
export function subIsLive(status: string | null): boolean {
  return status === "active" || status === "trialing";
}

/** Revenu mensuel d'UNE ligne d'abonnement. Un paiement annuel est lissé sur douze mois. */
function rowMonthlyCents(r: SaleRow): number {
  if (r.interval === "year") return Math.round((r.priceYearCents ?? 0) / 12);
  return r.priceMonthCents ?? 0;
}

/** Revenu récurrent mensuel : la somme des abonnements qui encaissent aujourd'hui. */
export function mrrCents(rows: readonly SaleRow[]): number {
  return rows
    .filter((r) => r.billingType === "subscription" && subIsLive(r.subStatus))
    .reduce((n, r) => n + rowMonthlyCents(r), 0);
}

/**
 * Ventes uniques encaissées. Sans `month`, c'est le cumul depuis le début.
 * Un client non payé n'a rien encaissé, même s'il a choisi une offre.
 */
export function oneTimeCents(rows: readonly SaleRow[], month?: string): number {
  return rows
    .filter((r) => r.paid && r.billingType !== "subscription")
    .filter((r) => (month ? monthKey(new Date(r.createdAt)) === month : true))
    .reduce((n, r) => n + (r.priceCents ?? 0), 0);
}

export interface MonthPoint {
  month: string;
  /** Clients acquis ce mois (payés). */
  clients: number;
  /** Ventes uniques encaissées ce mois. */
  oneTimeCents: number;
}

/** Série mensuelle des acquisitions et des ventes uniques. */
export function salesSeries(rows: readonly SaleRow[], months: readonly string[]): MonthPoint[] {
  return months.map((month) => ({
    month,
    clients: rows.filter((r) => r.paid && monthKey(new Date(r.createdAt)) === month).length,
    oneTimeCents: oneTimeCents(rows, month),
  }));
}

export interface OfferTally {
  name: string;
  sales: number;
  cents: number;
}

/**
 * Ce que chaque offre a rapporté, la plus rentable d'abord. Les abonnements
 * comptent pour leur revenu MENSUEL : mélanger un encaissement unique et un
 * loyer mensuel dans une même colonne ne veut rien dire, mais le coach a
 * besoin de savoir laquelle de ses offres tire son activité.
 */
export function offerTally(rows: readonly SaleRow[]): OfferTally[] {
  const by = new Map<string, OfferTally>();
  for (const r of rows) {
    if (!r.paid || !r.offerName) continue;
    const cents = r.billingType === "subscription" ? (subIsLive(r.subStatus) ? rowMonthlyCents(r) : 0) : (r.priceCents ?? 0);
    const cur = by.get(r.offerName) ?? { name: r.offerName, sales: 0, cents: 0 };
    cur.sales += 1;
    cur.cents += cents;
    by.set(r.offerName, cur);
  }
  return [...by.values()].sort((a, b) => b.cents - a.cents || b.sales - a.sales);
}

/** Taux de conversion prospect vers client payant, en pourcentage entier. */
export function conversionRate(prospects: number, clients: number): number {
  if (prospects <= 0) return 0;
  return Math.round((clients / prospects) * 100);
}

// ─────────────────────────── Réseau (revendeur) ───────────────────────────

/** Un compte enfant : un coach ou une salle rattachée au revendeur. */
export interface AccountRow {
  createdAt: string;
  subStatus: string | null;
  /** Prix du palier auquel ce compte est abonné. */
  planMonthCents: number | null;
  planYearCents: number | null;
  planName: string | null;
  suspendedAt: string | null;
  clientCount: number;
  clientLimit: number | null;
}

/**
 * Revenu récurrent du réseau. Un compte suspendu ne rapporte plus, même si
 * Stripe n'a pas encore basculé son abonnement : c'est le revendeur qui a
 * coupé l'accès, il ne facture plus.
 */
export function networkMrrCents(rows: readonly AccountRow[]): number {
  return rows
    .filter((a) => !a.suspendedAt && subIsLive(a.subStatus))
    .reduce((n, a) => n + (a.planMonthCents ?? 0), 0);
}

export interface PlanTally {
  name: string;
  count: number;
  mrrCents: number;
}

/** Répartition des comptes par palier, du plus gros revenu au plus petit. */
export function planTally(rows: readonly AccountRow[]): PlanTally[] {
  const by = new Map<string, PlanTally>();
  for (const a of rows) {
    const name = a.planName ?? "Sans palier";
    const live = !a.suspendedAt && subIsLive(a.subStatus);
    const cur = by.get(name) ?? { name, count: 0, mrrCents: 0 };
    cur.count += 1;
    cur.mrrCents += live ? (a.planMonthCents ?? 0) : 0;
    by.set(name, cur);
  }
  return [...by.values()].sort((a, b) => b.mrrCents - a.mrrCents || b.count - a.count);
}

export type AttentionReason = "suspended" | "unpaid" | "full" | "empty";

export interface Attention {
  name: string;
  reason: AttentionReason;
}

/**
 * Les comptes sur lesquels le revendeur doit agir, les plus urgents d'abord.
 * Un compte peut cocher plusieurs cases : on ne remonte que la plus grave,
 * sinon la liste se remplit de doublons et personne ne la lit.
 */
export function attentionList(rows: readonly (AccountRow & { name: string })[]): Attention[] {
  const rank: Record<AttentionReason, number> = { suspended: 0, unpaid: 1, full: 2, empty: 3 };
  const out: Attention[] = [];
  for (const a of rows) {
    let reason: AttentionReason | null = null;
    if (a.suspendedAt) reason = "suspended";
    else if (a.subStatus && !subIsLive(a.subStatus)) reason = "unpaid";
    else if (a.clientLimit != null && a.clientCount >= a.clientLimit) reason = "full";
    else if (a.clientCount === 0) reason = "empty";
    if (reason) out.push({ name: a.name, reason });
  }
  return out.sort((x, y) => rank[x.reason] - rank[y.reason]);
}

/** Variation en pourcentage entre deux mois. `null` si le mois précédent était vide. */
export function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
