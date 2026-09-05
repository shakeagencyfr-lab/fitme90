"use server";

import { revalidatePath } from "next/cache";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { DAYS, trainDaysError } from "@/lib/questionnaire";
import { patchPlanForTrainDays, type Plan } from "@/lib/program";
import { assignOfferToClient } from "@/lib/offers";

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
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };
  const clean = days.filter((d) => DAYS.includes(d));
  const daysErr = trainDaysError(clean.length);
  if (daysErr) return { error: daysErr };

  const supabase = await createClient();
  const { error } = await supabase
    .from("questionnaires")
    .update({ train_days: clean })
    .eq("user_id", ctx.userId);
  if (error) return { error: t("srv.saveFailed") };

  // Synchronise fréquence + jours dans les réponses (utilisés par la génération
  // et le coach), puis recale le plan de façon DÉTERMINISTE (sans IA, instantané
  // et fiable) : semaine type + fréquence citée dans le résumé.
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown> }>();
  if (quiz?.answers) {
    const syncedAnswers = { ...quiz.answers, freq: String(clean.length), train_days: clean };
    await supabase.from("questionnaires").update({ answers: syncedAnswers }).eq("user_id", ctx.userId);
  }
  const { data: prog } = await supabase
    .from("programs")
    .select("id, plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; plan: Plan }>();
  if (prog?.plan) {
    const patched = patchPlanForTrainDays(prog.plan, clean);
    await supabase.from("programs").update({ plan: patched }).eq("id", prog.id);
  }

  revalidatePath("/app");
  revalidatePath("/app/agenda");
  revalidatePath("/app/seance");
  revalidatePath("/app/nutrition");
  return { ok: true };
}

export interface ChooseOfferState {
  ok?: boolean;
  error?: string;
}

/** Le client choisit le programme de son coach qu'il va payer. */
export async function chooseOffer(_prev: ChooseOfferState, formData: FormData): Promise<ChooseOfferState> {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };
  const offerId = String(formData.get("offer_id") ?? "").trim().slice(0, 40);
  if (!offerId) return { error: t("payment.pickFailed") };
  const res = await assignOfferToClient(ctx.userId, offerId);
  if (!res.ok) return { error: t("payment.pickFailed") };
  revalidatePath("/app/paiement");
  revalidatePath("/app");
  return { ok: true };
}
