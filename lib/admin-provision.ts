import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { freeSlug } from "@/lib/coach-onboarding";
import type { TenantKind } from "@/lib/hierarchy";

// Création manuelle d'un compte enfant (revendeur ou coach) depuis le dashboard
// réseau. On crée l'utilisateur (e-mail confirmé, sans mot de passe : il entrera
// via un lien de connexion), puis son tenant rattaché au parent, et on le passe
// « owner ». Le rôle handle_new_user crée la ligne profiles à la création de
// l'utilisateur ; on la complète ensuite.

export type CreatedAccount =
  | { ok: true; userId: string; tenantId: string; slug: string }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createChildTenantAccount(opts: {
  parentTenantId: string;
  kind: Extract<TenantKind, "reseller" | "coach">;
  name: string;
  email: string;
  contactName?: string;
  /** Revendeur : fournit l'IA avec sa clé (byok) ou achète des crédits à la plateforme. */
  aiSupply?: "byok" | "platform_credits";
}): Promise<CreatedAccount> {
  const name = opts.name.trim().slice(0, 60);
  const email = opts.email.trim().toLowerCase();
  const contactName = (opts.contactName ?? "").trim().slice(0, 40);
  if (!name) return { ok: false, error: "Indique un nom pour le compte." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Adresse e-mail invalide." };

  const admin = createAdminClient();

  // 1) Utilisateur auth (e-mail déjà confirmé : accès par lien de connexion).
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (userErr || !created?.user) {
    const msg = (userErr?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false, error: "Un compte existe déjà avec cette adresse e-mail." };
    }
    return { ok: false, error: "Impossible de créer le compte. Réessaie." };
  }
  const userId = created.user.id;

  // 2) Tenant rattaché au parent.
  const slug = await freeSlug(admin, name);
  const { data: tenant, error: tErr } = await admin
    .from("tenants")
    .insert({
      slug,
      name,
      kind: opts.kind,
      parent_id: opts.parentTenantId,
      // Un revendeur en crédits plateforme fournit l'IA à ses coachs (mode
      // provider) sans clé à lui : c'est la clé de la plateforme qui tourne.
      ...(opts.kind === "reseller" && opts.aiSupply === "platform_credits"
        ? { ai_supply: "platform_credits", ai_mode: "provider" }
        : {}),
    })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (tErr || !tenant) {
    // Rollback de l'utilisateur pour ne pas laisser de compte orphelin.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { ok: false, error: "Compte créé partiellement puis annulé. Réessaie." };
  }

  // 3) Profil -> owner du tenant.
  const patch: Record<string, string> = { tenant_id: tenant.id, role: "owner" };
  if (contactName) patch.name = contactName;
  await admin.from("profiles").update(patch).eq("id", userId);

  return { ok: true, userId, tenantId: tenant.id, slug };
}
