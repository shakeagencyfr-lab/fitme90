import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Flux de notifications du coach (cloche du dashboard). Best-effort : l'insertion
// ne doit jamais casser le flux appelant. Lecture réservée au serveur (RLS sans
// policy, accès service_role).

export type CoachNotifType = "vip_message" | "purchase" | "subscription" | "info";

export interface CoachNotif {
  id: string;
  type: CoachNotifType;
  title: string;
  body: string | null;
  url: string | null;
  client_id: string | null;
  created_at: string;
  read_at: string | null;
}

const COLS = "id, type, title, body, url, client_id, created_at, read_at";

/** Crée une notification coach (best-effort, jamais bloquant). */
export async function addCoachNotification(input: {
  tenantId: string | null;
  type: CoachNotifType;
  title: string;
  body?: string | null;
  url?: string | null;
  clientId?: string | null;
}): Promise<void> {
  if (!input.tenantId) return;
  try {
    const admin = createAdminClient();
    await admin.from("coach_notifications").insert({
      tenant_id: input.tenantId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      url: input.url ?? null,
      client_id: input.clientId ?? null,
    });
  } catch {
    /* notifications best-effort */
  }
}

/** Dernières notifications d'un tenant (plus récentes d'abord). */
export async function listCoachNotifications(tenantId: string, limit = 30): Promise<CoachNotif[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_notifications")
    .select(COLS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<CoachNotif[]>();
  return data ?? [];
}

/** Nombre de notifications non lues (pastille de la cloche). */
export async function unreadCoachNotifCount(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("coach_notifications")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("read_at", null);
  return count ?? 0;
}

/** Marque toutes les notifications du tenant comme lues. */
export async function markAllCoachNotifsRead(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("coach_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .is("read_at", null);
}

/** Marque une notification précise comme lue (garde-fou tenant). */
export async function markCoachNotifRead(tenantId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("coach_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .is("read_at", null);
}
