import "server-only";
import Stripe from "stripe";

// Client Stripe — SERVEUR UNIQUEMENT. La clé secrète ne quitte jamais Vercel.
// On ne fixe pas apiVersion : le SDK utilise la version par défaut du compte.
let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquant.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}
