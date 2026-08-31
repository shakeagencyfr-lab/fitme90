import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Accès d'assistance (« master admin ») et liens de connexion à usage unique.
//
// Brique partagée par deux fonctionnalités du dashboard réseau :
//   1. Création manuelle d'un compte revendeur/coach -> on rend un lien de
//      connexion que l'opérateur copie et envoie au titulaire.
//   2. « Se connecter en assistance » dans un sous-compte -> même lien, ouvert
//      directement dans le navigateur de l'opérateur (impersonation).
//
// Le lien pointe vers notre route /auth/confirm avec un token_hash Supabase
// (type magiclink), qu'elle vérifie côté serveur (verifyOtp) pour établir la
// session. Aucun mot de passe n'est exposé.

/**
 * Vrai si `targetTenantId` est un descendant strict de `ancestorTenantId`
 * (en remontant la chaîne parent_id). Sert de garde d'autorisation : un
 * opérateur ne peut agir que sur les comptes sous son propre étage.
 */
export async function isDescendantTenant(ancestorTenantId: string, targetTenantId: string): Promise<boolean> {
  if (!ancestorTenantId || !targetTenantId || ancestorTenantId === targetTenantId) return false;
  const admin = createAdminClient();
  let current = targetTenantId;
  // Garde-fou anti-boucle : la hiérarchie a au plus 3 niveaux, 12 suffit large.
  for (let i = 0; i < 12; i++) {
    const res = await admin
      .from("tenants")
      .select("parent_id")
      .eq("id", current)
      .maybeSingle<{ parent_id: string | null }>();
    const parent: string | null = res.data?.parent_id ?? null;
    if (!parent) return false;
    if (parent === ancestorTenantId) return true;
    current = parent;
  }
  return false;
}

/**
 * Génère un lien de connexion à usage unique pour un utilisateur (par son
 * e-mail), vers `next`. `origin` doit être une origine absolue (https://…)
 * pour un lien copiable ; pour une redirection interne un chemin relatif suffit.
 * Renvoie null si l'utilisateur n'a pas d'e-mail ou si la génération échoue.
 */
export async function loginLinkForUser(userId: string, next: string, origin: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: got } = await admin.auth.admin.getUserById(userId);
  const email = got?.user?.email;
  if (!email) return null;

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) return null;

  const safeNext = next.startsWith("/") ? next : "/admin";
  const q = new URLSearchParams({ token_hash: hashed, type: "magiclink", next: safeNext });
  return `${origin.replace(/\/+$/, "")}/auth/confirm?${q.toString()}`;
}

/** Trace un accès d'assistance (best-effort, ne bloque jamais l'action). */
export async function logSupportAccess(entry: {
  actorUserId: string;
  actorTenantId: string;
  targetUserId: string;
  targetTenantId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("support_access_log").insert({
      actor_user_id: entry.actorUserId,
      actor_tenant_id: entry.actorTenantId,
      target_user_id: entry.targetUserId,
      target_tenant_id: entry.targetTenantId,
    });
  } catch {
    /* la traçabilité ne doit jamais empêcher le dépannage */
  }
}
