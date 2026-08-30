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

/**
 * Un compte « coach/salle » (espace admin) ? Aujourd'hui : e-mail admin OU
 * rôle « owner » (le propriétaire de la plateforme). Le rôle « coach » sera
 * ajouté ici quand le dashboard sera cloisonné par tenant (chaque coach ne voit
 * que SES clients) — sinon il verrait tous les clients de tous les tenants.
 */
export function isCoachAccount(ctx: SessionContext | null): boolean {
  if (!ctx) return false;
  return isAdminEmail(ctx.email) || ctx.profile?.role === "owner";
}

/** Renvoie le contexte si l'utilisateur a accès à l'espace admin, sinon null. */
export async function getAdminOrNull(): Promise<SessionContext | null> {
  const ctx = await getSessionContext();
  if (!isCoachAccount(ctx)) return null;
  return ctx;
}
