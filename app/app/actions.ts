"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { DAYS } from "@/lib/questionnaire";
import { generateProgram } from "@/lib/program";
import { recordCall } from "@/lib/ratelimit";

export interface DaysState {
  ok?: boolean;
  error?: string;
}

// Met à jour les jours d'entraînement du client (train_days) ET régénère le
// programme complet, pour que la présentation, la répartition des séances et le
// cardio reflètent les nouveaux jours (l'agenda, la séance et la nutrition en
// découlent déjà). Sans régénération, le texte de présentation restait figé sur
// les jours d'origine.
export async function updateTrainDays(days: string[]): Promise<DaysState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  const clean = days.filter((d) => DAYS.includes(d));
  if (clean.length === 0) return { error: "Choisis au moins un jour." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("questionnaires")
    .update({ train_days: clean })
    .eq("user_id", ctx.userId);
  if (error) return { error: "Enregistrement impossible." };

  // Réécrit le plan sur les nouveaux jours (best-effort : si ça échoue, les
  // jours restent enregistrés et tout le reste s'est déjà recalé).
  try {
    const { data: quiz } = await supabase
      .from("questionnaires")
      .select("answers")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ answers: Record<string, unknown> }>();
    if (quiz?.answers) {
      // Synchronise fréquence + jours dans les réponses, sinon le brief de
      // régénération garde l'ancienne fréquence (« 3 séances ») dans le texte.
      const syncedAnswers = { ...quiz.answers, freq: String(clean.length), train_days: clean };
      await supabase
        .from("questionnaires")
        .update({ answers: syncedAnswers })
        .eq("user_id", ctx.userId);
      const { data: equipRows } = await supabase
        .from("equipment")
        .select("name")
        .eq("user_id", ctx.userId)
        .eq("enabled", true);
      const equipment = (equipRows ?? []).map((e) => e.name as string);
      const result = await generateProgram(
        { answers: syncedAnswers, trainDays: clean, equipment },
        "low", // doit tenir sous ~60 s (Vercel Hobby), sinon la régénération échoue
        // et la présentation reste figée sur les anciens jours.
      );
      await supabase.from("programs").insert({
        user_id: ctx.userId,
        plan: result.plan,
        model: result.model,
      });
      await recordCall(ctx.userId, "coach", result.usage);
    }
  } catch {
    // Le plan écrit n'a pas pu être régénéré ; les jours sont tout de même à jour.
  }

  revalidatePath("/app");
  revalidatePath("/app/agenda");
  revalidatePath("/app/seance");
  revalidatePath("/app/nutrition");
  return { ok: true };
}
