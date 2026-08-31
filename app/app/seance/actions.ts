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
  cardio?: boolean; // séance cardio cochée « faite » (pas de charge / reps)
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
    return { error: "La validation des séances est possible pendant ton programme." };
  }
  const day = Math.round(payload.day);
  if (!(day >= 1 && day <= PROGRAM_DAYS)) return { error: "Jour invalide." };

  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const muscu = entries.filter((e) => e.reps && e.reps > 0);
  const cardio = entries.filter((e) => e.cardio);
  const kept = [...muscu, ...cardio]; // on garde muscu remplie ET cardio cochée
  const volume = muscu.reduce((a, e) => a + (e.kg ?? 0) * (e.reps ?? 0), 0);
  const sets = muscu.length;

  const supabase = await createClient();
  const { error } = await supabase.from("session_logs").upsert(
    {
      user_id: ctx.userId,
      day,
      sets_done: sets,
      volume,
      entries: kept,
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
