import "server-only";
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

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: buyerTenantId,
      customer_email: email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amount,
            recurring: { interval },
            product_data: { name: plan.name },
          },
        },
      ],
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

export interface TenantBillingState {
  planId: string | null;
  planName: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  active: boolean;
}

/** État de facturation courant d'un tenant (écran « Mon abonnement »). */
export async function tenantBillingState(tenantId: string): Promise<TenantBillingState> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("plan_id, sub_status, sub_current_period_end")
    .eq("id", tenantId)
    .maybeSingle<{ plan_id: string | null; sub_status: string | null; sub_current_period_end: string | null }>();
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
  };
}
