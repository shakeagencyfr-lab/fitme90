"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { PROGRAM_DAYS } from "@/lib/config";

export interface SaveSessionResult {
  ok?: boolean;
  error?: string;
}

export interface SetEntry {
  exercise: string;
  set: number;
  kg: number | null;
  reps: number | null;
}

// Enregistre (ou re-enregistre) la séance d'un jour donné : détail série par
// série, volume total et nombre de séries. Autorisé pour N'IMPORTE QUEL jour
// tant que le programme est actif (le client peut refaire une séance passée).
export async function saveSession(payload: {
  day: number;
  entries: SetEntry[];
}): Promise<SaveSessionResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) {
    return { error: "La validation des séances est possible pendant tes 90 jours." };
  }
  const day = Math.round(payload.day);
  if (!(day >= 1 && day <= PROGRAM_DAYS)) return { error: "Jour invalide." };

  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const filled = entries.filter((e) => e.reps && e.reps > 0);
  const volume = filled.reduce((a, e) => a + (e.kg ?? 0) * (e.reps ?? 0), 0);
  const sets = filled.length;

  const supabase = await createClient();
  const { error } = await supabase.from("session_logs").upsert(
    {
      user_id: ctx.userId,
      day,
      sets_done: sets,
      volume,
      entries: filled,
      validated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day" },
  );
  if (error) return { error: "Impossible d'enregistrer la séance." };

  revalidatePath("/app/seance");
  revalidatePath("/app/agenda");
  revalidatePath("/app");
  return { ok: true };
}
