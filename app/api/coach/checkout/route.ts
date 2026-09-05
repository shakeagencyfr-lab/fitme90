import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { clientOffer } from "@/lib/offers";
import { installmentCount, paymentModes, resolvePaymentMode } from "@/lib/installments";
import { tenantAiReady } from "@/lib/ai-readiness";
import { stripeForTenant } from "@/lib/coach-payments";
import { applyPendingCoachSelection } from "@/lib/tenant";
import { validatePromo } from "@/lib/promo";

export const runtime = "nodejs";

// Paiement d'une offre coach : la session Stripe est créée sur le compte DU
// COACH (clé BYOK). La plateforme ne touche pas l'argent, aucune commission,
// aucun compte Connect. Le contrôle du paiement se fait au retour (vérification
// de la session avec la clé du coach), pas via un webhook plateforme.
export async function POST(req: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (ctx.access.phase !== "not_paid") {
    return NextResponse.json({ error: "Programme déjà débloqué" }, { status: 409 });
  }

  // Code promo éventuel (appliqué au paiement en une fois), et façon de payer
  // choisie sur la page (« once » ou « month »), qui prime sur la préférence
  // enregistrée à l'inscription.
  let promoRaw = "";
  let modeRaw: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.code === "string") promoRaw = body.code;
    if (body && typeof body.mode === "string") modeRaw = body.mode;
  } catch {
    /* corps vide : pas de code */
  }

  // Filet de sécurité : appliquer le rattachement coach/offre s'il ne l'a pas
  // encore été (ex. confirmation d'e-mail non passée par notre route).
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await applyPendingCoachSelection(user.id, user.user_metadata);
  } catch {
    /* non bloquant */
  }

  const offer = await clientOffer(ctx.userId);
  if (!offer) {
    return NextResponse.json({ error: "Aucune offre sélectionnée." }, { status: 400 });
  }

  // Deux verrous avant d'encaisser, pas un seul. Sans IA disponible au bout de
  // la chaîne de fourniture, ce paiement achèterait un programme que
  // l'application ne saurait pas générer : mieux vaut refuser la vente que
  // rembourser après coup.
  const [stripe, aiReady] = await Promise.all([
    stripeForTenant(offer.tenant_id),
    tenantAiReady(offer.tenant_id),
  ]);
  if (!stripe) {
    return NextResponse.json(
      { error: "Le coach n'a pas encore configuré ses paiements." },
      { status: 400 },
    );
  }
  if (!aiReady) {
    return NextResponse.json(
      { error: "Ce coach n'a pas terminé la configuration de son espace. Contacte-le avant de payer." },
      { status: 400 },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const currency = offer.currency || "eur";
  const successUrl = `${site}/generation?coach_paid=1&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${site}/app/paiement?annule=1`;

  // En une fois, ou en N mensualités (N = la durée du programme). La
  // préférence enregistrée à l'inscription sert de défaut ; la page de
  // paiement peut en changer.
  const modes = paymentModes(offer);
  const supabase = await createClient();
  const { data: prof } = await supabase
    .from("profiles")
    .select("selected_interval")
    .eq("id", ctx.userId)
    .maybeSingle<{ selected_interval: string | null }>();
  const mode = resolvePaymentMode(modeRaw ?? prof?.selected_interval ?? null, modes);
  if (!mode) {
    return NextResponse.json({ error: "Cette offre n'a pas de prix." }, { status: 400 });
  }
  if (modeRaw && (modeRaw === "once" || modeRaw === "month")) {
    await supabase.from("profiles").update({ selected_interval: modeRaw }).eq("id", ctx.userId);
  }

  try {
    if (mode === "installments") {
      const amount = offer.price_month_cents ?? 0;
      const count = installmentCount(offer);
      // Un abonnement mensuel chez Stripe, dont la date d'arrêt est posée au
      // retour du paiement (`cancel_at`) et relue par le cron : exactement N
      // factures, puis plus rien, sans démarche du client.
      const checkout = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: ctx.userId,
        customer_email: ctx.email ?? undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amount,
              recurring: { interval: "month" },
              product_data: { name: `${offer.name} (${count} mensualités)` },
            },
          },
        ],
        metadata: { user_id: ctx.userId, offer_id: offer.id, installments: String(count) },
        subscription_data: {
          metadata: { user_id: ctx.userId, offer_id: offer.id, installments: String(count) },
          description: `${offer.name} : ${count} mensualités, arrêt automatique après la dernière.`,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ url: checkout.url });
    }

    // Paiement en une fois.
    if (offer.price_cents == null || offer.price_cents <= 0) {
      return NextResponse.json({ error: "Cette offre n'a pas de prix." }, { status: 400 });
    }

    // Code promo : remise appliquée au montant. Refusé si invalide.
    let amount = offer.price_cents;
    const meta: Record<string, string> = { user_id: ctx.userId, offer_id: offer.id };
    if (promoRaw.trim()) {
      const promo = await validatePromo(offer.tenant_id, promoRaw, offer.price_cents);
      if (!promo.ok) {
        return NextResponse.json({ error: promo.error ?? "Code promo invalide." }, { status: 400 });
      }
      amount = promo.discountedCents!;
      meta.promo_code = promo.code!;
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: ctx.userId,
      customer_email: ctx.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: { name: offer.name },
          },
        },
      ],
      metadata: meta,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return NextResponse.json({ url: checkout.url });
  } catch {
    return NextResponse.json(
      { error: "Paiement indisponible. Réessaie dans un instant." },
      { status: 502 },
    );
  }
}
