import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { billingParentId } from "@/lib/hierarchy";
import { whitelabelSubActive } from "@/lib/whitelabel-rules";

/**
 * Le pack RÉSERVATION vendu à part : un abonnement mensuel du coach chez son
 * revendeur, sur le compte Stripe du revendeur (BYOK, sans webhook).
 *
 * Copie assumée de lib/whitelabel-billing.ts : même parcours, mêmes gardes,
 * même relecture quotidienne. Un abonnement résilié ou impayé ferme le pack ;
 * les plannings, prestations et rendez-vous restent en base, seul l'accès
 * tombe, et le coach qui revient retrouve tout.
 */

const ACTIVE = new Set(["active", "trialing"]);

export interface CheckoutResult {
  url?: string;
  error?: string;
}

/** Prix du pack fixé par un revendeur (null = pack non vendu à part). */
export async function resellerBookingPrice(resellerId: string | null): Promise<number | null> {
  if (!resellerId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("booking_addon_price_cents")
    .eq("id", resellerId)
    .maybeSingle<{ booking_addon_price_cents: number | null }>();
  const c = data?.booking_addon_price_cents ?? null;
  return c && c > 0 ? c : null;
}

export async function setResellerBookingPrice(resellerId: string, cents: number | null): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenants").update({ booking_addon_price_cents: cents }).eq("id", resellerId);
}

/** Démarre l'abonnement au pack (sur le compte Stripe du revendeur). */
export async function startBookingCheckout(coachTenantId: string, email: string | null): Promise<CheckoutResult> {
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return { error: "Aucun revendeur à facturer." };
  const price = await resellerBookingPrice(resellerId);
  if (!price) return { error: "Ton revendeur ne propose pas ce pack." };
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return { error: "Ton revendeur n'a pas configuré ses paiements." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const back = `${site}/admin/reservations`;
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
            product_data: { name: "Pack réservation : rendez-vous en présentiel, plannings, paiement en ligne" },
          },
        },
      ],
      metadata: { buyer_tenant_id: coachTenantId, kind: "booking" },
      subscription_data: { metadata: { buyer_tenant_id: coachTenantId, kind: "booking" } },
      success_url: `${back}?bk_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}?bk_annule=1`,
    });
    return { url: checkout.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

/** Vérifie l'abonnement au retour de Stripe et ouvre le pack. La session doit appartenir à CE compte. */
export async function verifyBookingCheckout(coachTenantId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return false;
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns = session.metadata?.buyer_tenant_id === coachTenantId || session.client_reference_id === coachTenantId;
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
      .update({ booking_enabled: true, booking_sub_id: subId, booking_sub_status: status ?? "active", booking_active: true })
      .eq("id", coachTenantId);
    return true;
  } catch {
    return false;
  }
}

interface SubRow {
  id: string;
  parent_id: string | null;
  booking_sub_id: string | null;
  booking_enabled: boolean | null;
}

/** Relit chaque abonnement au pack avec la clé du revendeur ; ferme ce qui n'est plus couvert. Cron quotidien. */
export async function syncBookingSubscriptions(): Promise<{ synced: number; closed: number }> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("tenants")
    .select("id, parent_id, booking_sub_id, booking_enabled")
    .not("booking_sub_id", "is", null)
    .returns<SubRow[]>();

  const byParent = new Map<string, SubRow[]>();
  for (const r of rows ?? []) {
    if (!r.parent_id || !r.booking_sub_id) continue;
    const list = byParent.get(r.parent_id) ?? [];
    list.push(r);
    byParent.set(r.parent_id, list);
  }

  let synced = 0;
  let closed = 0;
  for (const [parentId, tenants] of byParent) {
    const stripe = await stripeForTenant(parentId);
    if (!stripe) continue;
    for (const t of tenants) {
      try {
        const sub = await stripe.subscriptions.retrieve(t.booking_sub_id!);
        const periodEnd = sub.cancel_at ?? sub.canceled_at ?? null;
        const stillActive = whitelabelSubActive(sub.status, periodEnd);
        await admin.from("tenants").update({ booking_enabled: stillActive, booking_sub_status: sub.status }).eq("id", t.id);
        synced++;
        if (t.booking_enabled && !stillActive) closed++;
      } catch {
        /* on n'interrompt pas le lot pour un abonnement */
      }
    }
  }
  return { synced, closed };
}
