"use server";

import { revalidatePath } from "next/cache";
import { removeClientRecipe, saveRecipeForClient, deleteSavedRecipe } from "@/lib/recipes-store";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { clampGrams, isMealSlot, type FoodEntry, type FoodProduct } from "@/lib/food-log";
import { FOOD_COLS, readFoodDay, rowToEntry, type FoodRow } from "@/lib/food-log-store";

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

// ───────────────────────────── Journal alimentaire
//
// Une ligne = un aliment, sa quantité et sa fiche pour 100 g figée au moment
// de l'ajout. Les totaux se recalculent à l'affichage (lib/food-log.ts), il
// n'y a donc jamais de somme fausse en base. RLS own_rows : chacun ses lignes.

const okDay = (d: unknown): d is number => typeof d === "number" && Number.isInteger(d) && d >= 1 && d <= 400;

export async function listFoodEntries(day: number): Promise<FoodEntry[]> {
  const ctx = await getSessionContext();
  if (!ctx || !okDay(day)) return [];
  return readFoodDay(ctx.userId, day);
}

/** Ajoute un aliment au journal du jour. La fiche vient de /api/food/* ou d'une saisie à la main. */
export async function addFoodEntry(input: { day: number; slot: string; product: FoodProduct; grams: number }): Promise<{ entry?: FoodEntry; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: "Journal en lecture seule." };
  const grams = clampGrams(input?.grams);
  const p = input?.product;
  if (!okDay(input?.day) || !isMealSlot(input?.slot) || !grams || !p || typeof p.name !== "string" || !p.name.trim()) {
    return { error: "Saisie invalide." };
  }
  const per = p.per100 ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const clean = (v: unknown, max: number) => Math.min(max, Math.max(0, Number(v) || 0));
  const row = {
    user_id: ctx.userId,
    day: input.day,
    slot: input.slot,
    name: p.name.trim().slice(0, 120),
    brand: typeof p.brand === "string" && p.brand.trim() ? p.brand.trim().slice(0, 60) : null,
    barcode: typeof p.barcode === "string" && /^\d{6,14}$/.test(p.barcode) ? p.barcode : null,
    grams,
    kcal_100: clean(per.kcal, 900),
    protein_100: clean(per.protein, 100),
    carbs_100: clean(per.carbs, 100),
    fat_100: clean(per.fat, 100),
  };
  const supabase = await createClient();
  const { data, error } = await supabase.from("food_log").insert(row).select(FOOD_COLS).single<FoodRow>();
  if (error || !data) return { error: "Enregistrement impossible." };
  return { entry: rowToEntry(data) };
}

export async function updateFoodEntry(id: string, grams: number): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: "Journal en lecture seule." };
  const g = clampGrams(grams);
  if (!g || typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { error: "Saisie invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("food_log").update({ grams: g }).eq("id", id).eq("user_id", ctx.userId);
  return error ? { error: "Enregistrement impossible." } : { ok: true };
}

export async function deleteFoodEntry(id: string): Promise<{ ok?: boolean; error?: string }> {
  const ctx = await getSessionContext();
  if (!ctx) return { error: "Non authentifié." };
  if (!ctx.access.canLog) return { error: "Journal en lecture seule." };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { error: "Saisie invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("food_log").delete().eq("id", id).eq("user_id", ctx.userId);
  return error ? { error: "Suppression impossible." } : { ok: true };
}
