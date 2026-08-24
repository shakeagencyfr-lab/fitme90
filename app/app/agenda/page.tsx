import Link from "next/link";
import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { MonoLabel } from "@/components/ui";

export const metadata = { title: "Agenda — FitMe90" };

const CYCLE_DOT = ["bg-brand", "bg-ink", "bg-cardio"];

export default async function AgendaPage() {
  const { ctx, plan } = await loadEspaceOrRedirect();
  const today = Math.max(1, ctx.access.day);
  const restPattern = plan.weekPlan.slice(0, 7).map((d) => d.rest);
  const isRest = (d: number) =>
    restPattern.length ? restPattern[(d - 1) % restPattern.length] : false;
  const cycleOf = (d: number) => (d <= 30 ? 0 : d <= 60 ? 1 : 2);

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("session_logs")
    .select("day")
    .eq("user_id", ctx.userId);
  const done = new Set((logs ?? []).map((l) => l.day as number));

  const weeks = Array.from({ length: 13 }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => w * 7 + i + 1).filter((d) => d <= 90),
  ).filter((w) => w.length);

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Agenda
      </h1>

      <div className="flex flex-wrap gap-4">
        {plan.cycles.slice(0, 3).map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`inline-block size-2.5 rounded-full ${CYCLE_DOT[i]}`} />
            <span className="text-[13px] text-muted">{c.name}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex items-center gap-2">
            <span className="w-8 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">
              S{wi + 1}
            </span>
            <div className="grid flex-1 grid-cols-7 gap-1.5">
              {week.map((d) => {
                const rest = isRest(d);
                const isDone = done.has(d);
                const isToday = d === today;
                return (
                  <Link
                    key={d}
                    href={`/app/seance?jour=${d}`}
                    aria-label={`Jour ${d}${rest ? " repos" : ""}${isDone ? " validé" : ""}`}
                    className={[
                      "relative flex aspect-square items-center justify-center rounded-[8px] border text-[12px] transition-colors hover:border-ink",
                      isToday ? "border-ink border-2" : "border-line",
                      rest ? "bg-surface-2 text-muted-2" : "bg-surface text-body",
                    ].join(" ")}
                    title={`Jour ${d}${rest ? " · repos" : ""}${isDone ? " · validé" : ""}`}
                  >
                    {isDone ? (
                      <span className="text-brand">✓</span>
                    ) : (
                      <span className="tabular-nums">{d}</span>
                    )}
                    {!rest ? (
                      <span
                        className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${CYCLE_DOT[cycleOf(d)]}`}
                      />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <MonoLabel>Touche un jour pour voir la séance · aujourd'hui encadré · ✓ validé · point = cycle</MonoLabel>
    </div>
  );
}
