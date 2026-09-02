import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";

// Suppression TOTALE et irréversible d'un compte coach/salle : ses clients (et
// toutes leurs données + comptes auth), ses propres données, puis le tenant.
// Déclenchée par le coach lui-même depuis « Mon abonnement » (résiliation
// complète). Réservée au niveau `coach` : un revendeur/plateforme ne peut pas
// s'auto-supprimer ainsi (cela orphelinerait des comptes enfants).

// Tables indexées par utilisateur (mêmes que la suppression d'un client).
const USER_TABLES: [string, string][] = [
  ["ai_calls", "user_id"],
  ["coach_messages", "user_id"],
  ["coach_conversations", "user_id"],
  ["equipment", "user_id"],
  ["measurements", "user_id"],
  ["photos", "user_id"],
  ["programs", "user_id"],
  ["push_subscriptions", "user_id"],
  ["questionnaires", "user_id"],
  ["session_logs", "user_id"],
  ["shopping_checks", "user_id"],
  ["weights", "user_id"],
  ["coach_notes", "client_id"],
  ["vip_messages", "client_id"],
];

/** Purge un utilisateur quel que soit son rôle (réservé aux suppressions de compte/tenant). */
export async function purgeUser(userId: string): Promise<void> {
  const admin = createAdminClient();
  for (const [table, col] of USER_TABLES) {
    await admin.from(table).delete().eq(col, userId);
  }
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    /* le profil sera supprimé ; on n'échoue pas le flux pour autant */
  }
}

/**
 * Purge complète et irréversible d'UN client : toutes ses données, son profil
 * et son compte auth. Garde-fou : ne touche JAMAIS un compte `owner` (coach).
 * Utilisée par la suppression manuelle et par le nettoyage des impayés.
 */
export async function purgeClientAccount(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string | null }>();
  if (!prof || prof.role === "owner") return; // jamais un coach

  for (const [table, col] of USER_TABLES) {
    await admin.from(table).delete().eq(col, userId);
  }
  // Libère d'éventuels codes cadeaux consommés (réutilisables).
  await admin.from("gift_codes").update({ used_by: null, used_at: null }).eq("used_by", userId);
  await admin.from("profiles").delete().eq("id", userId);
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    /* le profil est déjà supprimé : on n'échoue pas le flux */
  }
}

export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
}

/**
 * Supprime définitivement le compte coach `tenantId` et TOUT ce qui s'y rattache.
 * `ownerUserId` doit être le propriétaire du tenant (double contrôle appelant).
 */
export async function deleteOwnCoachAccount(tenantId: string, ownerUserId: string): Promise<DeleteAccountResult> {
  const admin = createAdminClient();

  // Garde-fou : seul un tenant de type coach peut être auto-supprimé ainsi.
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, kind, parent_id, sub_id")
    .eq("id", tenantId)
    .maybeSingle<{ id: string; kind: string; parent_id: string | null; sub_id: string | null }>();
  if (!tenant) return { ok: false, error: "Compte introuvable." };
  if (tenant.kind !== "coach") {
    return { ok: false, error: "Seul un compte coach peut être résilié de cette façon." };
  }

  // 1) Coupe l'abonnement au revendeur immédiatement (best effort).
  if (tenant.sub_id && tenant.parent_id) {
    const stripe = await stripeForTenant(tenant.parent_id);
    if (stripe) {
      try {
        await stripe.subscriptions.cancel(tenant.sub_id);
      } catch {
        /* l'abonnement sera de toute façon orphelin ; on continue la suppression */
      }
    }
  }

  // 2) Tous les profils rattachés au tenant (le coach + ses clients).
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .returns<{ id: string; role: string | null }[]>();

  // Purge chaque utilisateur (données + compte auth). Le propriétaire en dernier.
  const ordered = (profiles ?? []).sort((a, b) => (a.role === "owner" ? 1 : 0) - (b.role === "owner" ? 1 : 0));
  for (const p of ordered) {
    await purgeUser(p.id);
  }

  // 3) Données tenant sans cascade explicite.
  await admin.from("coach_notes").delete().eq("tenant_id", tenantId);

  // 4) Profils restants puis le tenant (cascade : offers, plans, coach_config,
  //    promo_codes, gift_codes, scheduled_pushes, tenant_secrets, vip_messages,
  //    exercise_media, coach_notifications…).
  await admin.from("profiles").delete().eq("tenant_id", tenantId);
  const { error } = await admin.from("tenants").delete().eq("id", tenantId);
  if (error) return { ok: false, error: "Suppression impossible." };

  // Sécurité : s'assure que le propriétaire n'a plus de compte auth.
  try {
    await admin.auth.admin.deleteUser(ownerUserId);
  } catch {
    /* déjà supprimé */
  }

  return { ok: true };
}
