import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { broadcastPushToUsers } from "@/lib/push";
import { resolveAudience } from "@/lib/audience";

// Envoi des notifications programmées par le coach.
//
// Extrait du cron quotidien : celui-ci ne tourne qu'une fois par jour, donc une
// notification programmée à 20 h attendait le lendemain matin. Ce dispatcher
// est appelé bien plus souvent (voir vercel.json) et ne fait QUE ça.
//
// Idempotent : `sent_at` est posé après l'envoi, et la requête ne prend que les
// lignes où il est nul. Deux exécutions concurrentes peuvent au pire envoyer un
// doublon, jamais boucler.

interface DueRow {
  id: string;
  tenant_id: string | null;
  title: string;
  body: string;
  url: string;
  filter_sex: string | null;
  filter_goal: string | null;
  filter_phase: string | null;
}

const COLS = "id, tenant_id, title, body, url, filter_sex, filter_goal, filter_phase";

export interface ScheduledPushResult {
  /** Notifications devenues dues et traitées sur cette exécution. */
  due: number;
  /** Notifications push effectivement remises. */
  sent: number;
}

export async function dispatchScheduledPushes(now: Date = new Date()): Promise<ScheduledPushResult> {
  const db = createAdminClient();
  const { data } = await db
    .from("scheduled_pushes")
    .select(COLS)
    .is("sent_at", null)
    .lte("send_at", now.toISOString())
    .order("send_at", { ascending: true })
    .limit(200)
    .returns<DueRow[]>();

  const rows = data ?? [];
  let sent = 0;
  for (const s of rows) {
    const payload = { title: s.title, body: s.body, url: s.url, tag: "coach-broadcast" };
    const phase = s.filter_phase === "active" || s.filter_phase === "paid" ? s.filter_phase : "all";
    // Cloisonné au tenant du coach : la diffusion (même sans filtre) ne touche
    // que SES clients, jamais ceux d'un autre coach.
    const { userIds } = await resolveAudience(
      { sex: s.filter_sex ?? "", goal: s.filter_goal ?? "", phase },
      s.tenant_id,
    );
    if (userIds.length) {
      const r = await broadcastPushToUsers(userIds, payload);
      sent += r.sent;
    }
    // Marquée envoyée même sans destinataire : sinon elle serait rejouée à
    // chaque passage jusqu'à ce qu'un client s'abonne.
    await db.from("scheduled_pushes").update({ sent_at: new Date().toISOString() }).eq("id", s.id);
  }
  return { due: rows.length, sent };
}
