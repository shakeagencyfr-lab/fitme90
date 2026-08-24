"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

export interface PhotoState {
  error?: string;
  ok?: boolean;
}

// Consentement explicite, non pré-coché (RGPD, données de santé/corps).
export async function giveConsent(): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx) return;
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ photo_consent_at: new Date().toISOString() })
    .eq("id", ctx.userId);
  revalidatePath("/app/photos");
}

// Enregistre en base une photo déjà uploadée dans le bucket privé.
export async function recordPhoto(storagePath: string): Promise<PhotoState> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  // Sécurité : le chemin doit être dans le dossier de l'utilisateur.
  if (!storagePath.startsWith(`${ctx.userId}/`)) {
    return { error: "Chemin invalide." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({
    user_id: ctx.userId,
    storage_path: storagePath,
    kind: "progress",
  });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/app/photos");
  return { ok: true };
}
