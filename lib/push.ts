import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Envoi Web Push (rappels de séance, relances). Les clés VAPID viennent des
// variables d'environnement ; sans elles, l'envoi est simplement désactivé
// (l'app reste fonctionnelle, aucune notification n'est tentée).

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@fitme90.app";

let configured = false;

/** Les clés VAPID sont-elles présentes ? Configure web-push au premier appel. */
export function vapidReady(): boolean {
  if (!PUBLIC || !PRIVATE) return false;
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface StoredSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Envoie une notification à un abonnement.
 * Retour : "ok" (envoyée), "gone" (endpoint mort → à supprimer), "error".
 */
export async function sendPush(sub: StoredSub, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  if (!vapidReady()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 6 * 3600 },
    );
    return "ok";
  } catch (e: unknown) {
    const code = (e as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) return "gone"; // abonnement expiré / révoqué
    return "error";
  }
}

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Envoie une notification à TOUS les abonnés (diffusion coach). Nettoie les
 * abonnements morts. Retourne le nombre d'envois réussis et de suppressions.
 */
export async function broadcastPush(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!vapidReady()) return { sent: 0, removed: 0 };
  const db = createAdminClient();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .returns<SubRow[]>();
  let sent = 0;
  const dead: string[] = [];
  for (const s of subs ?? []) {
    const res = await sendPush(s, payload);
    if (res === "ok") sent++;
    else if (res === "gone") dead.push(s.endpoint);
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, removed: dead.length };
}

/**
 * Diffusion CIBLÉE : envoie une notification uniquement aux abonnés dont le
 * user_id figure dans `userIds` (segment filtré côté coach : sexe, objectif,
 * phase…). Nettoie les abonnements morts. Sans destinataire, n'envoie rien.
 */
export async function broadcastPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!vapidReady() || userIds.length === 0) return { sent: 0, removed: 0 };
  const db = createAdminClient();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", userIds)
    .returns<SubRow[]>();
  let sent = 0;
  const dead: string[] = [];
  for (const s of subs ?? []) {
    const res = await sendPush(s, payload);
    if (res === "ok") sent++;
    else if (res === "gone") dead.push(s.endpoint);
  }
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent, removed: dead.length };
}
