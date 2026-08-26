"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { DAYS } from "@/lib/questionnaire";

export interface DaysState {
  ok?: boolean;
  error?: string;
}

// Met à jour les jours d'entraînement du client (train_days), en cas de
// changement d'emploi du temps. Le rythme repos/entraînement en découle
// partout (agenda, séance, nutrition).
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

  revalidatePath("/app");
  revalidatePath("/app/agenda");
  revalidatePath("/app/seance");
  revalidatePath("/app/nutrition");
  return { ok: true };
}
