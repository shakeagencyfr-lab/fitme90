import { NextResponse } from "next/server";
import { syncAllSubscriptions } from "@/lib/subscription";
import { autoRegenSubscribers } from "@/lib/regen";

export const runtime = "nodejs";
export const maxDuration = 300; // la régénération appelle le modèle (peut être long)

// Cron quotidien (voir vercel.json) :
// 1) resynchronise l'état des abonnements Stripe (BYOK, sans webhook plateforme)
//    en relisant chaque abonnement avec la clé du coach ; l'accès en lecture
//    seule est ensuite appliqué au vol par le guard sur défaut de paiement.
// 2) régénère automatiquement le cycle (~4 semaines) des abonnés EN RÈGLE, en
//    tenant compte du cycle précédent (Lot ④).
// Protégé par CRON_SECRET (Vercel envoie « Authorization: Bearer <secret> »).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }
  const { synced, restricted } = await syncAllSubscriptions();
  const { checked, regenerated } = await autoRegenSubscribers();
  return NextResponse.json({ synced, restricted, checked, regenerated });
}
