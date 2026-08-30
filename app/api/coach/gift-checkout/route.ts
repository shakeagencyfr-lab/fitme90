import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";

export const runtime = "nodejs";

// Achat cadeau EN INVITÉ (sans compte) : un acheteur paie une offre à paiement
// unique d'un coach pour l'offrir. Le paiement se fait sur le compte Stripe DU
// COACH (BYOK). Au retour, la page « merci » génère et affiche le code cadeau.
const bodySchema = z.object({
  slug: z.string().min(1).max(80),
  offerId: z.string().min(1).max(64),
  email: z.string().email().max(160),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informations invalides." }, { status: 400 });
  }
  const { slug, offerId, email } = parsed.data;

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();
  if (!tenant) return NextResponse.json({ error: "Coach introuvable." }, { status: 404 });

  const { data: offer } = await admin
    .from("offers")
    .select("id, name, price_cents, currency, billing_type, is_active")
    .eq("id", offerId)
    .eq("tenant_id", tenant.id)
    .maybeSingle<{ id: string; name: string; price_cents: number | null; currency: string; billing_type: string; is_active: boolean }>();
  if (!offer || !offer.is_active) return NextResponse.json({ error: "Offre indisponible." }, { status: 400 });
  if (offer.billing_type === "subscription") {
    return NextResponse.json({ error: "Seules les offres à paiement unique peuvent être offertes." }, { status: 400 });
  }
  if (offer.price_cents == null || offer.price_cents <= 0) {
    return NextResponse.json({ error: "Cette offre n'a pas de prix." }, { status: 400 });
  }

  const stripe = await stripeForTenant(tenant.id);
  if (!stripe) {
    return NextResponse.json({ error: "Le coach n'a pas encore configuré ses paiements." }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: offer.currency || "eur",
            unit_amount: offer.price_cents,
            product_data: { name: `Cadeau : ${offer.name}` },
          },
        },
      ],
      metadata: { gift: "1", tenant_id: tenant.id, offer_id: offer.id, buyer_email: email },
      success_url: `${site}/c/${slug}/offrir/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/c/${slug}/offrir?annule=1`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch {
    return NextResponse.json({ error: "Paiement indisponible. Réessaie dans un instant." }, { status: 502 });
  }
}
