"use server";

import { safeLocalPath } from "@/lib/safe-url";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import type { TFn } from "@/lib/i18n";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { capacityForSlug, accountCapacityForResellerSlug } from "@/lib/entitlements";
import { provisionCoachIfPending, provisionResellerIfPending } from "@/lib/coach-onboarding";
import { applyPendingCoachSelection } from "@/lib/tenant";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// Lit le résultat d'un signUp Supabase et le traduit en message actionnable.
// Cas piège : e-mail déjà inscrit -> Supabase renvoie un « faux succès » sans
// envoyer d'e-mail (identities vide). Sans ce test, l'utilisateur attend un
// e-mail de confirmation qui n'arrivera jamais.
function signUpOutcome(res: {
  data: { user: { identities?: unknown[] | null } | null };
  error: { status?: number; code?: string } | null;
}, t: TFn): AuthState | null {
  if (res.error) {
    if (res.error.status === 429 || res.error.code === "over_email_send_rate_limit") {
      return { error: t("authErr.rateLimited") };
    }
    return { error: t("authErr.signupFailed") };
  }
  if (res.data.user && (res.data.user.identities?.length ?? 0) === 0) {
    return { error: t("authErr.exists") };
  }
  return null;
}

export interface AuthState {
  error?: string;
  notice?: string;
}

const credentials = (t: TFn) =>
  z.object({
    email: z.string().email(t("authErr.invalidEmail")),
    password: z.string().min(8, t("authErr.passwordMin")),
  });

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getT();
  const parsed = credentials(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: t("authErr.badCredentials") };
  }

  // Espaces distincts : un compte coach/salle va au dashboard admin, un client
  // à son espace. On lit le rôle avec le même client (session déjà établie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Filet de sécurité : provisionne le coach / revendeur au login si la
  // confirmation d'e-mail n'a pas déclenché le rattachement (selon le flux du
  // lien Supabase, notre route /auth/confirm peut ne pas recevoir le jeton).
  // Idempotent : ne refait rien si le tenant est déjà posé.
  if (user) {
    try {
      await provisionResellerIfPending(user.id, user.user_metadata);
      await provisionCoachIfPending(user.id, user.user_metadata);
      await applyPendingCoachSelection(user.id, user.user_metadata);
    } catch {
      /* non bloquant */
    }
  }

  let coach = isAdminEmail(user?.email);
  if (!coach && user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null }>();
    coach = prof?.role === "owner";
  }
  if (coach) redirect("/admin");

  // Où atterrir ensuite : un chemin du site, jamais une adresse d'ailleurs
  // (« //evil.com » commence aussi par « / »).
  redirect(safeLocalPath(formData.get("suite"), "/app"));
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getT();
  const parsed = credentials(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (formData.get("password") !== formData.get("confirm")) {
    return { error: t("authErr.mismatch") };
  }
  if (formData.get("cgv") !== "on") {
    return { error: t("authErr.terms") };
  }

  // Achat via la landing d'un coach : on transporte le coach + l'offre dans les
  // métadonnées du compte (elles survivent à la confirmation d'e-mail, même sur
  // un autre appareil). Elles seront appliquées au profil à la confirmation.
  const coachSlug = String(formData.get("coach_slug") ?? "").trim().slice(0, 80);

  // Capacité du coach : le palier de son offre plafonne le nombre de clients
  // actifs. Au-delà, on refuse l'inscription AVANT de créer le compte (pas de
  // compte fantôme). Message neutre côté prospect ; le coach voit sa jauge et
  // l'invitation à monter d'offre sur son dashboard.
  if (coachSlug) {
    const cap = await capacityForSlug(coachSlug);
    if (cap?.full) {
      return {
        error:
          "Cet espace n'accepte pas de nouveaux membres pour le moment. Rapproche-toi de ton coach.",
      };
    }
  }

  const offerId = String(formData.get("offer_id") ?? "").trim().slice(0, 40);
  const interval = String(formData.get("interval") ?? "").trim();
  // Code de parrainage (affiliation) éventuel, transporté jusqu'à la confirmation.
  const ref = String(formData.get("ref") ?? "").trim().toUpperCase().slice(0, 16);
  const data: Record<string, string> = {};
  if (coachSlug) data.coach_slug = coachSlug;
  if (offerId) data.offer_id = offerId;
  if (interval === "month" || interval === "year" || interval === "once") data.interval = interval;
  if (/^[A-Z0-9]{4,16}$/.test(ref)) data.ref = ref;

  const supabase = await createClient();
  const res = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/questionnaire`,
      data,
    },
  });
  const bad = signUpOutcome(res, t);
  if (bad) return bad;

  redirect("/verifie-tes-mails");
}

// Inscription d'un COACH (page de vente B2B). Crée le compte avec des
// métadonnées coach ; son tenant est provisionné à la confirmation d'e-mail
// (voir provisionCoachIfPending), puis il arrive sur son dashboard /admin.
export async function signUpCoachAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getT();
  const parsed = credentials(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (formData.get("password") !== formData.get("confirm")) {
    return { error: t("authErr.mismatch") };
  }
  if (formData.get("cgv") !== "on") {
    return { error: t("authErr.terms") };
  }
  const tenantName = String(formData.get("tenant_name") ?? "").trim().slice(0, 60);
  const coachName = String(formData.get("coach_name") ?? "").trim().slice(0, 40);
  if (!tenantName) return { error: t("authErr.brandName") };
  // Rattachement éventuel à un revendeur (lien /inscription-coach?r=<slug>).
  const resellerSlug = String(formData.get("reseller_slug") ?? "").trim().slice(0, 80);

  // Capacité du revendeur : son palier plafonne le nombre de comptes sous sa
  // marque, comme celui d'un coach plafonne ses clients. On refuse AVANT de
  // créer le compte, pour ne pas laisser un utilisateur sans espace après
  // confirmation de son e-mail. Message neutre : le candidat n'a pas à savoir
  // où en est le contrat de son revendeur.
  if (resellerSlug) {
    const cap = await accountCapacityForResellerSlug(resellerSlug);
    if (cap?.full) {
      return {
        error:
          "Ce réseau n'ouvre pas de nouveau compte pour le moment. Rapproche-toi de ton contact.",
      };
    }
  }

  const data: Record<string, string> = { coach_signup: "1", tenant_name: tenantName, coach_name: coachName };
  if (resellerSlug) data.reseller_slug = resellerSlug;

  const supabase = await createClient();
  const res = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/admin`,
      data,
    },
  });
  const bad = signUpOutcome(res, t);
  if (bad) return bad;

  redirect("/verifie-tes-mails");
}

// Inscription d'un REVENDEUR / distributeur : crée le compte avec des
// métadonnées revendeur ; son tenant (kind='reseller', rattaché à la plateforme)
// est provisionné à la confirmation d'e-mail (voir provisionResellerIfPending).
export async function signUpResellerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getT();
  const parsed = credentials(t).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (formData.get("password") !== formData.get("confirm")) {
    return { error: t("authErr.mismatch") };
  }
  if (formData.get("cgv") !== "on") {
    return { error: t("authErr.terms") };
  }
  const tenantName = String(formData.get("tenant_name") ?? "").trim().slice(0, 60);
  const contactName = String(formData.get("contact_name") ?? "").trim().slice(0, 40);
  if (!tenantName) return { error: t("authErr.networkName") };

  const supabase = await createClient();
  const res = await supabase.auth.signUp({
    ...parsed.data,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/admin`,
      data: { reseller_signup: "1", tenant_name: tenantName, contact_name: contactName },
    },
  });
  const bad = signUpOutcome(res, t);
  if (bad) return bad;

  redirect("/verifie-tes-mails");
}

export async function requestResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getT();
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { error: t("authErr.invalidEmail") };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reinitialiser`,
  });
  // Le rate-limit d'envoi (quelques e-mails/heure) mérite un vrai message :
  // sinon l'utilisateur attend un e-mail jamais parti et réessaie en boucle.
  if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) {
    return { error: t("authErr.tooMany") };
  }
  // Sinon, toujours le même message, que l'e-mail existe ou non (anti-énumération).
  return {
    notice:
      t("authErr.resetSent"),
  };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { t } = await getT();
  const password = z
    .string()
    .min(8, t("authErr.passwordMin"))
    .safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (formData.get("password") !== formData.get("confirm")) {
    return { error: t("authErr.mismatch") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t("authErr.linkExpired") };
  }

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: t("authErr.updateFailed") };

  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
