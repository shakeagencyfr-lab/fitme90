import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { markOrderRefunded, recordOrder } from "@/lib/orders";

// Webhook Stripe de la PLATEFORME. runtime nodejs + corps BRUT obligatoires :
// sinon la vérification de signature échoue. Idempotent (Stripe rejoue).
//
// Périmètre, à ne pas confondre : ce point d'entrée ne reçoit que les
// événements du compte Stripe de la plateforme, c'est-à-dire la vente directe
// (`/api/checkout`, un client venu sans coach). Tout le reste passe par une
// autre clé :
//   - client vers coach : clé du coach, constatée au retour puis rattrapée
//     chaque nuit par `reconcileTenantPayments` ;
//   - coach vers son revendeur : clé du revendeur, resynchronisée chaque nuit
//     par `syncAllTenantSubscriptions`.
// Écouter ici `invoice.*` ou `customer.subscription.*` serait du code mort :
// aucun abonnement ne vit sur le compte de la plateforme.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature absente" }, { status: 400 });
  }

  const rawBody = await req.text(); // corps brut, avant tout parsing

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  // Une erreur de traitement ne doit pas déclencher une rafale de nouvelles
  // tentatives : on répond 200 et on laisse la trace dans les logs.
  try {
    if (event.type === "checkout.session.completed") {
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === "charge.refunded") {
      await onChargeRefunded(event.data.object as Stripe.Charge);
    }
  } catch (err) {
    console.error("[stripe-webhook]", event.type, err);
  }

  return NextResponse.json({ received: true });
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Sécurité : n'activer que si le paiement est réellement encaissé.
  if (session.payment_status !== "paid") return;
  const userId = session.metadata?.user_id ?? session.client_reference_id ?? null;
  if (!userId) return;

  const admin = createAdminClient();
  // Idempotent : passer paid=true plusieurs fois est sans effet.
  // On ne touche PAS à start_date ici : elle est posée à la génération.
  await admin.from("profiles").update({ paid: true }).eq("id", userId);

  // Le journal des ventes est rattaché au tenant du client, pas à une donnée
  // que l'appelant aurait pu glisser dans les métadonnées.
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null }>();
  if (!prof?.tenant_id) return;

  await recordOrder({
    tenantId: prof.tenant_id,
    userId,
    kind: session.mode === "subscription" ? "subscription" : "one_time",
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? "eur",
    stripeRef: session.id,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
    paidAt: session.created ? new Date(session.created * 1000) : undefined,
  });
}

/**
 * Remboursement. La vente reste au journal, son statut change : sans ça un
 * encaissement annulé continuerait d'être compté dans le chiffre d'affaires.
 *
 * La charge et la session de paiement ne portent pas la même référence, alors
 * on essaie les deux identifiants que Stripe nous donne.
 */
async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  for (const ref of [intent, charge.id]) {
    if (ref && (await markOrderRefunded(ref))) return;
  }
}
