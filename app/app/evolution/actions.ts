"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export interface EvoState {
  ok?: boolean;
  error?: string;
}

export async function addWeight(_prev: EvoState, formData: FormData): Promise<EvoState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: "Le suivi est actif pendant tes 90 jours." };

  const kg = Number(String(formData.get("kg")).replace(",", "."));
  if (!kg || kg < 20 || kg > 400) return { error: "Poids invalide." };

  const supabase = await createClient();
  const { error } = await supabase.from("weights").insert({ user_id: ctx.userId, kg });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/app/evolution");
  return { ok: true };
}

export async function addMeasurement(_prev: EvoState, formData: FormData): Promise<EvoState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: "Le suivi est actif pendant tes 90 jours." };

  const num = (k: string) => {
    const v = Number(String(formData.get(k) ?? "").replace(",", "."));
    return v > 0 ? v : null;
  };
  const row = {
    user_id: ctx.userId,
    waist: num("waist"),
    hips: num("hips"),
    chest: num("chest"),
    thigh: num("thigh"),
    arm: num("arm"),
  };
  if (![row.waist, row.hips, row.chest, row.thigh, row.arm].some(Boolean)) {
    return { error: "Renseigne au moins une mesure." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("measurements").insert(row);
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/app/evolution");
  return { ok: true };
}
