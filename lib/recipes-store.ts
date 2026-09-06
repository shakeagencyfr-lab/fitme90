import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Les recettes générées n'étaient stockées nulle part : elles vivaient dans
// l'état React de la page nutrition et disparaissaient au premier rechargement,
// alors que le plafond journalier interdisait d'en regénérer. Le client perdait
// donc ses recettes pour la journée, et chaque récupération coûtait un crédit.

/** Dernier jeu de recettes d'un client (une ligne, remplacée à chaque génération). */
export async function saveClientRecipes(userId: string, recipes: unknown[]): Promise<void> {
  const admin = createAdminClient();
  await admin.from("client_recipes").upsert(
    { user_id: userId, recipes, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}

/** Recettes déjà générées, pour réafficher la page sans rappeler l'IA. */
export async function readClientRecipes(userId: string): Promise<unknown[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("client_recipes")
    .select("recipes")
    .eq("user_id", userId)
    .maybeSingle<{ recipes: unknown[] | null }>();
  return Array.isArray(data?.recipes) ? data.recipes : [];
}

/** Retire une idée du jour (par position) : elle ne s'affiche plus, sans rien coûter. */
export async function removeClientRecipe(userId: string, index: number): Promise<void> {
  const current = await readClientRecipes(userId);
  if (!Number.isInteger(index) || index < 0 || index >= current.length) return;
  const next = current.filter((_, i) => i !== index);
  await saveClientRecipes(userId, next);
}

export interface SavedRecipe {
  id: string;
  recipe: Record<string, unknown>;
  createdAt: string;
}

/**
 * « Mes recettes » : ce que le client a choisi de garder. Les idées du jour
 * sont remplacées à chaque génération ; sans cet endroit, une recette qu'il
 * aimait disparaissait au premier « nouvelles idées », et l'onglet Nutrition
 * s'allongeait de tout ce qu'il n'osait pas régénérer.
 */
export async function readSavedRecipes(userId: string): Promise<SavedRecipe[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("saved_recipes")
    .select("id, recipe, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<{ id: string; recipe: Record<string, unknown>; created_at: string }[]>();
  return (data ?? []).map((r) => ({ id: r.id, recipe: r.recipe, createdAt: r.created_at }));
}

/** Garde une recette. Bornée à 200 par client : au-delà, ce n'est plus une sélection. */
export async function saveRecipeForClient(userId: string, recipe: Record<string, unknown>): Promise<string | null> {
  const admin = createAdminClient();
  const { count } = await admin.from("saved_recipes").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= 200) return null;
  const { data } = await admin
    .from("saved_recipes")
    .insert({ user_id: userId, recipe })
    .select("id")
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function deleteSavedRecipe(userId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("saved_recipes").delete().eq("id", id).eq("user_id", userId);
}
