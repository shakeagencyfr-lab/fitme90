import { NextResponse } from "next/server";
import { makeT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/guard";
import { saveClientRecipes, readClientRecipes } from "@/lib/recipes-store";
import { pnum } from "@/lib/nutrition";
import { buildMenu, profilDepuisQuiz, repasDuJour, REPAS_LABEL } from "@/lib/recipe-engine";
import { RECIPE_STEPS } from "@/lib/recipe-steps";
import { resolveLocale, userLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

// Trois recettes (quatre avec collation) calées sur les macros du jour.
//
// SANS IA, ET DONC GRATUITES ET ILLIMITÉES. Elles sortent d'un catalogue écrit
// à l'avance, filtré par les réponses du questionnaire (allergies, régime,
// cadre religieux, aliments refusés, budget, temps de cuisine) puis mis à
// l'échelle sur les objectifs du jour. Deux gains par rapport à la génération
// par modèle : les macros affichées sont la somme réelle des quantités au lieu
// d'être annoncées au jugé, et un filtre d'allergène ne s'oublie pas.
// Voir lib/recipe-catalog.ts et lib/recipe-engine.ts.
export async function POST() {
  const ctx = await getSessionContext();
  const t = makeT(await resolveLocale(await userLocale(ctx?.userId)));
  if (!ctx) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ctx.access.coachEnabled) {
    return NextResponse.json({ error: t("srv.duringProgram") }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("questionnaires")
    .select("answers")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ answers: Record<string, unknown> }>();
  const { data: program } = await supabase
    .from("programs")
    .select("plan")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ plan: { nutrition?: Record<string, string> } }>();

  const answers = quiz?.answers ?? {};
  const n = program?.plan?.nutrition ?? {};
  // Sans plan lisible, on retombe sur un profil moyen plutôt que sur une
  // erreur : le client verra des recettes cohérentes, simplement pas calées
  // sur des objectifs qui n'existent pas encore.
  const jour = {
    kcal: pnum(n.kcal ?? "") || 2400,
    p: pnum(n.protein ?? "") || 140,
    c: pnum(n.carbs ?? "") || 260,
    f: pnum(n.fat ?? "") || 75,
  };

  // Les identifiants déjà servis : c'est ce qui fait que « régénérer » change
  // vraiment le menu, sans avoir besoin de hasard ni d'un compteur en base.
  const precedentes = (await readClientRecipes(ctx.userId)) as Array<{ id?: unknown }>;
  const exclure = precedentes
    .map((r) => (typeof r?.id === "string" ? r.id : null))
    .filter((x): x is string => Boolean(x));

  const menu = buildMenu({
    repas: repasDuJour(answers),
    jour,
    profil: profilDepuisQuiz(answers),
    exclure,
  });

  if (!menu.length) return NextResponse.json({ error: t("srv.noRecipes") }, { status: 422 });

  const recipes = menu.map((r) => ({
    id: r.id,
    name: r.nom,
    level: REPAS_LABEL[r.repas],
    time: `${r.minutes} min`,
    servings: "1 portion",
    kcal: String(Math.round(r.macros.kcal)),
    protein: `${Math.round(r.macros.p)} g`,
    carbs: `${Math.round(r.macros.c)} g`,
    fat: `${Math.round(r.macros.f)} g`,
    ingredients: r.ingredients.map((i) => ({ food: i.nom, qty: i.libelle })),
    steps: RECIPE_STEPS[r.id]?.etapes ?? [],
    tip: RECIPE_STEPS[r.id]?.astuce ?? "",
  }));

  await saveClientRecipes(ctx.userId, recipes);
  return NextResponse.json({ recipes });
}
