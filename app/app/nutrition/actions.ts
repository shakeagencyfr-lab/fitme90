"use server";

import { revalidatePath } from "next/cache";
import { removeClientRecipe, saveRecipeForClient, deleteSavedRecipe } from "@/lib/recipes-store";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";

// Persiste l'état coché de la liste des courses. La liste elle-même est
// recalculée côté client (déterministe) ; seule la coche est stockée, par
// clé d'article stable (« aliment|unité »). RLS own_rows : chacun ses lignes.
export async function setShoppingCheck(itemKey: string, checked: boolean): Promise<{ ok: boolean }> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false };
  const key = String(itemKey).slice(0, 200);
  if (!key) return { ok: false };

  const supabase = await createClient();
  if (checked) {
    const { error } = await supabase
      .from("shopping_checks")
      .upsert({ user_id: ctx.userId, item_key: key }, { onConflict: "user_id,item_key" });
    return { ok: !error };
  }
  const { error } = await supabase
    .from("shopping_checks")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("item_key", key);
  return { ok: !error };
}

/** Le client garde une idée de recette dans « Mes recettes ». */
export async function saveRecipeAction(recipe: unknown): Promise<{ id?: string; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!recipe || typeof recipe !== "object") return { error: "Recette invalide." };
  const r = recipe as Record<string, unknown>;
  if (typeof r.name !== "string" || !r.name.trim()) return { error: "Recette invalide." };
  // On ne garde que les champs affichés : rien d'autre ne traverse.
  const clean: Record<string, unknown> = {};
  for (const k of ["id", "name", "level", "time", "servings", "kcal", "protein", "carbs", "fat", "ingredients", "steps", "tip"]) {
    if (r[k] !== undefined) clean[k] = r[k];
  }
  const id = await saveRecipeForClient(ctx.userId, clean);
  if (!id) return { error: "Tu as déjà 200 recettes gardées : fais de la place avant d'en ajouter." };
  revalidatePath("/app/nutrition");
  return { id };
}

export async function deleteSavedRecipeAction(id: string): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { error: "Recette introuvable." };
  await deleteSavedRecipe(ctx.userId, id);
  revalidatePath("/app/nutrition");
  return { ok: true };
}

/** Retire une idée du jour de la liste, sans la garder. */
export async function dismissRecipeAction(index: number): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  await removeClientRecipe(ctx.userId, Number(index));
  revalidatePath("/app/nutrition");
  return { ok: true };
}
