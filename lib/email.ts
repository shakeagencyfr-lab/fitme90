import "server-only";

// Envoi d'e-mails transactionnels via Resend (API HTTPS, sans SDK). Gated sur
// RESEND_API_KEY : sans clé, l'envoi est simplement désactivé (l'app reste
// fonctionnelle, aucun e-mail n'est tenté) — même logique que le Web Push VAPID.

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || "FitMe90 <notifications@fitme90.app>";

export function emailReady(): boolean {
  return !!API_KEY;
}

export interface EmailMessage {
  to: string[];
  subject: string;
  text: string;
  html?: string;
}

/**
 * Envoie un e-mail. Retourne true si l'envoi a été accepté par Resend.
 * Ne jette jamais : en cas d'erreur (clé absente, réseau, 4xx/5xx), retourne
 * false pour ne pas casser le flux appelant.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!API_KEY) return false;
  const to = msg.to.map((e) => e.trim()).filter(Boolean);
  if (to.length === 0) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to,
        subject: msg.subject,
        text: msg.text,
        ...(msg.html ? { html: msg.html } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
