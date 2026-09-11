"use server";

import { redirect } from "next/navigation";
import { getT, resolveLocale, userLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";
import { recordConsents, withdrawConsent } from "@/lib/consents";
import { WITHDRAWABLE, type ConsentKind } from "@/lib/gdpr";

export interface ProfilState {
  error?: string;
  ok?: boolean;
}

import { revalidatePath } from "next/cache";

// Met à jour les mesures du profil (âge, taille, FC repos) et, si fourni, le
// poids (nouvelle pesée). Alimente IMC et zones cardiaques.
export async function updateMeasures(
  _prev: ProfilState,
  formData: FormData,
): Promise<ProfilState> {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };

  const numOrNull = (k: string) => {
    const v = Number(String(formData.get(k) ?? "").replace(",", "."));
    return v > 0 ? v : null;
  };
  const age = numOrNull("age");
  const height = numOrNull("height");
  const rest = numOrNull("rest");
  const weight = numOrNull("weight");

  const supabase = await createClient();
  const update: Record<string, number> = {};
  if (age) update.age = Math.round(age);
  if (height) update.height_cm = height;
  if (rest) update.rest_hr = Math.round(rest);
  if (Object.keys(update).length) {
    const { error } = await supabase.from("profiles").update(update).eq("id", ctx.userId);
    if (error) return { error: t("srv.saveFailed") };
  }
  if (weight) {
    await supabase.from("weights").insert({ user_id: ctx.userId, kg: weight });
  }
  revalidatePath("/app/profil");
  return { ok: true };
}

// Change la date de début du programme (profiles.start_date). Cette colonne
// n'est pas modifiable par le client (grant restreint) : on passe par le service
// role après contrôle de session. Recale agenda, séances et nutrition.
export async function updateStartDate(
  _prev: ProfilState,
  formData: FormData,
): Promise<ProfilState> {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Non authentifié." };

  const raw = String(formData.get("start_date") ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { error: t("srv.invalidDate") };
  const picked = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(picked.getTime())) return { error: t("srv.invalidDate") };

  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((picked.getTime() - todayUTC) / 86_400_000);
  if (diffDays < -30 || diffDays > 60) {
    return { error: t("srv.dateRange") };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ start_date: raw }).eq("id", ctx.userId);
  if (error) return { error: t("srv.saveFailed") };

  revalidatePath("/app");
  revalidatePath("/app/agenda");
  revalidatePath("/app/seance");
  revalidatePath("/app/nutrition");
  revalidatePath("/app/profil");
  return { ok: true };
}

// Changement de mot de passe depuis l'espace client (session active).
export async function changePassword(
  _prev: ProfilState,
  formData: FormData,
): Promise<ProfilState> {
  const { t } = await getT();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: t("authErr.passwordMin") };
  if (password !== formData.get("confirm")) return { error: t("authErr.mismatch") };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: t("authErr.updateFailed") };
  return { ok: true };
}

// Suppression RÉELLE du compte (RGPD) : fichiers du bucket + toutes les
// lignes (cascade via la suppression de l'utilisateur auth). Irréversible.
export async function deleteAccount(): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion");

  const admin = createAdminClient();

  // 1. Fichiers du bucket privé sous {user_id}/
  const { data: files } = await admin.storage.from("body-photos").list(ctx.userId);
  if (files && files.length) {
    await admin.storage
      .from("body-photos")
      .remove(files.map((f) => `${ctx.userId}/${f.name}`));
  }

  // 2. Suppression de l'utilisateur auth → cascade sur toutes les tables
  //    (chaque table référence auth.users on delete cascade).
  await admin.auth.admin.deleteUser(ctx.userId);

  // 3. Fin de session côté navigateur
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?compte=supprime");
}

// ------------------------------------------------------------------ abonnement
export interface CancelSubState {
  ok?: boolean;
  error?: string;
  endsAt?: string | null;
}

/**
 * Résilie l'abonnement du client : programmé pour s'arrêter à la fin de la
 * période en cours (fin du mois ou de l'année selon la formule). L'accès reste
 * plein jusqu'à l'échéance, puis passe en lecture seule. Paiement chez le coach
 * (BYOK) : on agit avec SA clé Stripe.
 */
export async function cancelSubscription(): Promise<CancelSubState> {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return { error: "Session expirée." };
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("subscription_id, tenant_id")
    .eq("id", ctx.userId)
    .maybeSingle<{ subscription_id: string | null; tenant_id: string | null }>();
  if (!prof?.subscription_id || !prof.tenant_id) {
    return { error: t("srv.noSub") };
  }

  const { stripeForTenant } = await import("@/lib/coach-payments");
  const stripe = await stripeForTenant(prof.tenant_id);
  if (!stripe) return { error: t("payment.unavailable") };

  try {
    const sub = await stripe.subscriptions.update(prof.subscription_id, {
      cancel_at_period_end: true,
    });
    const end = (sub as unknown as { current_period_end?: number }).current_period_end;
    const endsAt = end ? new Date(end * 1000).toISOString() : null;
    await admin
      .from("profiles")
      .update({
        subscription_status: sub.status,
        subscription_cancel_at_period_end: true,
        subscription_current_period_end: endsAt,
        subscription_synced_at: new Date().toISOString(),
      })
      .eq("id", ctx.userId);
    revalidatePath("/app/profil");
    return { ok: true, endsAt };
  } catch {
    return { error: t("sub.failed") };
  }
}

// ------------------------------------------------------------------ carte
/** Le client change la carte de ses mensualités (session Stripe en mode setup, chez le coach). */
export async function startCardUpdate(): Promise<{ url?: string; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Session expirée." };
  const { startCardUpdate: start } = await import("@/lib/card-update");
  return start(ctx.userId);
}

// ───────────────────────── Consentements (articles 7.3 et 13) ─────────────────────────

/**
 * Retirer un accord, ou le redonner.
 *
 * L'article 7.3 exige qu'il soit AUSSI SIMPLE de retirer son consentement que
 * de le donner. Une case cochée en trois secondes au questionnaire ne peut pas
 * demander un e-mail au support pour être défaite : d'où ce bouton, au même
 * endroit que le reste des données.
 *
 * Ce qui n'est pas retirable ici l'est volontairement : les CGV et l'accord de
 * sous-traitance sont des contrats, pas des consentements ; on en sort en
 * résiliant. La liste fait foi, et l'action la revérifie plutôt que de croire
 * le formulaire.
 */
export async function changeConsent(formData: FormData): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion");
  const kind = String(formData.get("kind") ?? "") as ConsentKind;
  if (!WITHDRAWABLE.includes(kind)) redirect("/app/profil/mes-donnees");
  if (String(formData.get("op") ?? "") === "grant") {
    await recordConsents(ctx.userId, [kind]);
  } else {
    await withdrawConsent(ctx.userId, kind);
  }
  revalidatePath("/app/profil/mes-donnees");
  redirect("/app/profil/mes-donnees");
}
