import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { billingParentId } from "@/lib/hierarchy";
import { resellerWhitelabelPrice } from "@/lib/whitelabel";
import { whitelabelSubActive } from "@/lib/whitelabel-rules";

/**
 * Le pack marque blanche VENDU À PART : un abonnement mensuel du coach chez son
 * revendeur, sur le compte Stripe du revendeur (BYOK, sans webhook plateforme).
 *
 * L'état est vérifié au retour du paiement, puis relu par le cron quotidien :
 * un abonnement résilié ou impayé ferme le pack. Sans cette relecture, un coach
 * pouvait souscrire un mois, résilier, et garder domaine, SMTP, site et icône
 * pour toujours.
 */

const ACTIVE = new Set(["active", "trialing"]);

export interface CheckoutResult {
  url?: string;
  error?: string;
}

/** D'où le coach vient acheter : il y est renvoyé une fois payé. */
export type WhitelabelReturn = "marque-blanche" | "site";

/** Démarre l'abonnement au pack (sur le compte Stripe du revendeur). */
export async function startWhitelabelCheckout(
  coachTenantId: string,
  email: string | null,
  returnTo: WhitelabelReturn = "marque-blanche",
): Promise<CheckoutResult> {
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return { error: "Aucun revendeur à facturer." };
  const price = await resellerWhitelabelPrice(resellerId);
  if (!price) return { error: "Ton revendeur ne propose pas ce pack." };
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return { error: "Ton revendeur n'a pas configuré ses paiements." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const back = `${site}/admin/${returnTo}`;
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
            product_data: { name: "Pack marque blanche : domaine, e-mails, site, application" },
          },
        },
      ],
      metadata: { buyer_tenant_id: coachTenantId, kind: "whitelabel" },
      subscription_data: { metadata: { buyer_tenant_id: coachTenantId, kind: "whitelabel" } },
      success_url: `${back}?wl_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}?wl_annule=1`,
    });
    return { url: checkout.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

/**
 * Vérifie l'abonnement au retour de Stripe et ouvre le pack.
 *
 * On vérifie que la session appartient bien à CE compte avant d'ouvrir quoi
 * que ce soit : un identifiant de session recopié depuis l'écran d'un autre
 * coach ne doit rien débloquer ici.
 */
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

interface WlSubRow {
  id: string;
  parent_id: string | null;
  whitelabel_sub_id: string | null;
  whitelabel_enabled: boolean | null;
}

/**
 * Relit chaque abonnement au pack avec la clé Stripe du revendeur, et ferme
 * le pack quand l'abonnement ne le couvre plus. Appelé par le cron quotidien.
 *
 * Le domaine, le SMTP et le site restent enregistrés : le coach qui revient
 * retrouve tout tel quel. Seul l'ACCÈS se ferme, et tout ce qui dépend du pack
 * relit cet accès à chaque visite.
 */
export async function syncWhitelabelSubscriptions(): Promise<{ synced: number; closed: number }> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("tenants")
    .select("id, parent_id, whitelabel_sub_id, whitelabel_enabled")
    .not("whitelabel_sub_id", "is", null)
    .returns<WlSubRow[]>();

  const byParent = new Map<string, WlSubRow[]>();
  for (const r of rows ?? []) {
    if (!r.parent_id || !r.whitelabel_sub_id) continue;
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
        const sub = await stripe.subscriptions.retrieve(t.whitelabel_sub_id!);
        const periodEnd = sub.cancel_at ?? sub.canceled_at ?? null;
        const stillActive = whitelabelSubActive(sub.status, periodEnd);
        await admin
          .from("tenants")
          .update({ whitelabel_enabled: stillActive, whitelabel_sub_status: sub.status })
          .eq("id", t.id);
        synced++;
        if (t.whitelabel_enabled && !stillActive) closed++;
      } catch {
        /* on n'interrompt pas le lot pour un abonnement */
      }
    }
  }
  return { synced, closed };
}
