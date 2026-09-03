import { NextResponse } from "next/server";
import { vapidReady } from "@/lib/push";
import { dispatchScheduledPushes } from "@/lib/scheduled-push";

export const runtime = "nodejs";
export const maxDuration = 60;

// Dispatcher des notifications PROGRAMMÉES, séparé du cron quotidien.
//
// Il tournait dans /api/cron/notify, qui ne s'exécute qu'une fois par jour à
// 07:00 UTC : une notification programmée pour 20 h partait le lendemain matin.
// Ce point d'entrée ne fait que vider la file, il est donc appelable souvent
// sans risque de renvoyer les rappels quotidiens.
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
