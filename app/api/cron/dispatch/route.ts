import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { dispatchScheduledPushes } from "@/lib/scheduled-push";
import { vapidReady } from "@/lib/push";

export const runtime = "nodejs";
// Volontairement court : cette route ne fait qu'une chose, elle est appelée
// toutes les cinq minutes et ne doit jamais retenir une connexion.
export const maxDuration = 60;

/**
 * Vidange de la file des notifications programmées.
 *
 * Le plan Hobby de Vercel n'accepte que des crons quotidiens, ce qui limitait
 * les envois à quatre créneaux fixes par jour. Cette route est faite pour être
 * appelée bien plus souvent depuis `pg_cron` côté Supabase (voir
 * supabase/pg-cron-notifications.sql), ce qui rend l'heure d'envoi précise
 * sans changer de plan.
 *
 * Elle est idempotente : le dispatcher n'envoie que ce qui est dû et marque
 * chaque ligne au passage. L'appeler dix fois de suite n'envoie rien de plus.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!vapidReady()) return NextResponse.json({ due: 0, sent: 0, reason: "vapid" });
  const res = await dispatchScheduledPushes();
  return NextResponse.json(res);
}
