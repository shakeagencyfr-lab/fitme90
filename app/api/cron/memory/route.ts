import { NextResponse } from "next/server";
import { refreshMemoryDigests } from "@/lib/memory-digest";

export const runtime = "nodejs";
export const maxDuration = 300; // une tournée appelle le modèle par client actif

// Cron nocturne (voir vercel.json) : met à jour le résumé de mémoire de chaque
// client ayant échangé avec son coach IA. Complète l'outil `memoriser`, qui
// retient l'immédiat ; ici on garantit qu'aucun échange ne se perd quand la
// fenêtre de 24 messages défile.
// Protégé par CRON_SECRET (Vercel envoie « Authorization: Bearer <secret> »).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }
  return NextResponse.json(await refreshMemoryDigests());
}
