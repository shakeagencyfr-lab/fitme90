import { NextResponse } from "next/server";
import { syncAllSubscriptions } from "@/lib/subscription";

export const runtime = "nodejs";
export const maxDuration = 60;

// Cron quotidien (voir vercel.json) : resynchronise l'état des abonnements
// Stripe (BYOK, sans webhook plateforme) en relisant chaque abonnement avec la
// clé du coach concerné. Met à jour statut / période / intervalle sur les
// profils ; l'accès en lecture seule est ensuite appliqué au vol par le guard.
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
  return NextResponse.json({ synced, restricted });
}
