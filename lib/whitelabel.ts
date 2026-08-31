import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { billingParentId } from "@/lib/hierarchy";

// Upsell « marque blanche » (Modèle B) : un abonnement mensuel, dont le prix est
// fixé par le REVENDEUR, que le coach souscrit pour débloquer le domaine
// personnalisé (CNAME) et le SMTP perso. Paiement sur le compte du revendeur
// (BYOK) ; l'état est vérifié au retour, sans webhook plateforme.

const ACTIVE = new Set(["active", "trialing"]);

export interface WhitelabelState {
  /** L'option est-elle active pour ce coach ? */
  enabled: boolean;
  subStatus: string | null;
  /** Prix mensuel fixé par le revendeur (centimes), ou null si non proposé. */
  priceCents: number | null;
}

/** Prix de l'upsell fixé par un revendeur (null = option non proposée). */
export async function resellerWhitelabelPrice(resellerId: string | null): Promise<number | null> {
  if (!resellerId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("whitelabel_addon_price_cents")
    .eq("id", resellerId)
    .maybeSingle<{ whitelabel_addon_price_cents: number | null }>();
  const c = data?.whitelabel_addon_price_cents ?? null;
  return c && c > 0 ? c : null;
}

/** Le revendeur fixe (ou retire) le prix de son upsell marque blanche. */
export async function setResellerWhitelabelPrice(resellerId: string, cents: number | null): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenants").update({ whitelabel_addon_price_cents: cents }).eq("id", resellerId);
}

/** État de l'upsell pour un coach (activé ? prix proposé par son revendeur ?). */
export async function coachWhitelabelState(coachTenantId: string | null): Promise<WhitelabelState> {
  if (!coachTenantId) return { enabled: false, subStatus: null, priceCents: null };
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("whitelabel_enabled, whitelabel_sub_status, parent_id")
    .eq("id", coachTenantId)
    .maybeSingle<{ whitelabel_enabled: boolean | null; whitelabel_sub_status: string | null; parent_id: string | null }>();
  const priceCents = await resellerWhitelabelPrice(data?.parent_id ?? null);
  return { enabled: !!data?.whitelabel_enabled, subStatus: data?.whitelabel_sub_status ?? null, priceCents };
}

/** Le coach a-t-il débloqué la marque blanche (domaine + SMTP) ? */
export async function whitelabelEnabled(coachTenantId: string | null): Promise<boolean> {
  if (!coachTenantId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("whitelabel_enabled")
    .eq("id", coachTenantId)
    .maybeSingle<{ whitelabel_enabled: boolean | null }>();
  return !!data?.whitelabel_enabled;
}

export interface CheckoutResult {
  url?: string;
  error?: string;
}

/** Démarre l'abonnement upsell (sur le compte Stripe du revendeur). */
export async function startWhitelabelCheckout(coachTenantId: string, email: string | null): Promise<CheckoutResult> {
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return { error: "Aucun revendeur à facturer." };
  const price = await resellerWhitelabelPrice(resellerId);
  if (!price) return { error: "Ton revendeur ne propose pas cette option." };
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return { error: "Ton revendeur n'a pas configuré ses paiements." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: coachTenantId,
      customer_email: email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: price,
            recurring: { interval: "month" },
            product_data: { name: "Marque blanche — domaine personnalisé + e-mails" },
          },
        },
      ],
      metadata: { buyer_tenant_id: coachTenantId, kind: "whitelabel" },
      subscription_data: { metadata: { buyer_tenant_id: coachTenantId, kind: "whitelabel" } },
      success_url: `${site}/admin/marque-blanche?wl_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/admin/marque-blanche?wl_annule=1`,
    });
    return { url: checkout.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

/** Vérifie l'abonnement upsell au retour et débloque la marque blanche. */
export async function verifyWhitelabelCheckout(coachTenantId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return false;
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns =
      session.metadata?.buyer_tenant_id === coachTenantId || session.client_reference_id === coachTenantId;
    if (!owns || session.mode !== "subscription" || !session.subscription) return false;
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    let status: string | null = null;
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      status = sub.status;
    } catch {
      /* on garde au moins l'identifiant */
    }
    const active = (status ? ACTIVE.has(status) : false) || session.payment_status === "paid";
    if (!active) return false;
    const admin = createAdminClient();
    await admin
      .from("tenants")
      .update({ whitelabel_enabled: true, whitelabel_sub_id: subId, whitelabel_sub_status: status ?? "active" })
      .eq("id", coachTenantId);
    return true;
  } catch {
    return false;
  }
}
