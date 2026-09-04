import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { clientOffer, subscriptionPrice } from "@/lib/offers";
import { tenantAiReady } from "@/lib/ai-readiness";
import { stripeForTenant } from "@/lib/coach-payments";
import { applyPendingCoachSelection } from "@/lib/tenant";
import { validatePromo } from "@/lib/promo";

export const runtime = "nodejs";

// Résout l'intervalle d'abonnement effectif : préférence du client si le prix
// existe, sinon le seul intervalle disponible.
function resolveInterval(
  preferred: string | null,
  hasMonth: boolean,
  hasYear: boolean,
): "month" | "year" | null {
  if (preferred === "year" && hasYear) return "year";
  if (preferred === "month" && hasMonth) return "month";
  if (hasMonth) return "month";
  if (hasYear) return "year";
  return null;
}

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

  // Code promo éventuel (appliqué au paiement unique).
  let promoRaw = "";
  try {
    const body = await req.json();
    if (body && typeof body.code === "string") promoRaw = body.code;
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

  try {
    if (offer.billing_type === "subscription") {
      // Intervalle choisi par le client (profiles.selected_interval), sinon défaut.
      const supabase = await createClient();
      const { data: prof } = await supabase
        .from("profiles")
        .select("selected_interval")
        .eq("id", ctx.userId)
        .maybeSingle<{ selected_interval: string | null }>();
      const interval = resolveInterval(
        prof?.selected_interval ?? null,
        offer.price_month_cents != null,
        offer.price_year_cents != null,
      );
      const amount = interval ? subscriptionPrice(offer, interval) : null;
      if (!interval || amount == null || amount <= 0) {
        return NextResponse.json({ error: "Cette offre n'a pas de prix d'abonnement." }, { status: 400 });
      }
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
              recurring: { interval },
              product_data: { name: offer.name },
            },
          },
        ],
        metadata: { user_id: ctx.userId, offer_id: offer.id },
        subscription_data: { metadata: { user_id: ctx.userId, offer_id: offer.id } },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ url: checkout.url });
    }

    // Paiement unique (comportement historique).
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
