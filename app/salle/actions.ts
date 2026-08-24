"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export interface EquipItem {
  name: string;
  confidence?: string;
  source: "photo" | "manuel";
}

// Enregistre la liste de matériel validée par l'utilisateur (remplace la
// précédente). Ce matériel filtre ensuite les exercices du programme.
export async function saveEquipment(items: EquipItem[]): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };

  const supabase = await createClient();
  await supabase.from("equipment").delete().eq("user_id", ctx.userId);

  const rows = items
    .filter((i) => i.name.trim())
    .map((i) => ({
      user_id: ctx.userId,
      name: i.name.trim(),
      confidence: i.confidence ?? null,
      enabled: true,
      source: i.source,
    }));

  if (rows.length) {
    const { error } = await supabase.from("equipment").insert(rows);
    if (error) return { error: "Enregistrement du matériel impossible." };
  }
  return { ok: true };
}
