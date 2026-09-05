import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { computeAccess, type AccessState } from "@/lib/access";
import {
  applySubscriptionAccess,
  subscriptionSyncDue,
  syncSubscriptionForUser,
  type SubInfo,
} from "@/lib/subscription";
import { PROGRAM_DAYS, programDaysForMonths } from "@/lib/config";

export interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  paid: boolean;
  start_date: string | null;
  photo_consent_at: string | null;
  /** Décharge médicale signée (consentement éclairé). null tant que non signée. */
  medical_ack_at: string | null;
  /** Tenant (coach/salle) auquel appartient l'utilisateur. Multi-tenant (Lot 0). */
  tenant_id: string | null;
  /** Rôle applicatif : "client" par défaut, "owner"/"coach" pour le dashboard. */
  role: string | null;
  /** Abonnement Stripe (Lot 3) — null si achat à paiement unique. */
  subscription_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_interval: string | null;
  subscription_cancel_at_period_end: boolean | null;
  subscription_synced_at: string | null;
  subscription_cancel_at: string | null;
  subscription_installments: number | null;
  subscription_paid_in_full: boolean | null;
}

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: ProfileRow | null;
  access: AccessState;
}

/**
 * Récupère l'utilisateur connecté, son profil et son état d'accès calculé.
 * Retourne null si aucune session valide. À appeler en tête de chaque
 * route API et page serveur protégée.
 *
 * `cache()` (React) dédoublonne les appels d'un même rendu serveur : le layout
 * et la page partagent le résultat, on divise par deux les allers-retours auth.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, name, paid, start_date, photo_consent_at, medical_ack_at, tenant_id, role, subscription_id, subscription_status, subscription_current_period_end, subscription_interval, subscription_cancel_at_period_end, subscription_synced_at, subscription_cancel_at, subscription_installments, subscription_paid_in_full",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  // Durée du programme = celle de l'offre achetée (portée par le programme).
  // Défaut : 90 jours (My Fitness App historique, programmes sans durée).
  const { data: prog } = await supabase
    .from("programs")
    .select("duration_months")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ duration_months: number | null }>();
  const programDays = prog?.duration_months
    ? programDaysForMonths(prog.duration_months)
    : PROGRAM_DAYS;

  const now = new Date();
  let access = computeAccess(profile?.paid ?? false, profile?.start_date ?? null, now, programDays);

  // Abonnés : on applique l'état de l'abonnement (accès plein si en règle,
  // lecture seule en cas de défaut de paiement). On resynchronise auprès de
  // Stripe seulement quand la période connue est échue (au plus une fois par
  // fenêtre de 10 min), pour ne pas ralentir chaque page.
  if (profile?.subscription_id) {
    let sub: SubInfo = {
      subscriptionId: profile.subscription_id,
      status: profile.subscription_status,
      currentPeriodEnd: profile.subscription_current_period_end,
      interval: profile.subscription_interval,
      cancelAtPeriodEnd: !!profile.subscription_cancel_at_period_end,
      cancelAt: profile.subscription_cancel_at,
      installments: profile.subscription_installments,
      paidInFull: !!profile.subscription_paid_in_full,
    };
    if (
      subscriptionSyncDue(
        profile.subscription_id,
        profile.subscription_current_period_end,
        profile.subscription_synced_at,
        now,
      )
    ) {
      sub = await syncSubscriptionForUser(user.id);
    }
    access = applySubscriptionAccess(access, sub, now);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile ?? null,
    access,
  };
});
