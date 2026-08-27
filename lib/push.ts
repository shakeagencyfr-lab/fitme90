import "server-only";
import webpush from "web-push";

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
