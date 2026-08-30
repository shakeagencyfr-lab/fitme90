import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret, keyHint, secretsEncryptionReady } from "@/lib/crypto";
import { clientOffer } from "@/lib/offers";

// BYOK Stripe : chaque coach/salle fournit SA propre clé Stripe. Les paiements
// sont créés directement sur SON compte (avec SA clé). La plateforme ne touche
// jamais l'argent, ne prélève aucune commission, et n'est pas une plateforme
// Connect : aucun agrément à signer côté propriétaire. La clé est chiffrée au
// repos dans tenant_secrets (verrouillé au service_role).

/** Clé Stripe (déchiffrée) du tenant, sinon null. */
export async function tenantStripeKey(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("stripe_key_enc")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ stripe_key_enc: string | null }>();
  return decryptSecret(data?.stripe_key_enc ?? null);
}

/** Client Stripe utilisant la clé du coach, ou null si non configurée. */
export async function stripeForTenant(tenantId: string): Promise<Stripe | null> {
  const key = await tenantStripeKey(tenantId);
  return key ? new Stripe(key) : null;
}

export interface TenantStripeStatus {
  configured: boolean;
  hint: string | null;
  encryptionReady: boolean;
}

/** État de la clé Stripe du tenant (pour le dashboard coach). */
export async function tenantStripeStatus(tenantId: string): Promise<TenantStripeStatus> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("stripe_key_enc, stripe_key_hint")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ stripe_key_enc: string | null; stripe_key_hint: string | null }>();
  return {
    configured: !!data?.stripe_key_enc,
    hint: data?.stripe_key_hint ?? null,
    encryptionReady: secretsEncryptionReady(),
  };
}

/**
 * Vérifie une session Stripe Checkout d'un achat d'offre coach (au retour de
 * Stripe) et marque le compte payé si le paiement est bien encaissé. Sans
 * webhook : on retrouve la clé du coach via l'offre du client, on relit la
 * session, et on contrôle qu'elle appartient bien à CE client. Idempotent.
 */
export async function confirmCoachCheckout(userId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const offer = await clientOffer(userId);
  if (!offer) return false;
  const stripe = await stripeForTenant(offer.tenant_id);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns =
      session.metadata?.user_id === userId || session.client_reference_id === userId;
    if (!owns) return false;

    const admin = createAdminClient();

    // Abonnement : la session est « complete » ; on relit l'abonnement pour son
    // état et sa période, et on garde ses identifiants pour le suivi (sans webhook).
    if (session.mode === "subscription" && session.subscription) {
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      let status: string | null = null;
      let periodEnd: string | null = null;
      let interval: string | null = null;
      let cancelAtPeriodEnd = false;
      try {
        const sub = await stripe.subscriptions.retrieve(subId);
        status = sub.status;
        const end = (sub as unknown as { current_period_end?: number }).current_period_end;
        periodEnd = end ? new Date(end * 1000).toISOString() : null;
        interval = sub.items?.data?.[0]?.price?.recurring?.interval ?? null;
        cancelAtPeriodEnd = !!sub.cancel_at_period_end;
      } catch {
        /* on garde au moins les identifiants */
      }
      const active = status === "active" || status === "trialing" || session.payment_status === "paid";
      if (!active) return false;
      await admin
        .from("profiles")
        .update({
          paid: true,
          subscription_id: subId,
          stripe_customer_id: customerId,
          subscription_status: status ?? "active",
          subscription_current_period_end: periodEnd,
          subscription_interval: interval,
          subscription_cancel_at_period_end: cancelAtPeriodEnd,
          subscription_synced_at: new Date().toISOString(),
        })
        .eq("id", userId);
      return true;
    }

    // Paiement unique.
    if (session.payment_status !== "paid") return false;
    await admin.from("profiles").update({ paid: true }).eq("id", userId);
    // Code promo éventuel : on compte l'usage une fois le paiement confirmé.
    const promoCode = session.metadata?.promo_code;
    if (promoCode) {
      const { incrementPromoUse } = await import("@/lib/promo");
      await incrementPromoUse(offer.tenant_id, promoCode);
    }
    return true;
  } catch {
    return false;
  }
}

/** Un tenant peut-il encaisser ? (clé Stripe configurée) */
export async function tenantCanCharge(tenantId: string): Promise<boolean> {
  return (await tenantStripeKey(tenantId)) !== null;
}

/** Vérifie qu'une clé Stripe fonctionne (petit appel peu coûteux). */
export async function testStripeKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await new Stripe(key).balance.retrieve();
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Clé invalide.";
    return { ok: false, error: msg.slice(0, 200) };
  }
}

/** Enregistre (chiffrée) la clé Stripe d'un tenant. */
export async function setTenantStripeKey(tenantId: string, key: string): Promise<void> {
  const enc = encryptSecret(key.trim());
  const admin = createAdminClient();
  await admin.from("tenant_secrets").upsert({
    tenant_id: tenantId,
    stripe_key_enc: enc,
    stripe_key_hint: keyHint(key),
    updated_at: new Date().toISOString(),
  });
}

/** Supprime la clé Stripe d'un tenant. */
export async function clearTenantStripeKey(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("tenant_secrets")
    .update({ stripe_key_enc: null, stripe_key_hint: null, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
}
