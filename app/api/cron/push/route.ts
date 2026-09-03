import { NextResponse } from "next/server";
import { vapidReady } from "@/lib/push";
import { dispatchScheduledPushes } from "@/lib/scheduled-push";

export const runtime = "nodejs";
export const maxDuration = 60;

// Dispatcher des notifications PROGRAMMÉES. Ne fait QUE vider la file, il est
// donc appelable aussi souvent qu'on veut sans renvoyer les rappels quotidiens.
//
// Fréquence : le plan Hobby de Vercel n'accepte QUE des crons quotidiens. Une
// expression horaire (0 * * * *) fait échouer le déploiement entier, pas juste
// le cron. La file est donc vidée à chaque passage des quatre crons du jour
// (02:30, 06:00, 07:00, 18:00 UTC), et le délai d'une notification programmée
// est au pire de quelques heures. Passer à un envoi à l'heure dite demande le
// plan Pro (crons à la minute) ou un ordonnanceur externe.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }
  if (!vapidReady()) {
    return NextResponse.json({ error: "VAPID non configuré" }, { status: 503 });
  }
  const result = await dispatchScheduledPushes();
  return NextResponse.json(result);
}
