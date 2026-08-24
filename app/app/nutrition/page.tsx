import { loadEspaceOrRedirect } from "@/lib/queries";
import { bannedTags, pnum } from "@/lib/nutrition";
import { NutritionView } from "@/components/nutrition-view";

export const metadata = { title: "Nutrition — FitMe90" };

export default async function NutritionPage() {
  const { ctx, plan, answers } = await loadEspaceOrRedirect();

  const baseKcal = pnum(plan.nutrition.kcal) || 2580;
  const restPattern = plan.weekPlan.slice(0, 7).map((d) => d.rest);
  const banned = bannedTags(
    (answers.allerg as string[]) ?? [],
    (answers.diet as string) ?? undefined,
  );

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Nutrition
      </h1>
      <NutritionView
        day={Math.max(1, ctx.access.day)}
        baseKcal={baseKcal}
        restPattern={restPattern.length ? restPattern : [false, false, true, false, false, true, true]}
        banned={banned}
        macros={{ protein: plan.nutrition.protein, carbs: plan.nutrition.carbs, fat: plan.nutrition.fat }}
        canGenerate={ctx.access.coachEnabled}
      />
    </div>
  );
}
