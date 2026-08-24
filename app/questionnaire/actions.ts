"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { screen, type QuizHealthAnswers } from "@/lib/screening";
import { QUIZ } from "@/lib/questionnaire";

export interface SaveResult {
  ok?: boolean;
  hold?: boolean;
  reasons?: string[];
  error?: string;
}

export async function saveQuestionnaire(payload: {
  answers: Record<string, unknown>;
  trainDays: string[];
}): Promise<SaveResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (ctx.access.phase === "not_paid") {
    return { error: "Le paiement est requis avant de générer un programme." };
  }

  const answers = payload.answers ?? {};
  const supabase = await createClient();

  // Colonnes de profil alimentées par les champs `bind` (droits par colonne).
  const profileUpdate: Record<string, unknown> = {};
  for (const section of QUIZ) {
    for (const f of section.fields) {
      if (!f.bind) continue;
      const v = answers[f.key];
      if (v == null || v === "") continue;
      if (f.bind === "age" || f.bind === "height_cm" || f.bind === "rest_hr") {
        const n = Number(String(v).replace(",", "."));
        if (n > 0) profileUpdate[f.bind] = n;
      } else {
        profileUpdate[f.bind] = v;
      }
    }
  }
  if (Object.keys(profileUpdate).length) {
    await supabase.from("profiles").update(profileUpdate).eq("id", ctx.userId);
  }

  const { error } = await supabase.from("questionnaires").insert({
    user_id: ctx.userId,
    answers,
    train_days: payload.trainDays ?? [],
  });
  if (error) return { error: "Enregistrement du questionnaire impossible." };

  // GARDE-FOU MÉDICAL
  const verdict = screen(answers as QuizHealthAnswers);
  if (verdict.hold) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ medical_hold: true }).eq("id", ctx.userId);
    return { hold: true, reasons: verdict.reasons };
  }

  return { ok: true };
}
