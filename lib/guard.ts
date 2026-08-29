import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { computeAccess, type AccessState } from "@/lib/access";
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
    .select("id, email, name, paid, start_date, photo_consent_at, medical_ack_at, tenant_id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  // Durée du programme = celle de l'offre achetée (portée par le programme).
  // Défaut : 90 jours (FitMe90 historique, programmes sans durée).
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

  const access = computeAccess(
    profile?.paid ?? false,
    profile?.start_date ?? null,
    new Date(),
    programDays,
  );

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile ?? null,
    access,
  };
});
