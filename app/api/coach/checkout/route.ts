import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { clientOffer } from "@/lib/offers";
import { stripeForTenant } from "@/lib/coach-payments";
import { applyPendingCoachSelection } from "@/lib/tenant";

export const runtime = "nodejs";

// Paiement d'une offre coach : la session Stripe est créée sur le compte DU
// COACH (clé BYOK). La plateforme ne touche pas l'argent, aucune commission,
// aucun compte Connect. Le contrôle du paiement se fait au retour (vérification
// de la session avec la clé du coach), pas via un webhook plateforme.
export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (ctx.access.phase !== "not_paid") {
    return NextResponse.json({ error: "Programme déjà débloqué" }, { status: 409 });
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
  if (offer.price_cents == null || offer.price_cents <= 0) {
    return NextResponse.json({ error: "Cette offre n'a pas de prix." }, { status: 400 });
  }

  const stripe = await stripeForTenant(offer.tenant_id);
  if (!stripe) {
    return NextResponse.json(
      { error: "Le coach n'a pas encore configuré ses paiements." },
      { status: 400 },
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: ctx.userId,
      customer_email: ctx.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: offer.currency || "eur",
            unit_amount: offer.price_cents,
            product_data: { name: offer.name },
          },
        },
      ],
      metadata: { user_id: ctx.userId, offer_id: offer.id },
      success_url: `${site}/generation?coach_paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/app/paiement?annule=1`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch {
    return NextResponse.json(
      { error: "Paiement indisponible. Réessaie dans un instant." },
      { status: 502 },
    );
  }
}
