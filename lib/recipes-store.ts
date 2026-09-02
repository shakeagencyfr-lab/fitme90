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
