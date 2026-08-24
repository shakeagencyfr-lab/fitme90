import Link from "next/link";
import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, MonoLabel, Alert } from "@/components/ui";
import { RestTimer } from "@/components/rest-timer";
import { SessionValidate } from "@/components/session-validate";
import { CoachLoadSuggestion } from "@/components/coach-loads";
import { RPE, RPE_INTRO, targetRpe } from "@/lib/fitness";
import { PROGRAM_DAYS } from "@/lib/config";

export const metadata = { title: "Séance — FitMe90" };

export default async function SeancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ctx, plan } = await loadEspaceOrRedirect();
  const sp = await searchParams;
  const today = Math.max(1, ctx.access.day);

  // Jour consulté : depuis l'agenda (?jour=) ou aujourd'hui par défaut.
  const jourParam = Number(Array.isArray(sp.jour) ? sp.jour[0] : sp.jour);
  const day = jourParam >= 1 && jourParam <= PROGRAM_DAYS ? jourParam : today;
  const isToday = day === today;

  const restPattern = plan.weekPlan.slice(0, 7).map((d) => d.rest);
  const dayIdx = (day - 1) % (restPattern.length || 7);
  const todayRest = restPattern.length ? restPattern[dayIdx] : false;
  const weekEntry = plan.weekPlan[dayIdx];
  const cycle = day <= 30 ? 1 : day <= 60 ? 2 : 3;
  const rpeGoal = targetRpe(day);

  const supabase = await createClient();
  const { data: log } = await supabase
    .from("session_logs")
    .select("day")
    .eq("user_id", ctx.userId)
    .eq("day", day)
    .maybeSingle();
  const alreadyDone = !!log;

  const DayNav = (
    <div className="flex items-center justify-between gap-2">
      <MonoLabel className="text-brand">
        Jour {day} · cycle {cycle}
        {!isToday ? " · aperçu" : ""}
      </MonoLabel>
      {!isToday ? (
        <Link href="/app/seance" className="text-[13px] font-medium text-brand">
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
          {weekEntry?.name || s.title || "Séance du jour"}
        </h1>
        {s.meta ? <p className="text-[14px] text-muted">{s.meta}</p> : null}
      </header>

      {/* Charges au ressenti (RPE) — en tête, avant les exercices */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[16px] text-ink">
            Charges au ressenti (RPE)
          </div>
          <p className="text-[13.5px] leading-[1.6] text-muted">{RPE_INTRO}</p>
          <p className="text-[13.5px] text-body mt-1">
            Objectif de ce cycle : <span className="font-semibold text-brand">RPE {rpeGoal}</span>.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {RPE.map((r) => {
            const on = r.id === rpeGoal;
            return (
              <div
                key={r.id}
                className={[
                  "flex items-start gap-3 rounded-control px-3 py-2",
                  on ? "bg-alert border border-alert-line" : "bg-surface-2",
                ].join(" ")}
              >
                <span
                  className={[
                    "font-archivo font-extrabold text-[15px] w-6 shrink-0 text-center",
                    on ? "text-brand" : "text-muted-2",
                  ].join(" ")}
                >
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
      </Card>

      {/* Exercices */}
      <div className="flex flex-col gap-2.5">
        {s.exercises.map((ex, i) => (
          <Card key={i} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-archivo font-semibold text-[16px] text-ink">{ex.name}</div>
              <div className="font-mono text-[12px] text-brand shrink-0">
                {ex.sets} × {ex.reps} · RPE {rpeGoal}
              </div>
            </div>
            {ex.note ? <div className="text-[13px] text-body leading-[1.5]">{ex.note}</div> : null}
          </Card>
        ))}
      </div>

      {isToday ? (
        <>
          <RestTimer />
          {ctx.access.coachEnabled ? <CoachLoadSuggestion /> : null}
          <SessionValidate alreadyDone={alreadyDone} />
        </>
      ) : (
        <Alert tone="info">
          Aperçu de la séance du jour {day}. Va sur la séance d'aujourd'hui pour la
          valider et lancer le minuteur.
        </Alert>
      )}
    </div>
  );
}
