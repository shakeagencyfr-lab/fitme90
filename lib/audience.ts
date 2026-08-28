import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAccess } from "@/lib/access";

// Segmentation des clients pour les notifications push ciblées (CRM coach).
// Filtres : sexe (profil), objectif principal (questionnaire), phase d'accès.

export interface AudienceFilter {
  /** "Femme" | "Homme" | "Autre" | "" (tous). */
  sex?: string;
  /** Objectif principal (answers.goal) | "" (tous). */
  goal?: string;
  /** "all" (tous) | "active" (programme en cours) | "paid" (ont payé). */
  phase?: "all" | "active" | "paid";
}

export interface AudienceResult {
  userIds: string[];
  /** Nombre de clients correspondant au filtre. */
  total: number;
  /** Combien parmi eux ont au moins un abonnement push (recevront vraiment). */
  withPush: number;
}

/** Options d'objectif proposées au coach (miroir du questionnaire). */
export const GOAL_OPTIONS = [
  "Perte de masse grasse",
  "Prise de muscle",
  "Recomposition",
  "Performance",
  "Santé générale",
] as const;

export const SEX_OPTIONS = ["Femme", "Homme", "Autre"] as const;

/** Résout la liste des clients (et abonnés push) correspondant au filtre. */
export async function resolveAudience(f: AudienceFilter): Promise<AudienceResult> {
  const db = createAdminClient();
  const [{ data: profiles }, { data: quizzes }, { data: subs }] = await Promise.all([
    db.from("profiles").select("id, sex, paid, start_date").returns<
      { id: string; sex: string | null; paid: boolean; start_date: string | null }[]
    >(),
    db
      .from("questionnaires")
      .select("user_id, answers, created_at")
      .order("created_at", { ascending: false })
      .returns<{ user_id: string; answers: Record<string, unknown> }[]>(),
    db.from("push_subscriptions").select("user_id").returns<{ user_id: string | null }[]>(),
  ]);

  // Objectif principal le plus récent par utilisateur.
  const goalByUser = new Map<string, string>();
  for (const q of quizzes ?? []) {
    if (!goalByUser.has(q.user_id)) {
      const g = q.answers?.goal;
      if (typeof g === "string") goalByUser.set(q.user_id, g);
    }
  }
  const pushUsers = new Set((subs ?? []).map((s) => s.user_id).filter(Boolean) as string[]);

  const ids: string[] = [];
  for (const p of profiles ?? []) {
    if (f.sex && (p.sex ?? "") !== f.sex) continue;
    if (f.goal && (goalByUser.get(p.id) ?? "") !== f.goal) continue;
    const access = computeAccess(p.paid, p.start_date);
    if (f.phase === "active" && access.phase !== "active") continue;
    if (f.phase === "paid" && !p.paid) continue;
    ids.push(p.id);
  }
  const withPush = ids.filter((id) => pushUsers.has(id)).length;
  return { userIds: ids, total: ids.length, withPush };
}
