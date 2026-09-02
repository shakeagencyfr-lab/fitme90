import Link from "next/link";
import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { restPattern, isRestDay, startWeekday, dateOfProgramDay } from "@/lib/schedule";
import { sessionForDay, warmupSteps, cycleIndexForDay } from "@/lib/program";
import { Card, MonoLabel } from "@/components/ui";
import { SessionRunner, type Exercise } from "@/components/session-runner";
import { CoachLoadSuggestion } from "@/components/coach-loads";
import { DepannageButton } from "@/components/depannage-button";
import { targetRpe, karvonen, resolveRestSeconds } from "@/lib/fitness";
import { getT, userLocale } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n";
import { rpeScale } from "@/lib/i18n/fitness";

export const metadata = { title: "Séance" };

interface SavedEntry {
  exercise: string;
  set: number;
  kg: number | null;
  reps: number | null;
  cardio?: boolean;
}

export default async function SeancePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ctx, plan, answers, trainDays } = await loadEspaceOrRedirect();
  const sp = await searchParams;
  const { locale, t } = await getT(await userLocale(ctx.userId));
  const { RPE, RPE_INTRO } = rpeScale(locale);
  const today = Math.max(1, ctx.access.day);

  const jourParam = Number(Array.isArray(sp.jour) ? sp.jour[0] : sp.jour);
  const day = jourParam >= 1 && jourParam <= ctx.access.programDays ? jourParam : today;
  const isToday = day === today;

  const startWd = startWeekday(ctx.profile?.start_date);
  const pattern = restPattern(trainDays, plan.weekPlan.slice(0, 7).map((d) => d.rest));
  const todayRest = isRestDay(day, pattern, startWd);
  const cycle = cycleIndexForDay(day, plan.cycles?.length || 3) + 1;
  const rpeGoal = targetRpe(day);

  // Séance du jour : programme PÉRIODISÉ en 3 cycles de 4 semaines. On prend les
  // séances DU BON CYCLE (elles changent toutes les 4 semaines) et on tourne sur
  // elles selon le rang du jour d'entraînement DANS le cycle. Repli sur la séance
  // unique pour les anciens plans.
  const s = sessionForDay(plan, day, pattern, startWd) ?? plan.session;
  const warmup = warmupSteps(s);

  const exercises: Exercise[] = (s?.exercises ?? []).map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    note: e.note,
    rest: e.rest,
    cardio: e.cardio,
    duration: e.duration,
    zone: e.zone,
  }));

  const supabase = await createClient();
  const [{ data: log }, { data: prof }] = await Promise.all([
    supabase
      .from("session_logs")
      .select("entries")
      .eq("user_id", ctx.userId)
      .eq("day", day)
      .maybeSingle<{ entries: SavedEntry[] | null }>(),
    supabase
      .from("profiles")
      .select("age, rest_hr, sex")
      .eq("id", ctx.userId)
      .maybeSingle<{ age: number | null; rest_hr: number | null; sex: string | null }>(),
  ]);
  const alreadyDone = !!log;
  const zones = karvonen(prof?.age || 34, prof?.rest_hr || 62, prof?.sex ?? undefined).zones;

  // Vraie date du jour de séance : on n'affiche jamais le jour figé du modèle,
  // mais la vraie date calculée du jour choisi.
  const realDate = ctx.profile?.start_date
    ? dateOfProgramDay(ctx.profile.start_date, day).toLocaleDateString(dateLocale(locale), {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : "";
  const dateLabel = realDate ? realDate.charAt(0).toUpperCase() + realDate.slice(1) : "";
  const dur = (answers.dur as string) || plan.weekPlan.find((d) => !d.rest)?.dur || "";
  // Repos entre séries : champ structuré de la séance, sinon lu dans meta/notes.
  const restSec = resolveRestSeconds(
    s?.restSec,
    s?.meta,
    ...(s?.exercises ?? []).map((e) => e.note),
  );

  // Reconstruit l'état initial {exIdx-setIdx: {kg, reps}} + les cardio cochés.
  const initial: Record<string, { kg: string; reps: string }> = {};
  const initialCardio: string[] = [];
  for (const e of log?.entries ?? []) {
    if (e.cardio) {
      initialCardio.push(e.exercise);
      continue;
    }
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
        {t("common.day")} {day} · {t("dashboard.cycle").toLowerCase()} {cycle}
        {!isToday ? ` · ${t("session.otherDay")}` : ""}
      </MonoLabel>
      {!isToday ? (
        <Link href="/app/seance" className="text-[13px] font-medium text-brand hover:underline">
          {t("session.backToToday")}
        </Link>
      ) : null}
    </div>
  );

  if (todayRest) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col gap-4">
        {DayNav}
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {t("session.restDay")}
        </h1>
        <Card>
          <p className="text-[15px] leading-[1.6] text-body">{t("session.restDayBody")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      {DayNav}
      <header className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {s?.title || t("session.ofDay")}
        </h1>
        <p className="text-[14px] text-muted">
          {[dateLabel, dur].filter(Boolean).join(" · ")}
        </p>
        {ctx.access.coachEnabled ? (
          <div className="pt-1">
            <DepannageButton />
          </div>
        ) : null}
      </header>

      {/* Échauffement : préparation avant le travail (obligatoire, 5 à 8 min). */}
      {warmup.length ? (
        <details className="group rounded-card border border-line bg-surface p-4" open>
          <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
            <span className="flex items-center gap-2">
              <span className="font-archivo font-bold text-[16px] text-ink">{t("session.warmup")}</span>
              <span className="rounded-full bg-alert px-2 py-0.5 text-[11px] font-semibold text-brand border border-alert-line">
                {t("session.beforeStart")}
              </span>
            </span>
            <span className="text-muted-2 transition-transform group-open:rotate-180">⌄</span>
          </summary>
          <ol className="mt-3 flex flex-col gap-2">
            {warmup.map((w, i) => (
              <li key={i} className="flex items-start gap-3 rounded-control bg-surface-2 px-3 py-2">
                <span className="font-archivo font-extrabold text-[14px] w-5 shrink-0 text-center text-muted-2">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <span className="text-[14px] font-semibold text-ink">{w.name}</span>
                  {w.detail ? <span className="text-[13px] text-muted">, {w.detail}</span> : null}
                </div>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {/* Charges au ressenti (RPE) */}
      <details className="group rounded-card border border-line bg-surface p-4">
        <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
          <span className="font-archivo font-bold text-[16px] text-ink">{t("session.rpe")}</span>
          <span className="text-muted-2 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-[13.5px] leading-[1.6] text-muted">{RPE_INTRO}</p>
          <p className="text-[13.5px] text-body">
            {t("session.cycleGoal")} <span className="font-semibold text-brand">RPE {rpeGoal}</span>.
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
                    <span className="text-[13px] text-muted">, {r.body}</span>
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
        zones={zones}
        restSec={restSec}
        initialCardio={initialCardio}
        canAlternate={ctx.access.coachEnabled}
        sessionTitle={s?.title ?? ""}
      />
    </div>
  );
}
