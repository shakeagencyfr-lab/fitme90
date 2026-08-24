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
