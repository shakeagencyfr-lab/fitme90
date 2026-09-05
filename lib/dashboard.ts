import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantCapacity, type TenantCapacity } from "@/lib/entitlements";
import { listChildTenants } from "@/lib/hierarchy";
import { tenantMonthlyAiUsage, resellerMonthlyAiUsage } from "@/lib/ai-cost";
import { getWallet } from "@/lib/credits";
import { costViewOf, resellerRights, type CostView } from "@/lib/cost-view";
import { tenantOrders } from "@/lib/orders";
import {
  lastMonths,
  monthKey,
  mrrCents,
  oneTimeCents,
  offerTally,
  mergedSeries,
  ledgerOneTimeCents,
  ledgerRefundedCents,
  ledgerStartMonth,
  conversionRate,
  networkMrrCents,
  planTally,
  attentionList,
  subIsLive,
  type SaleRow,
  type AccountRow,
  type MonthPoint,
  type LedgerRow,
  type OfferTally,
  type PlanTally,
  type Attention,
} from "@/lib/dashboard-math";

// Collecte des chiffres du tableau de bord. Ce module ne fait que LIRE la base
// et déléguer tout le calcul à `dashboard-math`, qui est testé. Il n'écrit
// rien : un écran de synthèse ne doit jamais pouvoir abîmer une donnée.

const MONTHS_SHOWN = 6;

export interface CoachDashboard {
  clients: { total: number; paid: number; pending: number; newThisMonth: number; newPrevMonth: number };
  capacity: TenantCapacity;
  revenue: {
    /** Ventes uniques encaissées depuis le début. */
    lifetimeCents: number;
    /** Revenu récurrent mensuel (abonnements actifs). */
    mrrCents: number;
    thisMonthCents: number;
    prevMonthCents: number;
    /** Encaissements annulés depuis le début, d'après le journal. */
    refundedCents: number;
    /** Mois à partir duquel les chiffres viennent du journal. null = aucun. */
    ledgerFrom: string | null;
  };
  subs: { live: number; pastDue: number; canceled: number };
  prospects: { total: number; thisMonth: number; conversionPct: number };
  offers: OfferTally[];
  months: MonthPoint[];
  /** Conso IA : euros du mois en BYOK, solde de crédits sinon. */
  ai: {
    byokUsd: number;
    calls: number;
    credits: number | null;
    /** Crédits débités ce mois-ci. */
    creditsSpent: number;
    /** Ce que ce compte a le droit de voir : dollars, crédits, ou rien. */
    view: CostView;
  };
}

type ProfileRow = {
  created_at: string;
  paid: boolean | null;
  selected_offer_id: string | null;
  selected_interval: string | null;
  subscription_interval: string | null;
  subscription_status: string | null;
  subscription_id: string | null;
};

type OfferRow = {
  id: string;
  name: string;
  billing_type: string | null;
  price_cents: number | null;
  price_month_cents: number | null;
  price_year_cents: number | null;
};

function asInterval(a: string | null, b: string | null): "month" | "year" | null {
  const v = a ?? b;
  return v === "year" || v === "month" ? v : null;
}

/** Recompose les lignes de vente d'un coach à partir de ses clients et de ses offres. */
function toSaleRows(profiles: readonly ProfileRow[], offers: readonly OfferRow[]): SaleRow[] {
  const byId = new Map(offers.map((o) => [o.id, o]));
  return profiles.map((p) => {
    const o = p.selected_offer_id ? byId.get(p.selected_offer_id) : undefined;
    return {
      createdAt: p.created_at,
      paid: p.paid === true,
      offerName: o?.name ?? null,
      // Ce que CE client paie, pas ce que l'offre permet : une offre qui
      // propose les deux se vend en une fois à l'un et en mensualités à l'autre.
      billingType: p.subscription_id ? "subscription" : o ? "one_time" : null,
      priceCents: o?.price_cents ?? null,
      priceMonthCents: o?.price_month_cents ?? null,
      priceYearCents: o?.price_year_cents ?? null,
      interval: asInterval(p.subscription_interval, p.selected_interval),
      subStatus: p.subscription_status,
    };
  });
}

/** Synthèse chiffrée d'un coach ou d'une salle. */
export async function coachDashboard(tenantId: string, now: Date = new Date()): Promise<CoachDashboard> {
  const admin = createAdminClient();
  const months = lastMonths(now, MONTHS_SHOWN);
  const thisMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  const [{ data: profiles }, { data: offers }, { data: prospects }, capacity, ai, wallet, orders, view] = await Promise.all([
    admin
      .from("profiles")
      .select("created_at, paid, selected_offer_id, selected_interval, subscription_interval, subscription_status, subscription_id")
      .eq("tenant_id", tenantId)
      .eq("role", "client")
      .returns<ProfileRow[]>(),
    admin
      .from("offers")
      .select("id, name, billing_type, price_cents, price_month_cents, price_year_cents")
      .eq("tenant_id", tenantId)
      .returns<OfferRow[]>(),
    admin.from("prospects").select("created_at").eq("tenant_id", tenantId).returns<{ created_at: string }[]>(),
    tenantCapacity(tenantId),
    tenantMonthlyAiUsage(tenantId),
    getWallet(tenantId),
    tenantOrders(tenantId),
    costViewOf(tenantId),
  ]);

  const rows = toSaleRows(profiles ?? [], offers ?? []);
  const ledger: LedgerRow[] = orders.map((o) => ({
    paidAt: o.paid_at,
    kind: o.kind === "subscription" ? "subscription" : "one_time",
    amountCents: o.amount_cents,
    status: o.status,
    offerName: o.offer_name,
  }));
  const ledgerFrom = ledgerStartMonth(ledger);
  // Le journal prime là où il couvre. `since` désigne un mois pour lequel il
  // fait foi : avant sa première vente, il ne dit rien et la reconstruction
  // reste la seule source.
  const oneTimeFor = (m: string) =>
    ledgerFrom != null && m >= ledgerFrom ? ledgerOneTimeCents(ledger, m) : oneTimeCents(rows, m);
  const paid = rows.filter((r) => r.paid);
  const mrr = mrrCents(rows);
  const inMonth = (iso: string, m: string) => monthKey(new Date(iso)) === m;

  return {
    clients: {
      total: rows.length,
      paid: paid.length,
      pending: rows.length - paid.length,
      newThisMonth: paid.filter((r) => inMonth(r.createdAt, thisMonth)).length,
      newPrevMonth: paid.filter((r) => inMonth(r.createdAt, prevMonth)).length,
    },
    capacity,
    revenue: {
      // Le cumul mêle les deux sources : le journal depuis qu'il existe, la
      // reconstruction pour ce qui le précède.
      lifetimeCents:
        ledgerFrom == null
          ? oneTimeCents(rows)
          : ledgerOneTimeCents(ledger) +
            rows
              .filter((r) => r.paid && r.billingType !== "subscription" && monthKey(new Date(r.createdAt)) < ledgerFrom)
              .reduce((n, r) => n + (r.priceCents ?? 0), 0),
      mrrCents: mrr,
      // Le mois courant additionne l'encaissement unique du mois et le loyer
      // récurrent, qui tombe lui aussi ce mois-ci.
      thisMonthCents: oneTimeFor(thisMonth) + mrr,
      prevMonthCents: oneTimeFor(prevMonth) + mrr,
      refundedCents: ledgerRefundedCents(ledger),
      ledgerFrom,
    },
    subs: {
      live: rows.filter((r) => r.billingType === "subscription" && subIsLive(r.subStatus)).length,
      pastDue: rows.filter((r) => r.subStatus === "past_due" || r.subStatus === "unpaid").length,
      canceled: rows.filter((r) => r.subStatus === "canceled").length,
    },
    prospects: {
      total: (prospects ?? []).length,
      thisMonth: (prospects ?? []).filter((p) => inMonth(p.created_at, thisMonth)).length,
      conversionPct: conversionRate((prospects ?? []).length, paid.length),
    },
    offers: offerTally(rows).slice(0, 5),
    months: mergedSeries(rows, ledger, months),
    ai: {
      byokUsd: ai.costUsd,
      calls: ai.calls,
      credits: view === "credits" ? wallet.credits : null,
      creditsSpent: ai.credits,
      view,
    },
  };
}

export interface ResellerDashboard {
  accounts: { total: number; coaches: number; resellers: number; live: number; suspended: number; newThisMonth: number };
  /** Clients finaux servis par tout le réseau. */
  endClients: number;
  revenue: { mrrCents: number; prevMrrCents: number };
  plans: PlanTally[];
  attention: Attention[];
  months: MonthPoint[];
  /** Conso IA absorbée par le revendeur quand il fournit l'IA à son réseau. */
  ai: {
    byokUsd: number;
    calls: number;
    coachCount: number;
    credits: number | null;
    /** Crédits que la plateforme a débités au revendeur ce mois-ci. */
    creditsSpent: number;
    view: CostView;
    /**
     * Ce compte fournit-il l'IA à son réseau ? Un revendeur sans le droit de
     * revendre des crédits (et sans crédits plateforme) ne fournit rien : le
     * bloc « IA fournie au réseau » n'a rien à lui dire.
     */
    supplies: boolean;
  };
}

/** Synthèse chiffrée d'un revendeur ou de la plateforme. */
export async function resellerDashboard(tenantId: string, now: Date = new Date()): Promise<ResellerDashboard> {
  const admin = createAdminClient();
  const months = lastMonths(now, MONTHS_SHOWN);
  const thisMonth = months[months.length - 1];

  const children = await listChildTenants(tenantId);
  const ids = children.map((c) => c.id);

  const [{ data: raw }, { data: plans }, ai, wallet, view, rights] = await Promise.all([
    ids.length
      ? admin
          .from("tenants")
          .select("id, created_at, plan_id")
          .in("id", ids)
          .returns<{ id: string; created_at: string; plan_id: string | null }[]>()
      : Promise.resolve({ data: [] as { id: string; created_at: string; plan_id: string | null }[] }),
    admin
      .from("plans")
      .select("id, name, price_month_cents, price_year_cents")
      .eq("tenant_id", tenantId)
      .returns<{ id: string; name: string; price_month_cents: number | null; price_year_cents: number | null }[]>(),
    resellerMonthlyAiUsage(tenantId),
    getWallet(tenantId),
    costViewOf(tenantId),
    resellerRights(tenantId),
  ]);

  const planById = new Map((plans ?? []).map((p) => [p.id, p]));
  const metaById = new Map((raw ?? []).map((t) => [t.id, t]));

  const rows: (AccountRow & { name: string })[] = children.map((c) => {
    const meta = metaById.get(c.id);
    const plan = meta?.plan_id ? planById.get(meta.plan_id) : undefined;
    return {
      name: c.name,
      createdAt: meta?.created_at ?? new Date(0).toISOString(),
      subStatus: c.subStatus,
      planMonthCents: plan?.price_month_cents ?? null,
      planYearCents: plan?.price_year_cents ?? null,
      planName: plan?.name ?? null,
      suspendedAt: c.suspendedAt,
      clientCount: c.clientCount,
      clientLimit: c.clientLimit,
    };
  });

  const mrr = networkMrrCents(rows);
  // Le réseau du mois dernier, c'est le réseau d'aujourd'hui moins les comptes
  // ouverts ce mois-ci : la seule reconstitution honnête sans historique de
  // facturation stocké.
  const arrivedThisMonth = rows.filter((r) => monthOf(r.createdAt) === thisMonth);
  const prevMrr = networkMrrCents(rows.filter((r) => monthOf(r.createdAt) !== thisMonth));

  return {
    accounts: {
      total: children.length,
      coaches: children.filter((c) => c.kind === "coach").length,
      resellers: children.filter((c) => c.kind === "reseller").length,
      live: rows.filter((r) => !r.suspendedAt && subIsLive(r.subStatus)).length,
      suspended: children.filter((c) => c.suspendedAt).length,
      newThisMonth: arrivedThisMonth.length,
    },
    endClients: children.reduce((n, c) => n + c.clientCount, 0),
    revenue: { mrrCents: mrr, prevMrrCents: prevMrr },
    plans: planTally(rows),
    attention: attentionList(rows).slice(0, 6),
    months: months.map((month) => ({
      month,
      clients: rows.filter((r) => monthOf(r.createdAt) === month).length,
      oneTimeCents: 0,
    })),
    ai: {
      byokUsd: ai.costUsd,
      calls: ai.calls,
      coachCount: ai.coachCount,
      credits: view === "credits" ? wallet.credits : null,
      creditsSpent: ai.supplierCredits,
      view,
      supplies: rights.credits || view === "credits",
    },
  };
}

/** Mois d'une date ISO, pour regrouper des lignes venues de la base. */
function monthOf(iso: string): string {
  return monthKey(new Date(iso));
}
