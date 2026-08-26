import "server-only";
import { getSessionContext, type SessionContext } from "@/lib/guard";

// Accès admin (dashboard coach). Verrouillé par la variable d'environnement
// ADMIN_EMAILS (liste d'e-mails séparés par des virgules). Fermé par défaut :
// si la variable est absente ou vide, PERSONNE n'est admin. Aucun e-mail n'est
// codé en dur (le dépôt est public).

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = adminEmails();
  return list.length > 0 && list.includes(email.toLowerCase());
}

/** Renvoie le contexte si l'utilisateur est admin, sinon null. */
export async function getAdminOrNull(): Promise<SessionContext | null> {
  const ctx = await getSessionContext();
  if (!ctx || !isAdminEmail(ctx.email)) return null;
  return ctx;
}
