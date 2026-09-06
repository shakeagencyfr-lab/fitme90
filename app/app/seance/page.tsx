import Link from "next/link";
import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { restPattern, isRestDay, startWeekday, dateOfProgramDay } from "@/lib/schedule";
import { sessionForDay, warmupSteps, cycleIndexForDay, hasDayOverride } from "@/lib/program";
import { Card, MonoLabel } from "@/components/ui";
import { SessionRunner, type Exercise } from "@/components/session-runner";
import { CoachLoadSuggestion } from "@/components/coach-loads";
import { DepannageButton } from "@/components/depannage-button";
import { RescueBanner } from "@/components/rescue-banner";
import { targetRpe, karvonen, resolveRestSeconds } from "@/lib/fitness";
import { explainWarmup, bpmLabel } from "@/lib/warmup-guide";
import { getT, userLocale } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n";
import { rpeScale } from "@/lib/i18n/fitness";
import { CircuitRunner } from "@/components/circuit-runner";
import { isCircuitSession, sensationScale, targetSensation, circuitLevel, sessionMinutes } from "@/lib/circuit";
import { isBodyweightExercise } from "@/lib/exercise-alternatives";
import { isRescueKind, rescueSession } from "@/lib/rescue-circuit";

export const metadata = { title: "Séance" };

interface SavedEntry {
  exercise: string;
  set: number;
  kg: number | null;
  reps: number | null;
  cardio?: boolean;
  circuit?: boolean;
  sensation?: number;
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
  const warmupBase = warmupSteps(s);
  // Séance en circuit (client sans salle) : chrono et sensations, pas de
  // charges ni de RPE. Une séance en séries peut finir par un bloc au chrono.
  const sensGoal = targetSensation(day);
  const sensations = sensationScale(locale);

  // SÉANCE DE DÉPANNAGE. Le client a dit ce dont il dispose (bouton « Je n'ai
  // pas mon matériel ») : on refait sa séance du jour en circuit avec ce
  // matériel-là, sans appel IA et sans toucher au programme enregistré.
  const depParam = Array.isArray(sp.depannage) ? sp.depannage[0] : sp.depannage;
  const depannage = isRescueKind(depParam) ? depParam : null;
  const rescue =
    depannage && s
      ? rescueSession({
          session: s,
          kind: depannage,
          level: circuitLevel(answers.level),
          minutes: sessionMinutes(answers.dur),
          cycleIndex: cycle - 1,
          locale,
        })
      : null;

  const circuit = rescue ? rescue.blocks.length > 0 : isCircuitSession(s);
  const blocks = rescue ? rescue.blocks : s?.blocks ?? [];

  const exercises: Exercise[] = (s?.exercises ?? []).map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    note: e.note,
    rest: e.rest,
    cardio: e.cardio,
    duration: e.duration,
    zone: e.zone,
    // Des pompes ne se chargent pas : la case « kg » n'a rien à demander.
    bodyweight: isBodyweightExercise(e.name, e.key),
  }));

  const warmup = rescue ? rescue.warmup : warmupBase;

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
  // Sans âge ni FC de repos, les pulsations affichées seraient celles d'un profil moyen : on annonce la zone, pas les chiffres.
  const hasHrProfile = !!(prof?.age && prof?.rest_hr);

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
  const initialSensations: Record<string, number> = {};
  for (const e of log?.entries ?? []) {
    if (e.circuit) {
      if (e.sensation) initialSensations[e.exercise] = e.sensation;
      continue;
    }
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
          {depannage ? <> · <span className="font-semibold text-brand">{t("rescue.badge")}</span></> : null}
        </p>
        {/* Le dépannage ne demande plus rien à l'IA : il est proposé à tous. */}
        <div className="pt-1">
          <DepannageButton day={day} coachEnabled={ctx.access.coachEnabled} />
        </div>
      </header>

      {/* Séance à part posée avec le coach pour ce jour : le client doit
          savoir que son programme, lui, n'a pas changé. */}
      {!depannage && hasDayOverride(plan, day) ? (
        <div className="rounded-card border border-line bg-surface-2 px-4 py-3 text-[13px] leading-[1.6] text-muted">
          {t("session.dayOverride")}
        </div>
      ) : null}

      {depannage ? (
        <RescueBanner
          day={day}
          kind={depannage}
          dropped={rescue?.dropped ?? []}
          playable={circuit}
          canLog={ctx.access.canLog}
        />
      ) : null}

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
            {warmup.map((w, i) => {
              const ex = explainWarmup(w, hasHrProfile ? zones : null, locale);
              return (
                <li key={i} className="flex items-start gap-3 rounded-control bg-surface-2 px-3 py-2">
                  <span className="font-archivo font-extrabold text-[14px] w-5 shrink-0 text-center text-muted-2">
                    {i + 1}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <div>
                      <span className="text-[14px] font-semibold text-ink">{w.name}</span>
                      {w.detail ? <span className="text-[13px] text-muted">, {w.detail}</span> : null}
                    </div>
                    {ex.zone ? (
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-cardio/40 bg-cardio/10 px-2.5 py-0.5 font-mono text-[11px] text-cardio">
                        {ex.zone.id}{ex.zone.name ? ` ${ex.zone.name}` : ""}
                        {ex.zone.range ? ` · ${bpmLabel(ex.zone.range, locale)}` : ` · ${t("session.zoneHint")}`}
                      </span>
                    ) : null}
                    {ex.how ? <p className="text-[12.5px] leading-[1.55] text-muted">{ex.how}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </details>
      ) : null}

      {/* Sensations (circuit) : l'intensité se règle au ressenti, sans charge */}
      {circuit ? (
      <details className="group rounded-card border border-line bg-surface p-4">
        <summary className="flex cursor-pointer items-center justify-between gap-2 list-none">
          <span className="font-archivo font-bold text-[16px] text-ink">{t("session.sensations")}</span>
          <span className="text-muted-2 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-[13.5px] leading-[1.6] text-muted">{sensations.intro}</p>
          <p className="text-[13.5px] text-body">
            {t("session.cycleGoal")} <span className="font-semibold text-brand">{sensations.steps.find((x) => x.id === sensGoal)?.label} ({sensGoal}/4)</span>.
          </p>
          <div className="flex flex-col gap-1.5">
            {sensations.steps.map((r) => {
              const on = r.id === sensGoal;
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
      ) : (
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
      )}

      {circuit ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-muted">{t("session.circuitIntro")}</p>
          <CircuitRunner
            day={day}
            blocks={blocks}
            targetSensation={sensGoal}
            canLog={ctx.access.canLog}
            alreadyDone={alreadyDone}
            initialSensations={initialSensations}
          />
        </>
      ) : (
        <>
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
          />

          {blocks.length ? (
            <div className="-mt-20 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="font-archivo font-bold text-[18px] text-ink">{t("session.finisher")}</h2>
                <p className="text-[13.5px] leading-relaxed text-muted">{t("session.finisherIntro")}</p>
              </div>
              <CircuitRunner day={day} blocks={blocks} targetSensation={sensGoal} canLog={false} alreadyDone={false} mode="finisher" />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
