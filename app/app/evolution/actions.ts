"use server";

import { revalidatePath } from "next/cache";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export interface EvoState {
  ok?: boolean;
  error?: string;
}

export async function addWeight(_prev: EvoState, formData: FormData): Promise<EvoState> {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: t("srv.trackingDuringProgram") };

  const kg = Number(String(formData.get("kg")).replace(",", "."));
  if (!kg || kg < 20 || kg > 400) return { error: t("srv.invalidWeight") };

  const supabase = await createClient();
  // Une seule pesée par jour : si une existe déjà aujourd'hui, on la remplace.
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("weights")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("measured_at", today)
    .maybeSingle<{ id: string }>();
  const { error } = existing
    ? await supabase.from("weights").update({ kg }).eq("id", existing.id)
    : await supabase.from("weights").insert({ user_id: ctx.userId, kg });
  if (error) return { error: t("srv.saveFailed") };
  revalidatePath("/app/evolution");
  return { ok: true };
}

export async function addMeasurement(_prev: EvoState, formData: FormData): Promise<EvoState> {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: t("srv.trackingDuringProgram") };

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
    return { error: t("srv.oneMeasure") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("measurements").insert(row);
  if (error) return { error: t("srv.saveFailed") };
  revalidatePath("/app/evolution");
  return { ok: true };
}
