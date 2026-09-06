"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

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
  circuit?: boolean; // bloc de circuit terminé : `exercise` = titre du bloc, `set` = tours faits
  sensation?: number; // 1 (facile) à 4 (à fond), notée à la fin du bloc
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
  if (!(day >= 1 && day <= ctx.access.programDays)) return { error: "Jour invalide." };

  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const muscu = entries.filter((e) => !e.circuit && e.reps && e.reps > 0);
  const cardio = entries.filter((e) => e.cardio && !e.circuit);
  // Un bloc de circuit terminé : ses tours comptent comme des séries, la
  // sensation (1 à 4) remplace la charge. Bornée ici : c'est le client qui
  // l'envoie.
  const circuit = entries
    .filter((e) => e.circuit && typeof e.exercise === "string" && e.exercise)
    .map((e) => ({
      exercise: String(e.exercise).slice(0, 80),
      set: Math.max(1, Math.min(8, Math.round(Number(e.set) || 1))),
      kg: null,
      reps: null,
      circuit: true as const,
      ...(e.sensation ? { sensation: Math.max(1, Math.min(4, Math.round(Number(e.sensation)))) } : {}),
    }));
  const kept = [...muscu, ...cardio, ...circuit]; // on garde muscu remplie, cardio cochée, blocs terminés
  const volume = muscu.reduce((a, e) => a + (e.kg ?? 0) * (e.reps ?? 0), 0);
  const sets = muscu.length + circuit.reduce((a, e) => a + e.set, 0);

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
