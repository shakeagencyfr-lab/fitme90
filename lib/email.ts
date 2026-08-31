import "server-only";
import { activeTenantSmtp, sendViaSmtp } from "@/lib/smtp";

// Envoi d'e-mails transactionnels. Par défaut via Resend (API HTTPS), gated sur
// RESEND_API_KEY. Si un tenant a débloqué la marque blanche ET configuré son
// SMTP perso, ses e-mails partent de SON serveur, sous SA marque.

const API_KEY = process.env.RESEND_API_KEY;
// Expéditeur des e-mails transactionnels de la plateforme. Doit être une adresse
// d'un domaine VÉRIFIÉ chez Resend (sinon l'envoi est refusé). Surchargée par la
// variable RESEND_FROM. Par défaut : le domaine principal de la plateforme.
const FROM = process.env.RESEND_FROM || "FitMe90 <notifications@myfitnessapp.fit>";

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
export async function sendEmail(msg: EmailMessage, fromTenantId?: string | null): Promise<boolean> {
  // Marque blanche : e-mails envoyés depuis le serveur SMTP du coach si dispo.
  if (fromTenantId) {
    const smtp = await activeTenantSmtp(fromTenantId);
    if (smtp) return sendViaSmtp(smtp, msg);
  }
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
