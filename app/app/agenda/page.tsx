import Link from "next/link";
import { getT, userLocale } from "@/lib/i18n/server";
import { dateLocale } from "@/lib/i18n";
import { dayLabel } from "@/lib/i18n/quiz";
import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  restPattern,
  parseStartDate,
  weekdayIndexUTC,
  dateOfProgramDay,
} from "@/lib/schedule";
import { DAYS } from "@/lib/questionnaire";
import { MonoLabel } from "@/components/ui";
import { cycleIndexForDay } from "@/lib/program";

export const metadata = { title: "Agenda" };

const DAY_MS = 86_400_000;
const CYCLE_DOT = ["bg-brand", "bg-ink", "bg-cardio"];

export default async function AgendaPage() {
  const { ctx, plan, trainDays } = await loadEspaceOrRedirect();
  const { locale, t } = await getT(await userLocale(ctx.userId));
  const today = ctx.access.day; // numéro de jour de programme (peut être ≤ 0 si à venir)
  const programDays = ctx.access.programDays;
  const cycleCount = plan.cycles?.length || 3;
  // Couleur du point de cycle (tourne sur 3 couleurs si plus de 3 cycles).
  const cycleOf = (d: number) => cycleIndexForDay(d, cycleCount) % CYCLE_DOT.length;
  const pattern = restPattern(trainDays, plan.weekPlan.slice(0, 7).map((d) => d.rest));

  const start = parseStartDate(ctx.profile?.start_date) ?? new Date();
  const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const end = dateOfProgramDay(start, programDays);
  const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  // Premier jour du calendrier = lundi de la semaine du départ.
  const firstCal = startUTC - weekdayIndexUTC(start) * DAY_MS;
  const weeksCount = Math.ceil((endUTC - firstCal) / DAY_MS / 7) + 1;
  const programDayOf = (dUTC: number) => Math.round((dUTC - startUTC) / DAY_MS) + 1;

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("session_logs")
    .select("day")
    .eq("user_id", ctx.userId);
  const done = new Set((logs ?? []).map((l) => l.day as number));

  const fmtMonth = (dUTC: number) =>
    new Date(dUTC).toLocaleDateString(dateLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" });

  // Construit les semaines (chaque semaine = 7 dates réelles LUN→DIM).
  const weeks = Array.from({ length: weeksCount }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => firstCal + (w * 7 + i) * DAY_MS),
  );

  let lastMonth = "";

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        {t("nav.agenda")}
      </h1>

      <div className="flex flex-wrap gap-4">
        {plan.cycles.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`inline-block size-2.5 rounded-full ${CYCLE_DOT[i % CYCLE_DOT.length]}`} />
            <span className="text-[13px] text-muted">{c.name}</span>
          </div>
        ))}
      </div>

      {/* En-têtes de jours */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => (
          <div key={d} className="text-center font-mono text-[10px] uppercase tracking-[0.06em] text-muted-2">
            {dayLabel(d, locale).slice(0, 1)}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {weeks.map((week, wi) => {
          const month = fmtMonth(week[0]);
          const showMonth = month !== lastMonth;
          lastMonth = month;
          return (
            <div key={wi} className="flex flex-col gap-1.5">
              {showMonth ? (
                <MonoLabel className="pt-1 text-muted">{month}</MonoLabel>
              ) : null}
              <div className="grid grid-cols-7 gap-1.5">
                {week.map((dUTC) => {
                  const date = new Date(dUTC);
                  const pd = programDayOf(dUTC);
                  const inWindow = pd >= 1 && pd <= programDays;
                  const rest = pattern[weekdayIndexUTC(date)];
                  const isDone = done.has(pd);
                  const isToday = inWindow && pd === today;
                  // Séance manquée : jour d'entraînement passé, non validé.
                  const isMissed = inWindow && !rest && !isDone && pd < today;
                  const dom = date.getUTCDate();

                  if (!inWindow) {
                    return (
                      <div
                        key={dUTC}
                        className="flex aspect-square items-center justify-center rounded-[8px] text-[12px] text-disabled"
                      >
                        <span className="tabular-nums">{dom}</span>
                      </div>
                    );
                  }

                  const base = [
                    "relative flex aspect-square flex-col items-center justify-center rounded-[8px] border text-[12px] transition-colors hover:border-ink",
                    isToday ? "border-ink border-2" : isMissed ? "border-[#C4471A]/45" : "border-line",
                    isMissed
                      ? "bg-alert text-alert-ink"
                      : rest
                        ? "bg-surface-2 text-muted-2"
                        : "bg-surface text-body",
                  ].join(" ");

                  return (
                    <Link
                      key={dUTC}
                      href={`/app/seance?jour=${pd}`}
                      aria-label={`${dom}, ${t("common.day").toLowerCase()} ${pd}${rest ? ` ${t("agenda.rest")}` : ""}${isDone ? ` ${t("agenda.done")}` : isMissed ? ` ${t("agenda.missed")}` : ""}`}
                      title={`${t("common.day")} ${pd}${rest ? ` · ${t("agenda.rest")}` : ""}${isDone ? ` · ${t("agenda.done")}` : isMissed ? ` · ${t("agenda.missed")}` : ""}`}
                      className={base}
                    >
                      {isDone ? (
                        <span className="text-[14px] text-brand">✓</span>
                      ) : (
                        <span className="tabular-nums font-medium">{dom}</span>
                      )}
                      {isMissed ? (
                        <span className="absolute right-1 top-1 text-[10px] font-bold leading-none text-[#C4471A]">!</span>
                      ) : null}
                      {!rest ? (
                        <span
                          className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${CYCLE_DOT[cycleOf(pd)]}`}
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <MonoLabel>{t("agenda.legend")}</MonoLabel>
    </div>
  );
}
