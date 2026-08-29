"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export interface AuthState {
  error?: string;
  notice?: string;
}

const credentials = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum."),
});

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "E-mail ou mot de passe incorrect." };
  }

  const next = String(formData.get("suite") || "/app");
  redirect(next.startsWith("/") ? next : "/app");
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  if (formData.get("password") !== formData.get("confirm")) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }
  if (formData.get("cgv") !== "on") {
    return { error: "Tu dois accepter les CGV et la politique de confidentialité." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=/questionnaire` },
  });
  if (error) {
    // Message neutre : ne pas révéler si l'e-mail existe déjà.
    return { error: "Impossible de créer le compte. Vérifie l'adresse e-mail." };
  }

  redirect("/verifie-tes-mails");
}

export async function requestResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Adresse e-mail invalide." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reinitialiser`,
  });
  // Toujours le même message, que l'e-mail existe ou non (anti-énumération).
  return {
    notice:
      "Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.",
  };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = z
    .string()
    .min(8, "Mot de passe : 8 caractères minimum.")
    .safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (formData.get("password") !== formData.get("confirm")) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Lien expiré. Recommence la procédure de réinitialisation." };
  }

  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "Impossible de mettre à jour le mot de passe." };

  redirect("/app");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
