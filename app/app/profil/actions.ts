"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionContext } from "@/lib/guard";

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
    if (error) return { error: "Enregistrement impossible." };
  }
  if (weight) {
    await supabase.from("weights").insert({ user_id: ctx.userId, kg: weight });
  }
  revalidatePath("/app/profil");
  return { ok: true };
}

// Changement de mot de passe depuis l'espace client (session active).
export async function changePassword(
  _prev: ProfilState,
  formData: FormData,
): Promise<ProfilState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "8 caractères minimum." };
  if (password !== formData.get("confirm")) return { error: "Les mots de passe diffèrent." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Impossible de changer le mot de passe." };
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
