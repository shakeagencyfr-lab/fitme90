"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminOrNull } from "@/lib/admin";

export interface ConfigState {
  ok?: boolean;
  error?: string;
}

// Enregistre la configuration de génération (mode + méthodologie personnalisée).
// Réservé aux admins (double contrôle serveur).
export async function saveCoachConfig(
  _prev: ConfigState,
  formData: FormData,
): Promise<ConfigState> {
  const ctx = await getAdminOrNull();
  if (!ctx) return { error: "Accès refusé." };

  const mode = formData.get("mode") === "custom" ? "custom" : "auto";
  const custom = String(formData.get("custom_methodology") ?? "").slice(0, 8000);

  const admin = createAdminClient();
  const { error } = await admin
    .from("coach_config")
    .update({ generation_mode: mode, custom_methodology: custom, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) return { error: "Enregistrement impossible." };

  revalidatePath("/admin/config");
  return { ok: true };
}
