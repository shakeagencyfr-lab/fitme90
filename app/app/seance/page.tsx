import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, MonoLabel } from "@/components/ui";
import { RestTimer } from "@/components/rest-timer";
import { SessionValidate } from "@/components/session-validate";

export const metadata = { title: "Séance — FitMe90" };

export default async function SeancePage() {
  const { ctx, plan } = await loadEspaceOrRedirect();
  const day = Math.max(1, ctx.access.day);
  const restPattern = plan.weekPlan.slice(0, 7).map((d) => d.rest);
  const todayRest = restPattern.length ? restPattern[(day - 1) % restPattern.length] : false;

  const supabase = await createClient();
  const { data: log } = await supabase
    .from("session_logs")
    .select("day")
    .eq("user_id", ctx.userId)
    .eq("day", day)
    .maybeSingle();
  const alreadyDone = !!log;

  if (todayRest) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-4">
        <MonoLabel className="text-cardio">Jour de repos</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Jour de repos
        </h1>
        <Card>
          <p className="text-[15px] leading-[1.6] text-body">
            Rien à soulever aujourd'hui. Marche 30 à 40 minutes si tu peux, dix minutes
            de mobilité hanches et épaules, et soigne le sommeil : c'est là que
            l'adaptation se fait. La nutrition passe en jour sans entraînement.
          </p>
        </Card>
      </div>
    );
  }

  const s = plan.session;
  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <MonoLabel className="text-brand">{s.cycleLabel}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {s.title || "Séance du jour"}
        </h1>
        {s.meta ? <p className="text-[14px] text-muted">{s.meta}</p> : null}
      </header>

      <div className="flex flex-col gap-2.5">
        {s.exercises.map((ex, i) => (
          <Card key={i} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-archivo font-semibold text-[16px] text-ink">{ex.name}</div>
              <div className="font-mono text-[12px] text-brand shrink-0">
                {ex.sets} × {ex.reps}
              </div>
            </div>
            {ex.load ? <div className="text-[13px] text-muted-2">Repère : {ex.load}</div> : null}
            {ex.note ? <div className="text-[13px] text-body leading-[1.5]">{ex.note}</div> : null}
          </Card>
        ))}
      </div>

      <RestTimer />
      <SessionValidate alreadyDone={alreadyDone} />
    </div>
  );
}
