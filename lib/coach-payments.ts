import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret, keyHint, secretsEncryptionReady } from "@/lib/crypto";
import { clientOffer, getOffer } from "@/lib/offers";
import { recordOrder } from "@/lib/orders";
import { ensureInstallmentEnd } from "@/lib/subscription";
import { installmentCount, paymentModes } from "@/lib/installments";

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

    // État courant : pour ne notifier le coach qu'à la PREMIÈRE confirmation
    // (cette fonction est idempotente et peut être rappelée).
    const { data: before } = await admin
      .from("profiles")
      .select("paid, name, email")
      .eq("id", userId)
      .maybeSingle<{ paid: boolean; name: string | null; email: string | null }>();
    const wasPaid = !!before?.paid;
    const clientLabel = before?.name || before?.email || "Un client";
    const notifyPurchase = async (kind: "purchase" | "subscription") => {
      if (wasPaid) return;
      const { addCoachNotification } = await import("@/lib/notifications");
      await addCoachNotification({
        tenantId: offer.tenant_id,
        type: kind,
        title: `${clientLabel} a acheté « ${offer.name} »`,
        body: kind === "subscription" ? "Nouvel abonnement." : "Paiement unique.",
        url: `/admin/clients/${userId}`,
        clientId: userId,
      });
    };

    // Abonnement : la session est « complete » ; on relit l'abonnement pour son
    // état et sa période, et on garde ses identifiants pour le suivi (sans webhook).
    if (session.mode === "subscription" && session.subscription) {
      const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      // N mensualités quand l'offre en propose : la date d'arrêt est posée
      // sur l'abonnement DÈS la première échéance. Sans elle, « 3 fois »
      // deviendrait un abonnement sans fin.
      const installments = paymentModes(offer).includes("installments") ? installmentCount(offer) : null;
      let status: string | null = null;
      let periodEnd: string | null = null;
      let interval: string | null = null;
      let cancelAtPeriodEnd = false;
      let cancelAt: string | null = null;
      try {
        const raw = await stripe.subscriptions.retrieve(subId);
        const sub = await ensureInstallmentEnd(stripe, raw, installments);
        status = sub.status;
        const end = (sub as unknown as { current_period_end?: number }).current_period_end;
        periodEnd = end ? new Date(end * 1000).toISOString() : null;
        interval = sub.items?.data?.[0]?.price?.recurring?.interval ?? null;
        cancelAtPeriodEnd = !!sub.cancel_at_period_end;
        cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null;
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
          subscription_cancel_at: cancelAt,
          subscription_installments: installments,
          subscription_paid_in_full: false,
          subscription_synced_at: new Date().toISOString(),
        })
        .eq("id", userId);
      await recordOrder({
        tenantId: offer.tenant_id,
        userId,
        offerId: offer.id,
        offerName: offer.name,
        kind: "subscription",
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? offer.currency,
        stripeRef: session.id,
      paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        paidAt: session.created ? new Date(session.created * 1000) : undefined,
      });
      await notifyPurchase("subscription");
      return true;
    }

    // Paiement unique.
    if (session.payment_status !== "paid") return false;
    await admin.from("profiles").update({ paid: true }).eq("id", userId);
    await recordOrder({
      tenantId: offer.tenant_id,
      userId,
      offerId: offer.id,
      offerName: offer.name,
      kind: "one_time",
      // Le montant ENCAISSÉ, pas le prix affiché : un code promo a pu s'appliquer.
      amountCents: session.amount_total ?? offer.price_cents ?? 0,
      currency: session.currency ?? offer.currency,
      stripeRef: session.id,
      paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      paidAt: session.created ? new Date(session.created * 1000) : undefined,
    });
    await notifyPurchase("purchase");
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

export interface ReconcileResult {
  /** Tenants dont la clé Stripe a pu être interrogée. */
  tenants: number;
  /** Sessions payées examinées. */
  sessions: number;
  /** Comptes débloqués parce que le paiement était passé sans confirmation. */
  activated: number;
  /** Ventes ajoutées au journal. */
  recorded: number;
}

/**
 * Réconciliation des paiements clients, une fois par nuit.
 *
 * Sans Stripe Connect, les comptes des coachs n'envoient rien à notre webhook :
 * un achat n'est constaté qu'au RETOUR du client sur la page de confirmation.
 * Si ce retour n'a pas lieu (onglet fermé, réseau coupé, redirection perdue),
 * le client a payé et n'a rien. Personne ne s'en aperçoit avant sa réclamation.
 *
 * On repasse donc chaque nuit sur les sessions Checkout récentes de chaque
 * coach, avec SA clé, pour débloquer ce qui doit l'être et compléter le journal
 * des ventes. `recordOrder` étant idempotent, repasser sur les mêmes paiements
 * est sans effet.
 */
export async function reconcileTenantPayments(days = 3): Promise<ReconcileResult> {
  const out: ReconcileResult = { tenants: 0, sessions: 0, activated: 0, recorded: 0 };
  const admin = createAdminClient();

  // Seuls les tenants qui encaissent nous intéressent.
  const { data: secrets } = await admin
    .from("tenant_secrets")
    .select("tenant_id")
    .not("stripe_key_enc", "is", null)
    .returns<{ tenant_id: string }[]>();

  const since = Math.floor((Date.now() - days * 86400_000) / 1000);

  for (const { tenant_id: tenantId } of secrets ?? []) {
    const stripe = await stripeForTenant(tenantId);
    if (!stripe) continue;
    out.tenants += 1;

    let sessions: Stripe.Checkout.Session[] = [];
    try {
      const page = await stripe.checkout.sessions.list({ created: { gte: since }, limit: 100 });
      sessions = page.data;
    } catch {
      // Clé révoquée ou compte suspendu : on passe au tenant suivant plutôt
      // que de faire échouer toute la réconciliation.
      continue;
    }

    for (const session of sessions) {
      if (session.payment_status !== "paid") continue;
      const userId = session.metadata?.user_id ?? session.client_reference_id ?? null;
      if (!userId) continue;
      out.sessions += 1;

      const { data: prof } = await admin
        .from("profiles")
        .select("paid, tenant_id, selected_offer_id, subscription_id")
        .eq("id", userId)
        .maybeSingle<{ paid: boolean | null; tenant_id: string | null; selected_offer_id: string | null; subscription_id: string | null }>();
      // Garde-fou de cloisonnement : on ne touche qu'aux clients de CE tenant,
      // même si une session portait un identifiant étranger.
      if (!prof || prof.tenant_id !== tenantId) continue;

      if (!prof.paid) {
        await admin.from("profiles").update({ paid: true }).eq("id", userId);
        out.activated += 1;
      }

      const offer = prof.selected_offer_id ? await getOffer(prof.selected_offer_id) : null;

      // Un paiement en N fois dont le retour n'a pas eu lieu : l'abonnement
      // existe chez Stripe mais le profil ne le connaît pas, et surtout sa
      // date d'arrêt n'est pas posée. On rattache et on la pose ici.
      if (session.mode === "subscription" && session.subscription && offer && !prof.subscription_id) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const installments = paymentModes(offer).includes("installments") ? installmentCount(offer) : null;
        try {
          const sub = await ensureInstallmentEnd(stripe, await stripe.subscriptions.retrieve(subId), installments);
          const end = (sub as unknown as { current_period_end?: number }).current_period_end;
          await admin
            .from("profiles")
            .update({
              subscription_id: sub.id,
              stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
              subscription_status: sub.status,
              subscription_current_period_end: end ? new Date(end * 1000).toISOString() : null,
              subscription_interval: sub.items?.data?.[0]?.price?.recurring?.interval ?? null,
              subscription_cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
              subscription_installments: installments,
              subscription_synced_at: new Date().toISOString(),
            })
            .eq("id", userId);
        } catch {
          /* la prochaine relecture réessaiera */
        }
      }
      const added = await recordOrder({
        tenantId,
        userId,
        offerId: offer?.id ?? null,
        offerName: offer?.name ?? null,
        kind: session.mode === "subscription" ? "subscription" : "one_time",
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? "eur",
        stripeRef: session.id,
      paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        paidAt: session.created ? new Date(session.created * 1000) : undefined,
      });
      if (added) out.recorded += 1;
    }
  }
  return out;
}
