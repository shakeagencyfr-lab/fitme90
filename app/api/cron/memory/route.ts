import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { refreshMemoryDigests } from "@/lib/memory-digest";
import { dispatchScheduledPushes } from "@/lib/scheduled-push";
import { vapidReady } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 300; // une tournée appelle le modèle par client actif

// Cron nocturne (voir vercel.json) : met à jour le résumé de mémoire de chaque
// client ayant échangé avec son coach IA. Complète l'outil `memoriser`, qui
// retient l'immédiat ; ici on garantit qu'aucun échange ne se perd quand la
// fenêtre de 24 messages défile.
// Protégé par CRON_SECRET (Vercel envoie « Authorization: Bearer <secret> ») ;
// sans secret configuré, la route refuse tout (lib/cron-auth.ts).
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  // Notifications programmées : voir /api/cron/push. Le plan Hobby n'autorise
  // qu'un cron par jour, donc chaque cron vide la file au passage.
  const broadcast = vapidReady() ? await dispatchScheduledPushes() : { due: 0, sent: 0 };
  return NextResponse.json({ ...(await refreshMemoryDigests()), broadcast });
}
