import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { syncSubscriptionForUser } from "@/lib/subscription";

/**
 * Le client change la carte qui paie ses mensualités.
 *
 * Une session Stripe Checkout en mode « setup » sur le compte DU COACH (BYOK,
 * comme le paiement) : la carte est enregistrée chez Stripe, jamais chez
 * nous. Au retour, on la pose comme moyen de paiement par défaut de
 * l'abonnement et du client Stripe, et on retente la facture en attente s'il
 * y en a une : un client qui vient de corriger sa carte veut retrouver son
 * accès tout de suite, pas au prochain essai automatique.
 */

interface Row {
  tenant_id: string | null;
  subscription_id: string | null;
  stripe_customer_id: string | null;
}

async function rowOf(userId: string): Promise<Row | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("tenant_id, subscription_id, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle<Row>();
  return data ?? null;
}

export async function startCardUpdate(userId: string): Promise<{ url?: string; error?: string }> {
  const row = await rowOf(userId);
  if (!row?.tenant_id || !row.subscription_id || !row.stripe_customer_id) return { error: "Aucune mensualité en cours." };
  const stripe = await stripeForTenant(row.tenant_id);
  if (!stripe) return { error: "Paiement indisponible." };
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: row.stripe_customer_id,
      payment_method_types: ["card"],
      metadata: { user_id: userId, subscription_id: row.subscription_id },
      setup_intent_data: { metadata: { user_id: userId, subscription_id: row.subscription_id } },
      success_url: `${site}/app/profil?carte_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/app/profil?carte_annule=1`,
    });
    return { url: session.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible." };
  }
}

/**
 * Au retour : la session doit être à CE client, en mode setup, et aboutie.
 * Un identifiant de session recopié depuis un autre compte ne change rien.
 */
export async function confirmCardUpdate(userId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const row = await rowOf(userId);
  if (!row?.tenant_id || !row.subscription_id) return false;
  const stripe = await stripeForTenant(row.tenant_id);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent"] });
    if (session.mode !== "setup" || session.metadata?.user_id !== userId) return false;
    const intent = typeof session.setup_intent === "string" ? null : session.setup_intent;
    const pm = intent?.payment_method;
    const pmId = typeof pm === "string" ? pm : pm?.id;
    if (!pmId || intent?.status !== "succeeded") return false;

    const sub = await stripe.subscriptions.update(row.subscription_id, { default_payment_method: pmId });
    if (row.stripe_customer_id) {
      await stripe.customers
        .update(row.stripe_customer_id, { invoice_settings: { default_payment_method: pmId } })
        .catch(() => undefined);
    }
    // Une facture restée impayée : on la retente avec la nouvelle carte.
    const latest = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
    if (latest && (sub.status === "past_due" || sub.status === "unpaid")) {
      await stripe.invoices.pay(latest, { payment_method: pmId }).catch(() => undefined);
    }
    await syncSubscriptionForUser(userId);
    return true;
  } catch {
    return false;
  }
}
