import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, type SessionContext } from "@/lib/guard";
import type { Plan } from "@/lib/program";

export interface EspaceData {
  ctx: SessionContext;
  plan: Plan;
  answers: Record<string, unknown>;
  trainDays: string[];
}

/**
 * Charge le contexte des onglets de l'espace client qui dépendent d'un plan
 * consultable. Redirige vers /app (qui affiche le bon état vide) si le plan
 * n'est pas consultable (non payé, non démarré, terminé) ou absent.
 */
export async function loadEspaceOrRedirect(): Promise<EspaceData> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app");
  if (!ctx.access.planViewable) redirect("/app");

  const supabase = await createClient();
  const [{ data: prog }, { data: quiz }] = await Promise.all([
    supabase
      .from("programs")
      .select("plan")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ plan: Plan }>(),
    supabase
      .from("questionnaires")
      .select("answers, train_days")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ answers: Record<string, unknown>; train_days: string[] }>(),
  ]);

  if (!prog?.plan) redirect("/app");

  return {
    ctx,
    plan: prog.plan,
    answers: quiz?.answers ?? {},
    trainDays: quiz?.train_days ?? [],
  };
}

/**
 * Ce compte a-t-il déjà un programme écrit ?
 *
 * C'est la SEULE bonne raison de refuser l'entonnoir d'inscription
 * (questionnaire, salle, génération). Ces trois pages renvoyaient vers /app dès
 * que l'accès était « actif », ce qui confondait deux choses très
 * différentes : « il a déjà son programme, inutile de recommencer » et « son
 * compte est ouvert ». Un client créé à la main par son coach est actif SANS
 * programme : le tableau de bord lui proposait de remplir le questionnaire, et
 * le questionnaire le renvoyait aussitôt au tableau de bord. Rien ne se
 * passait, et il n'existait aucun chemin pour sortir de là.
 */
export async function hasProgram(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("programs")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle<{ id: string }>();
  return !!data;
}
