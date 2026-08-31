import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { billingParentId } from "@/lib/hierarchy";
import type { Plan } from "@/lib/plans";

// Abonnement d'un tenant au palier de son PARENT (Lot C·3). Même principe BYOK
// que les abonnements clients : la session Stripe est créée sur le compte du
// parent, et l'état est vérifié en relisant Stripe avec la clé du parent (pas de
// webhook plateforme). La capacité effective (tenants.client_limit) est posée
// depuis le palier à l'achat ; en cas de défaut de paiement elle revient au
// palier gratuit (voir cron C·3b).

/** Palier gratuit rétabli en cas de défaut de paiement (« 1er client offert »). */
export const FREE_TIER_CLIENT_LIMIT = 1;

const PLAN_COLS =
  "id, tenant_id, name, price_month_cents, price_year_cents, client_limit, setup_fee_cents, is_active, position, created_at";

function subActive(status: string | null, periodEnd: string | null, now = new Date()): boolean {
  if (status === "active" || status === "trialing") return true;
  if (status === "canceled" && periodEnd && new Date(periodEnd) > now) return true;
  return false;
}

async function planById(planId: string): Promise<Plan | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("plans").select(PLAN_COLS).eq("id", planId).maybeSingle<Plan>();
  return (data as Plan) ?? null;
}

export interface CheckoutResult {
  url?: string;
  error?: string;
}

/**
 * Démarre le paiement d'un palier : crée une session Stripe Checkout (abonnement)
 * sur le compte du PARENT du tenant acheteur.
 */
export async function startPlanCheckout(
  buyerTenantId: string,
  planId: string,
  interval: "month" | "year",
  email: string | null,
): Promise<CheckoutResult> {
  const parentId = await billingParentId(buyerTenantId);
  if (!parentId) return { error: "Aucun compte parent à facturer." };

  const plan = await planById(planId);
  if (!plan || plan.tenant_id !== parentId || !plan.is_active) {
    return { error: "Palier introuvable." };
  }
  const amount = interval === "year" ? plan.price_year_cents : plan.price_month_cents;
  if (amount == null || amount <= 0) {
    return { error: "Ce palier n'a pas de prix pour cet intervalle." };
  }

  const stripe = await stripeForTenant(parentId);
  if (!stripe) return { error: "Le compte parent n'a pas encore configuré ses paiements." };

  // Ligne récurrente + éventuels frais de mise en place one-shot (salles),
  // ajoutés à la première facture (ligne non récurrente en mode subscription).
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: amount,
        recurring: { interval },
        product_data: { name: plan.name },
      },
    },
  ];
  if (plan.setup_fee_cents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: plan.setup_fee_cents,
        product_data: { name: `${plan.name} — frais de mise en place` },
      },
    });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: buyerTenantId,
      customer_email: email ?? undefined,
      line_items: lineItems,
      metadata: { buyer_tenant_id: buyerTenantId, plan_id: plan.id },
      subscription_data: { metadata: { buyer_tenant_id: buyerTenantId, plan_id: plan.id } },
      success_url: `${site}/admin/abonnement?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/admin/abonnement?annule=1`,
    });
    return { url: checkout.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

/**
 * Vérifie la session Stripe au retour du paiement (clé du parent) et débloque la
 * capacité du tenant acheteur si l'abonnement est bien actif. Idempotent.
 */
export async function verifyPlanCheckout(buyerTenantId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const parentId = await billingParentId(buyerTenantId);
  if (!parentId) return false;
  const stripe = await stripeForTenant(parentId);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns =
      session.metadata?.buyer_tenant_id === buyerTenantId || session.client_reference_id === buyerTenantId;
    if (!owns) return false;
    if (session.mode !== "subscription" || !session.subscription) return false;

    const planId = session.metadata?.plan_id ?? null;
    const plan = planId ? await planById(planId) : null;
    if (!plan || plan.tenant_id !== parentId) return false;

    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    let status: string | null = null;
    let periodEnd: string | null = null;
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      status = sub.status;
      const end = (sub as unknown as { current_period_end?: number }).current_period_end;
      periodEnd = end ? new Date(end * 1000).toISOString() : null;
    } catch {
      /* on garde au moins l'identifiant */
    }
    const active = subActive(status, periodEnd) || session.payment_status === "paid";
    if (!active) return false;

    const admin = createAdminClient();
    await admin
      .from("tenants")
      .update({
        plan_id: plan.id,
        sub_id: subId,
        sub_status: status ?? "active",
        sub_current_period_end: periodEnd,
        sub_synced_at: new Date().toISOString(),
        client_limit: plan.client_limit, // null = illimité
      })
      .eq("id", buyerTenantId);
    return true;
  } catch {
    return false;
  }
}

export interface SwitchResult {
  ok?: boolean;
  /** L'appelant doit basculer sur un checkout (pas d'abonnement actif à modifier). */
  needsCheckout?: boolean;
  error?: string;
}

/**
 * Change le palier d'un tenant qui a DÉJÀ un abonnement actif : met à jour la
 * ligne récurrente de l'abonnement Stripe existant (upgrade/downgrade avec
 * proratisation), sans créer de second abonnement. Si aucun abonnement n'est
 * actif, renvoie needsCheckout pour laisser l'appelant lancer un paiement.
 */
export async function switchTenantPlan(
  tenantId: string,
  planId: string,
  interval: "month" | "year",
): Promise<SwitchResult> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tenants")
    .select("id, parent_id, plan_id, sub_id, sub_status, sub_current_period_end")
    .eq("id", tenantId)
    .maybeSingle<TenantSubRow & { sub_status: string | null; sub_current_period_end: string | null }>();

  if (!row?.parent_id) return { error: "Aucun compte parent à facturer." };
  // Pas d'abonnement actif à modifier → l'appelant fera un checkout.
  if (!row.sub_id || !subActive(row.sub_status, row.sub_current_period_end)) {
    return { needsCheckout: true };
  }

  const plan = await planById(planId);
  if (!plan || plan.tenant_id !== row.parent_id || !plan.is_active) {
    return { error: "Palier introuvable." };
  }
  const amount = interval === "year" ? plan.price_year_cents : plan.price_month_cents;
  if (amount == null || amount <= 0) {
    return { error: "Ce palier n'a pas de prix pour cet intervalle." };
  }

  const stripe = await stripeForTenant(row.parent_id);
  if (!stripe) return { error: "Le compte parent n'a pas configuré ses paiements." };

  try {
    const sub = await stripe.subscriptions.retrieve(row.sub_id);
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) return { error: "Abonnement introuvable." };

    // La modification d'un item d'abonnement exige un `price` existant (le
    // price_data des items d'update n'accepte pas product_data). On crée donc un
    // Price (le product est créé à la volée), puis on bascule l'item dessus.
    const price = await stripe.prices.create({
      currency: "eur",
      unit_amount: amount,
      recurring: { interval },
      product_data: { name: plan.name },
    });

    const updated = await stripe.subscriptions.update(row.sub_id, {
      items: [{ id: itemId, price: price.id }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
      metadata: { buyer_tenant_id: tenantId, plan_id: plan.id },
    });

    const end = (updated as unknown as { current_period_end?: number }).current_period_end;
    await admin
      .from("tenants")
      .update({
        plan_id: plan.id,
        sub_status: updated.status,
        sub_current_period_end: end ? new Date(end * 1000).toISOString() : row.sub_current_period_end,
        sub_cancel_at_period_end: false,
        sub_synced_at: new Date().toISOString(),
        client_limit: plan.client_limit,
      })
      .eq("id", tenantId);
    return { ok: true };
  } catch {
    return { error: "Changement de palier impossible. Réessaie dans un instant." };
  }
}

export interface TenantBillingState {
  planId: string | null;
  planName: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  active: boolean;
  cancelAtPeriodEnd: boolean;
}

/** État de facturation courant d'un tenant (écran « Mon abonnement »). */
export async function tenantBillingState(tenantId: string): Promise<TenantBillingState> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("plan_id, sub_status, sub_current_period_end, sub_cancel_at_period_end")
    .eq("id", tenantId)
    .maybeSingle<{
      plan_id: string | null;
      sub_status: string | null;
      sub_current_period_end: string | null;
      sub_cancel_at_period_end: boolean | null;
    }>();
  const status = data?.sub_status ?? null;
  const periodEnd = data?.sub_current_period_end ?? null;
  let planName: string | null = null;
  if (data?.plan_id) planName = (await planById(data.plan_id))?.name ?? null;
  return {
    planId: data?.plan_id ?? null,
    planName,
    status,
    currentPeriodEnd: periodEnd,
    active: subActive(status, periodEnd),
    cancelAtPeriodEnd: !!data?.sub_cancel_at_period_end,
  };
}

interface TenantSubRow {
  id: string;
  parent_id: string | null;
  plan_id: string | null;
  sub_id: string | null;
}

/**
 * Applique l'état d'un abonnement tenant : met à jour le statut/période et, si
 * l'abonnement n'est plus en règle, ramène la capacité au palier gratuit
 * (blocage des nouveaux clients, sans supprimer les existants). Retourne true si
 * un déclassement a eu lieu.
 */
async function applyTenantSub(row: TenantSubRow, sub: Stripe.Subscription): Promise<boolean> {
  const status = sub.status;
  const end = (sub as unknown as { current_period_end?: number }).current_period_end;
  const periodEnd = end ? new Date(end * 1000).toISOString() : null;
  const active = subActive(status, periodEnd);
  const plan = row.plan_id ? await planById(row.plan_id) : null;

  const admin = createAdminClient();
  await admin
    .from("tenants")
    .update({
      sub_status: status,
      sub_current_period_end: periodEnd,
      sub_cancel_at_period_end: !!sub.cancel_at_period_end,
      sub_synced_at: new Date().toISOString(),
      client_limit: active && plan ? plan.client_limit : FREE_TIER_CLIENT_LIMIT,
    })
    .eq("id", row.id);
  return !active;
}

/** Relit l'abonnement d'un tenant (clé du parent) et applique l'état. */
export async function syncTenantSubscription(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tenants")
    .select("id, parent_id, plan_id, sub_id")
    .eq("id", tenantId)
    .maybeSingle<TenantSubRow>();
  if (!row?.sub_id || !row.parent_id) return;
  const stripe = await stripeForTenant(row.parent_id);
  if (!stripe) return;
  try {
    const sub = await stripe.subscriptions.retrieve(row.sub_id);
    await applyTenantSub(row, sub);
  } catch {
    /* on garde l'état stocké */
  }
}

/** Resynchronise tous les abonnements tenants (cron). Regroupe par parent. */
export async function syncAllTenantSubscriptions(): Promise<{ synced: number; downgraded: number }> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("tenants")
    .select("id, parent_id, plan_id, sub_id")
    .not("sub_id", "is", null)
    .returns<TenantSubRow[]>();

  const byParent = new Map<string, TenantSubRow[]>();
  for (const r of rows ?? []) {
    if (!r.parent_id || !r.sub_id) continue;
    const list = byParent.get(r.parent_id) ?? [];
    list.push(r);
    byParent.set(r.parent_id, list);
  }

  let synced = 0;
  let downgraded = 0;
  for (const [parentId, tenants] of byParent) {
    const stripe = await stripeForTenant(parentId);
    if (!stripe) continue;
    for (const t of tenants) {
      try {
        const sub = await stripe.subscriptions.retrieve(t.sub_id!);
        const wasDown = await applyTenantSub(t, sub);
        synced++;
        if (wasDown) downgraded++;
      } catch {
        /* on n'interrompt pas le lot pour un abonnement */
      }
    }
  }
  return { synced, downgraded };
}

/**
 * Résilie l'abonnement d'un tenant à la fin de la période courante (il garde sa
 * capacité jusque-là, puis le cron le ramène au palier gratuit).
 */
export async function cancelTenantPlan(tenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tenants")
    .select("id, parent_id, plan_id, sub_id")
    .eq("id", tenantId)
    .maybeSingle<TenantSubRow>();
  if (!row?.sub_id || !row.parent_id) return false;
  const stripe = await stripeForTenant(row.parent_id);
  if (!stripe) return false;
  try {
    const sub = await stripe.subscriptions.update(row.sub_id, { cancel_at_period_end: true });
    await applyTenantSub(row, sub);
    return true;
  } catch {
    return false;
  }
}

/** Annule une résiliation programmée : l'abonnement se poursuit normalement. */
export async function reactivateTenantPlan(tenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("tenants")
    .select("id, parent_id, plan_id, sub_id")
    .eq("id", tenantId)
    .maybeSingle<TenantSubRow>();
  if (!row?.sub_id || !row.parent_id) return false;
  const stripe = await stripeForTenant(row.parent_id);
  if (!stripe) return false;
  try {
    const sub = await stripe.subscriptions.update(row.sub_id, { cancel_at_period_end: false });
    await applyTenantSub(row, sub);
    return true;
  } catch {
    return false;
  }
}
