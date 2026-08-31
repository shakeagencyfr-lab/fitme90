import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSessionContext } from "@/lib/guard";
import { PRICE_CENTS, CURRENCY, PRODUCT_NAME } from "@/lib/config";

export const runtime = "nodejs";

// Crée une session Stripe Checkout à 190 €, paiement unique.
// Le contrôle du paiement se fait ensuite CÔTÉ SERVEUR (webhook + guard) :
// on ne fait jamais confiance au retour client.
export async function POST() {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (ctx.access.phase !== "not_paid") {
    // Déjà payé (ou en cours) : rien à facturer.
    return NextResponse.json({ error: "Programme déjà débloqué" }, { status: 409 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: ctx.userId,
    customer_email: ctx.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: PRICE_CENTS,
          product_data: {
            name: `${PRODUCT_NAME} — programme personnalisé`,
            description:
              "Programme d'entraînement et accompagnement nutritionnel personnalisés. Paiement unique.",
          },
        },
      },
    ],
    // On rattache l'utilisateur aux métadonnées pour le webhook.
    metadata: { user_id: ctx.userId },
    // Après paiement : on enchaîne sur la génération du programme.
    success_url: `${site}/generation?paiement=ok`,
    cancel_url: `${site}/app/paiement?annule=1`,
  });

  return NextResponse.json({ url: checkout.url });
}
