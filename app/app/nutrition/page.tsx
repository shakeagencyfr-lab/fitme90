import { loadEspaceOrRedirect } from "@/lib/queries";
import { getT, userLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { pnum } from "@/lib/nutrition";
import { profilDepuisQuiz, repasDuJour } from "@/lib/recipe-engine";
import { restPattern, startWeekday } from "@/lib/schedule";
import { DAYS } from "@/lib/questionnaire";
import { NutritionView } from "@/components/nutrition-view";
import { readClientRecipes, readSavedRecipes } from "@/lib/recipes-store";

export const metadata = { title: "Nutrition" };

export default async function NutritionPage() {
  const { ctx, plan, answers, trainDays } = await loadEspaceOrRedirect();

  const supabase = await createClient();
  const { data: checks } = await supabase
    .from("shopping_checks")
    .select("item_key")
    .eq("user_id", ctx.userId);
  const initialChecks = (checks ?? []).map((c: { item_key: string }) => c.item_key);
  const [initialRecipes, savedRecipes] = await Promise.all([readClientRecipes(ctx.userId), readSavedRecipes(ctx.userId)]);

  const baseKcal = pnum(plan.nutrition.kcal) || 2580;
  const week = plan.weekPlan.slice(0, 7);
  const pattern = restPattern(trainDays, week.map((d) => d.rest));
  // Le profil alimentaire complet du questionnaire, pas seulement les
  // allergènes : la journée type et la liste de courses appliquent les mêmes
  // règles que les fiches recettes.
  const profil = profilDepuisQuiz(answers);
  const repas = repasDuJour(answers);
  const { t } = await getT(await userLocale(ctx.userId));

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        {t("nav.nutrition")}
      </h1>
      <NutritionView
        currentDay={Math.max(1, ctx.access.day)}
        baseKcal={baseKcal}
        restPattern={pattern}
        startWeekday={startWeekday(ctx.profile?.start_date)}
        dayNames={DAYS}
        profil={profil}
        repas={repas}
        macros={{ protein: plan.nutrition.protein, carbs: plan.nutrition.carbs, fat: plan.nutrition.fat }}
        canGenerate={ctx.access.coachEnabled}
        initialChecks={initialChecks}
        initialRecipes={initialRecipes as never}
        initialSaved={savedRecipes as never}
        startDate={ctx.profile?.start_date ?? ""}
        programDays={ctx.access.programDays}
      />
    </div>
  );
}
