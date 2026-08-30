import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import type { AccessState } from "@/lib/access";

// Abonnements (Lot ③) — BYOK Stripe, SANS webhook plateforme : chaque coach a sa
// propre clé, on ne peut pas recevoir ses webhooks. On synchronise donc l'état
// de l'abonnement en RELISANT Stripe avec la clé du coach : au retour du
// paiement, paresseusement à l'ouverture de l'app quand la période est échue,
// et par un cron quotidien. En cas de défaut de paiement, l'accès passe en
// lecture seule (IA + journal coupés, contenu déjà généré consultable).

export interface SubInfo {
  subscriptionId: string | null;
  status: string | null;
  currentPeriodEnd: string | null; // ISO
  interval: string | null; // 'month' | 'year'
  cancelAtPeriodEnd: boolean;
}

/** L'abonnement donne-t-il un accès plein ? (actif, à l'essai, ou résilié mais pas encore échu) */
export function subscriptionIsActive(
  status: string | null,
  currentPeriodEnd: string | null,
  now: Date = new Date(),
): boolean {
  if (status === "active" || status === "trialing") return true;
  if (status === "canceled" && currentPeriodEnd && new Date(currentPeriodEnd) > now) return true;
  return false;
}

/**
 * Applique l'état d'abonnement à l'accès calculé par la durée du cycle.
 * - Non abonné : inchangé.
 * - Abonnement en règle : accès plein maintenu (même au-delà du cycle : il se
 *   régénérera — Lot ④).
 * - Défaut de paiement / résilié échu : LECTURE SEULE.
 */
export function applySubscriptionAccess(
  base: AccessState,
  sub: SubInfo,
  now: Date = new Date(),
): AccessState {
  if (!sub.subscriptionId) return base;
  if (base.phase === "not_paid" || base.phase === "not_started") return base;

  if (subscriptionIsActive(sub.status, sub.currentPeriodEnd, now)) {
    const scheduled = base.phase === "scheduled";
    return {
      ...base,
      phase: scheduled ? "scheduled" : "active",
      coachEnabled: !scheduled,
      canLog: !scheduled,
      planViewable: true,
      restricted: false,
    };
  }

  return {
    ...base,
    phase: "restricted",
    coachEnabled: false,
    canLog: false,
    planViewable: true,
    restricted: true,
  };
}

function mapSubscription(sub: Stripe.Subscription): SubInfo {
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  const interval = sub.items?.data?.[0]?.price?.recurring?.interval ?? null;
  return {
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    interval,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  };
}

interface SubProfileRow {
  id: string;
  tenant_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_interval: string | null;
  subscription_cancel_at_period_end: boolean | null;
}

async function persistSub(userId: string, info: SubInfo): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      subscription_status: info.status,
      subscription_current_period_end: info.currentPeriodEnd,
      subscription_interval: info.interval,
      subscription_cancel_at_period_end: info.cancelAtPeriodEnd,
      subscription_synced_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

/**
 * Relit l'abonnement d'un client depuis Stripe (clé du coach) et met à jour son
 * profil. Retourne l'état frais, ou l'état stocké si la synchro est impossible.
 */
export async function syncSubscriptionForUser(userId: string): Promise<SubInfo> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select(
      "id, tenant_id, subscription_id, subscription_status, subscription_current_period_end, subscription_interval, subscription_cancel_at_period_end",
    )
    .eq("id", userId)
    .maybeSingle<SubProfileRow>();

  const stored: SubInfo = {
    subscriptionId: prof?.subscription_id ?? null,
    status: prof?.subscription_status ?? null,
    currentPeriodEnd: prof?.subscription_current_period_end ?? null,
    interval: prof?.subscription_interval ?? null,
    cancelAtPeriodEnd: !!prof?.subscription_cancel_at_period_end,
  };
  if (!prof?.subscription_id || !prof.tenant_id) return stored;

  const stripe = await stripeForTenant(prof.tenant_id);
  if (!stripe) return stored;
  try {
    const sub = await stripe.subscriptions.retrieve(prof.subscription_id);
    const info = mapSubscription(sub);
    await persistSub(userId, info);
    return info;
  } catch {
    return stored;
  }
}

/**
 * Faut-il resynchroniser ? Oui si la période connue est échue (un renouvellement
 * — ou un échec — a dû se produire), en évitant les appels répétés rapprochés.
 */
export function subscriptionSyncDue(
  subscriptionId: string | null,
  currentPeriodEnd: string | null,
  syncedAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!subscriptionId) return false;
  if (syncedAt && now.getTime() - new Date(syncedAt).getTime() < 10 * 60 * 1000) return false;
  if (!currentPeriodEnd) return true;
  return new Date(currentPeriodEnd) <= now;
}

/** Synchronise tous les abonnements connus (cron quotidien). Retourne des compteurs. */
export async function syncAllSubscriptions(): Promise<{ synced: number; restricted: number }> {
  const admin = createAdminClient();
  const { data: profs } = await admin
    .from("profiles")
    .select("id, tenant_id, subscription_id")
    .not("subscription_id", "is", null)
    .returns<{ id: string; tenant_id: string | null; subscription_id: string }[]>();

  // Regroupe par tenant pour réutiliser un même client Stripe.
  const byTenant = new Map<string, { id: string; subscription_id: string }[]>();
  for (const p of profs ?? []) {
    if (!p.tenant_id) continue;
    const list = byTenant.get(p.tenant_id) ?? [];
    list.push({ id: p.id, subscription_id: p.subscription_id });
    byTenant.set(p.tenant_id, list);
  }

  let synced = 0;
  let restricted = 0;
  const now = new Date();
  for (const [tenantId, clients] of byTenant) {
    const stripe = await stripeForTenant(tenantId);
    if (!stripe) continue;
    for (const c of clients) {
      try {
        const sub = await stripe.subscriptions.retrieve(c.subscription_id);
        const info = mapSubscription(sub);
        await persistSub(c.id, info);
        synced++;
        if (!subscriptionIsActive(info.status, info.currentPeriodEnd, now)) restricted++;
      } catch {
        /* on n'interrompt pas le lot pour un abonnement */
      }
    }
  }
  return { synced, restricted };
}
