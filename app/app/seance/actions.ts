"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export interface ValidateState {
  ok?: boolean;
  error?: string;
}

// Valide la séance du jour : enregistre le volume et le nombre de séries,
// puis marque le jour comme fait. Écriture soumise au RLS (ses lignes).
export async function validateSession(
  _prev: ValidateState,
  formData: FormData,
): Promise<ValidateState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) {
    return { error: "La validation des séances est possible pendant tes 90 jours." };
  }

  const day = ctx.access.day;
  const sets = Number(formData.get("sets") || 0) || null;
  const volume = Number(formData.get("volume") || 0) || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_logs")
    .upsert(
      { user_id: ctx.userId, day, sets_done: sets, volume },
      { onConflict: "user_id,day" },
    );
  if (error) return { error: "Impossible d'enregistrer la séance." };

  revalidatePath("/app/seance");
  revalidatePath("/app/agenda");
  return { ok: true };
}
