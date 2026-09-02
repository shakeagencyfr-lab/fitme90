import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDescendantTenant } from "@/lib/support-access";
import { creditWallet } from "@/lib/credits";
import { purgeUser } from "@/lib/account-deletion";
import { stripeForTenant } from "@/lib/coach-payments";

// Actions d'un opérateur réseau (plateforme ou revendeur) sur un compte de sa
// descendance : désactiver / réactiver, offrir des crédits IA, supprimer.
// Chaque action revérifie que la cible est bien sous l'étage de l'acteur.

export interface NetworkActionResult {
  ok: boolean;
  error?: string;
}

async function guard(actorTenantId: string, targetTenantId: string): Promise<string | null> {
  if (!(await isDescendantTenant(actorTenantId, targetTenantId))) return "Ce compte n'est pas dans ton réseau.";
  return null;
}

/** Désactive un compte (les clients perdent l'accès, rien n'est supprimé). */
export async function suspendTenant(actorTenantId: string, targetTenantId: string): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ suspended_at: new Date().toISOString(), suspended_reason: "manual" })
    .eq("id", targetTenantId);
  return error ? { ok: false, error: "Désactivation impossible." } : { ok: true };
}

/** Réactive un compte désactivé manuellement. */
export async function reactivateTenant(actorTenantId: string, targetTenantId: string): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ suspended_at: null, suspended_reason: null }).eq("id", targetTenantId);
  return error ? { ok: false, error: "Réactivation impossible." } : { ok: true };
}

/**
 * L'acteur fournit-il les crédits IA de la cible ? Vrai si un coach dont le
 * revendeur vend l'IA en crédits, ou un revendeur qui achète ses crédits à la
 * plateforme. En BYOK, il n'y a pas de portefeuille à créditer.
 */
export async function canGiftCredits(actorTenantId: string, targetTenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: actor }, { data: target }] = await Promise.all([
    admin.from("tenants").select("kind, reseller_model").eq("id", actorTenantId).maybeSingle<{ kind: string; reseller_model: string | null }>(),
    admin.from("tenants").select("kind, ai_supply, parent_id").eq("id", targetTenantId).maybeSingle<{ kind: string; ai_supply: string | null; parent_id: string | null }>(),
  ]);
  if (!actor || !target || target.parent_id !== actorTenantId) return false;
  if (target.kind === "reseller") return target.ai_supply === "platform_credits";
  if (target.kind === "coach") return actor.reseller_model === "credits";
  return false;
}

/** Offre des crédits IA (geste commercial), tracés dans le journal comme un ajustement. */
export async function giftCredits(actorTenantId: string, targetTenantId: string, amount: number): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return { ok: false, error: "Montant invalide (1 à 100 000 crédits)." };
  if (!(await canGiftCredits(actorTenantId, targetTenantId))) {
    return { ok: false, error: "Ce compte utilise sa propre clé IA (BYOK) : il n'a pas de portefeuille de crédits à créditer." };
  }
  try {
    await creditWallet(targetTenantId, amount, "adjust", `gift:${actorTenantId}:${Date.now()}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Crédit impossible." };
  }
}

/**
 * Supprime définitivement un compte de la descendance et tout ce qui s'y
 * rattache : ses propres comptes enfants (revendeur -> coachs), les profils
 * (coach + clients) puis le tenant (cascade sur les tables liées).
 */
export async function deleteTenantTree(actorTenantId: string, targetTenantId: string): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  try {
    await deleteTree(targetTenantId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Suppression impossible." };
  }
}

async function deleteTree(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: kids } = await admin.from("tenants").select("id").eq("parent_id", tenantId).returns<{ id: string }[]>();
  for (const k of kids ?? []) await deleteTree(k.id);

  // Abonnement au parent : coupé (best effort) pour ne pas facturer un compte supprimé.
  const { data: t } = await admin
    .from("tenants")
    .select("sub_id, parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ sub_id: string | null; parent_id: string | null }>();
  if (t?.sub_id && t.parent_id) {
    const stripe = await stripeForTenant(t.parent_id);
    if (stripe) {
      try {
        await stripe.subscriptions.cancel(t.sub_id);
      } catch {
        /* abonnement déjà clos ou clé absente */
      }
    }
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .returns<{ id: string; role: string | null }[]>();
  const ordered = (profiles ?? []).sort((a, b) => (a.role === "owner" ? 1 : 0) - (b.role === "owner" ? 1 : 0));
  for (const p of ordered) {
    await purgeUser(p.id);
  }
  await admin.from("coach_notes").delete().eq("tenant_id", tenantId);
  await admin.from("profiles").delete().eq("tenant_id", tenantId);
  const { error } = await admin.from("tenants").delete().eq("id", tenantId);
  if (error) throw error;
}
