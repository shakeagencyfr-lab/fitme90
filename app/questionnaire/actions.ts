"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, localeFromLabel } from "@/lib/i18n";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { screen, type QuizHealthAnswers } from "@/lib/screening";
import { QUIZ, DAYS, trainDaysError } from "@/lib/questionnaire";
import { recordConsents } from "@/lib/consents";
import { MIN_AGE } from "@/lib/gdpr";

export interface SaveResult {
  ok?: boolean;
  /** Situation de santé déclarée : décharge à signer (n'empêche PAS l'accès). */
  flagged?: boolean;
  reasons?: string[];
  error?: string;
}

/**
 * L'âge déclaré, ou null si le questionnaire ne l'a pas encore.
 *
 * Le champ est libre : « 34 ans », « 34,0 » et « trente-quatre » arrivent tous
 * ici. On ne retient qu'un nombre plausible, et on ne bloque jamais sur une
 * saisie qu'on n'a pas su lire.
 */
function ageDeclare(answers: Record<string, unknown>): number | null {
  const brut = String(answers.age ?? "").replace(",", ".");
  const n = Number.parseFloat(brut);
  return Number.isFinite(n) && n > 0 && n < 120 ? n : null;
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
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };
  const name = (payload.name ?? "").trim();
  if (name.length < 2) return { error: t("srv.signName") };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      medical_ack_at: new Date().toISOString(),
      medical_ack_name: name.slice(0, 120),
      medical_ack_reasons: (payload.reasons ?? []).slice(0, 12),
    })
    .eq("id", ctx.userId);
  if (error) return { error: t("srv.signFailed") };
  return { ok: true };
}

export async function saveQuestionnaire(payload: {
  answers: Record<string, unknown>;
  trainDays: string[];
}): Promise<SaveResult> {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };
  // Le paiement a lieu APRÈS le questionnaire : on n'exige pas d'avoir payé pour
  // enregistrer ses réponses.

  const answers = payload.answers ?? {};
  // Fréquence 2 à 5 : chaque valeur a son gabarit, rien n'existe en dehors.
  const trainDays = (payload.trainDays ?? []).filter((d) => DAYS.includes(d));
  const daysErr = trainDaysError(trainDays.length);
  if (daysErr) return { error: daysErr };

  // ÂGE MINIMUM (article 8 du RGPD, 15 ans en France). En dessous, le
  // consentement doit venir du titulaire de l'autorité parentale : on ne sait
  // pas le recueillir, donc on ne traite pas. Refus avant toute écriture, pour
  // ne pas garder en base les réponses d'un mineur qu'on vient d'écarter.
  const age = ageDeclare(answers);
  if (age !== null && age < MIN_AGE) {
    return {
      error: `Il faut avoir ${MIN_AGE} ans pour ouvrir un espace seul. En dessous, l'accord d'un parent est nécessaire : demande à ton coach de t'inscrire lui-même.`,
    };
  }

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
  // Langue choisie pour le programme : profil (l'IA et le cron la lisent) + cookie.
  const lang = localeFromLabel(answers.program_lang);
  if (lang) {
    profileUpdate.language = lang;
    try {
      (await cookies()).set(LOCALE_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    } catch {
      /* hors contexte cookie : le profil suffit */
    }
  }
  if (Object.keys(profileUpdate).length) {
    await supabase.from("profiles").update(profileUpdate).eq("id", ctx.userId);
  }

  const { error } = await supabase.from("questionnaires").insert({
    user_id: ctx.userId,
    // La fréquence déclarée suit toujours les jours réellement cochés.
    answers: { ...answers, freq: String(trainDays.length), train_days: trainDays },
    train_days: trainDays,
  });
  if (error) return { error: t("srv.saveFailed") };

  // CONSENTEMENT EXPLICITE AUX DONNÉES DE SANTÉ (article 9.2.a). Le
  // questionnaire recueille pathologies, allergies, poids et taille : c'est
  // ici, au moment où elles entrent en base, que l'accord prend effet. Le
  // texte qui l'accompagne est affiché juste au-dessus du bouton d'envoi.
  await recordConsents(ctx.userId, ["sante"]);

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
