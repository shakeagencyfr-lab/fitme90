"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { screen, type QuizHealthAnswers } from "@/lib/screening";
import { QUIZ } from "@/lib/questionnaire";

export interface SaveResult {
  ok?: boolean;
  /** Situation de santé déclarée : décharge à signer (n'empêche PAS l'accès). */
  flagged?: boolean;
  reasons?: string[];
  error?: string;
}

export interface WaiverResult {
  ok?: boolean;
  error?: string;
}

/**
 * Signature de la décharge médicale (consentement éclairé). On mémorise
 * l'horodatage, le nom saisi et les motifs présentés. Ne bloque jamais l'accès :
 * c'est une trace de consentement, pas un refus.
 */
export async function signMedicalWaiver(payload: {
  name: string;
  reasons?: string[];
}): Promise<WaiverResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  const name = (payload.name ?? "").trim();
  if (name.length < 2) return { error: "Indique ton nom pour signer." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      medical_ack_at: new Date().toISOString(),
      medical_ack_name: name.slice(0, 120),
      medical_ack_reasons: (payload.reasons ?? []).slice(0, 12),
    })
    .eq("id", ctx.userId);
  if (error) return { error: "Signature impossible, réessaie." };
  return { ok: true };
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

  // GARDE-FOU MÉDICAL, version consentement éclairé : une situation de santé
  // déclarée n'empêche PLUS l'accès. On la signale (medical_hold reste vrai
  // pour la visibilité côté admin) et on demande la signature d'une décharge.
  const verdict = screen(answers as QuizHealthAnswers);
  if (verdict.hold) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ medical_hold: true }).eq("id", ctx.userId);
    return { flagged: true, reasons: verdict.reasons };
  }

  return { ok: true };
}
