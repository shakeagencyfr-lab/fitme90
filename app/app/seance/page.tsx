import Link from "next/link";
import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { restPattern, isRestDay, startWeekday } from "@/lib/schedule";
import { Card, MonoLabel } from "@/components/ui";
import { SessionRunner, type Exercise } from "@/components/session-runner";
import { CoachLoadSuggestion } from "@/components/coach-loads";
import { RPE, RPE_INTRO, targetRpe } from "@/lib/fitness";
import { PROGRAM_DAYS } from "@/lib/config";

export const metadata = { title: "Séance — FitMe90" };

interface SavedEntry {
  exercise: string;
  set: number;
  kg: number | null;
  reps: number | null;
}

export default async function SeancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ctx, plan, trainDays } = await loadEspaceOrRedirect();
  const sp = await searchParams;
  const today = Math.max(1, ctx.access.day);

  const jourParam = Number(Array.isArray(sp.jour) ? sp.jour[0] : sp.jour);
  const day = jourParam >= 1 && jourParam <= PROGRAM_DAYS ? jourParam : today;
  const isToday = day === today;

  const pattern = restPattern(trainDays, plan.weekPlan.slice(0, 7).map((d) => d.rest));
  const todayRest = isRestDay(day, pattern, startWeekday(ctx.profile?.start_date));
  const cycle = day <= 30 ? 1 : day <= 60 ? 2 : 3;
  const rpeGoal = targetRpe(day);
  const exercises: Exercise[] = plan.session.exercises.map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    note: e.note,
  }));

  const supabase = await createClient();
  const { data: log } = await supabase
    .from("session_logs")
    .select("entries")
    .eq("user_id", ctx.userId)
    .eq("day", day)
    .maybeSingle<{ entries: SavedEntry[] | null }>();
  const alreadyDone = !!log;

  // Reconstruit l'état initial {exIdx-setIdx: {kg, reps}} depuis les entrées.
  const initial: Record<string, { kg: string; reps: string }> = {};
  for (const e of log?.entries ?? []) {
    const exIdx = exercises.findIndex((x) => x.name === e.exercise);
    if (exIdx >= 0 && e.set) {
      initial[`${exIdx}-${e.set - 1}`] = {
        kg: e.kg != null ? String(e.kg) : "",
        reps: e.reps != null ? String(e.reps) : "",
      };
    }
  }

  const DayNav = (
    <div className="flex items-center justify-between gap-2">
      <MonoLabel className="text-brand">
        Jour {day} · cycle {cycle}
        {!isToday ? " · autre jour" : ""}
      </MonoLabel>
      {!isToday ? (
        <Link href="/app/seance" className="text-[13px] font-medium text-brand hover:underline">
          Revenir à aujourd'hui
        </Link>
      ) : null}
    </div>
  );

  if (todayRest) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-4">
        {DayNav}
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Jour de repos
        </h1>
        <Card>
          <p className="text-[15px] leading-[1.6] text-body">
            Rien à soulever ce jour-là. Marche 30 à 40 minutes si tu peux, dix minutes
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
      {DayNav}
      <header className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {s.title || "Séance du jour"}
        </h1>
        {s.meta ? <p className="text-[14px] text-muted">{s.meta}</p> : null}
      </header>

      {/* Charges au ressenti (RPE) */}
      <details className="group rounded-card border border-line bg-surface p-4">
        <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
          <span className="font-archivo font-bold text-[16px] text-ink">Charges au ressenti (RPE)</span>
          <span className="text-muted-2 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-[13.5px] leading-[1.6] text-muted">{RPE_INTRO}</p>
          <p className="text-[13.5px] text-body">
            Objectif de ce cycle : <span className="font-semibold text-brand">RPE {rpeGoal}</span>.
          </p>
          <div className="flex flex-col gap-1.5">
            {RPE.map((r) => {
              const on = r.id === rpeGoal;
              return (
                <div
                  key={r.id}
                  className={["flex items-start gap-3 rounded-control px-3 py-2", on ? "bg-alert border border-alert-line" : "bg-surface-2"].join(" ")}
                >
                  <span className={["font-archivo font-extrabold text-[15px] w-6 shrink-0 text-center", on ? "text-brand" : "text-muted-2"].join(" ")}>
                    {r.id}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[13.5px] font-semibold text-ink">{r.label}</span>
                    <span className="text-[13px] text-muted"> — {r.body}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </details>

      {ctx.access.coachEnabled ? <CoachLoadSuggestion /> : null}

      <SessionRunner
        day={day}
        exercises={exercises}
        rpeGoal={rpeGoal}
        canLog={ctx.access.canLog}
        alreadyDone={alreadyDone}
        initial={initial}
      />
    </div>
  );
}
