import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Webhook Stripe. runtime nodejs + corps BRUT obligatoires : sinon la
// vérification de signature échoue. Idempotent (Stripe rejoue les événements).
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Sécurité : n'activer que si le paiement est réellement encaissé.
    if (session.payment_status === "paid") {
      const userId =
        session.metadata?.user_id ?? session.client_reference_id ?? null;
      if (userId) {
        const admin = createAdminClient();
        // Idempotent : passer paid=true plusieurs fois est sans effet.
        // On ne touche PAS à start_date ici : elle est posée à la génération.
        await admin.from("profiles").update({ paid: true }).eq("id", userId);
      }
    }
  }

  // Toujours 200 rapidement pour éviter les nouvelles tentatives inutiles.
  return NextResponse.json({ received: true });
}
