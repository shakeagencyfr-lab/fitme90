"use client";

// La célébration se décide au montage à partir de localStorage (état externe) :
// un setState en effet est ici volontaire et sans cascade problématique.
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdherenceStats } from "@/lib/streak";
import { Card, MonoLabel } from "@/components/ui";
import { useT } from "@/components/locale-provider";
import type { TFn } from "@/lib/i18n";

// Bloc « Score de régularité » : un chiffre unique, clair, plutôt qu'un tableau
// de zéros incompréhensibles avant la première séance. Le score EST le
// pourcentage de séances prévues réellement faites. Tant que rien n'est encore
// dû, on affiche un état de démarrage encourageant.

const CELEBRATE_KEY = "fitme90:lastMilestone";

function scoreLabel(score: number, t: TFn): { text: string; cls: string } {
  if (score >= 90) return { text: t("regularity.excellent"), cls: "text-[#2F6B3C] bg-[#2F6B3C]/12" };
  if (score >= 75) return { text: t("regularity.veryGood"), cls: "text-brand bg-brand/12" };
  if (score >= 50) return { text: t("regularity.progressing"), cls: "text-[#8A6A17] bg-[#8A6A17]/12" };
  return { text: t("regularity.restart"), cls: "text-[#C4471A] bg-[#C4471A]/12" };
}

export function RegularityScore({
  stats,
  todayTraining,
}: {
  stats: AdherenceStats;
  todayTraining: boolean;
}) {
  const { streak, adherence, completedTotal, missed, todayPending, due } = stats;
  const t = useT();
  const [celebrate, setCelebrate] = useState<number | null>(null);

  const reached = [50, 40, 30, 20, 15, 10, 5, 1].find((m) => completedTotal >= m) ?? 0;
  useEffect(() => {
    if (!reached) return;
    let seen = 0;
    try {
      seen = Number(localStorage.getItem(CELEBRATE_KEY)) || 0;
    } catch {
      /* stockage indisponible */
    }
    if (reached > seen) {
      setCelebrate(reached);
      try {
        localStorage.setItem(CELEBRATE_KEY, String(reached));
      } catch {
        /* stockage indisponible */
      }
    }
  }, [reached]);

  const started = due > 0 && adherence != null;
  const cta =
    todayTraining && todayPending ? (
      <Link
        href="/app/seance"
        className="tap flex items-center justify-center rounded-btn bg-fill px-5 py-3 font-plex font-semibold text-[15px] text-fillfg transition-transform active:scale-[0.98]"
      >
        {t("regularity.doToday")}
      </Link>
    ) : todayTraining && !todayPending ? (
      <div className="rounded-control bg-brand/10 px-3.5 py-2.5 text-center text-[13.5px] font-medium text-ink">
        {t("regularity.todayDone")}
      </div>
    ) : null;

  return (
    <Card className="flex flex-col gap-4">
      {celebrate ? (
        <div className="flex items-center gap-3 rounded-control border border-brand/40 bg-brand/10 px-3.5 py-3 animate-[popin_.3s_ease-out]">
          <span className="text-[22px]">🎉</span>
          <div className="min-w-0 flex-1">
            <div className="font-archivo font-bold text-[14px] text-ink">
              {t("regularity.milestone", { n: celebrate })}
            </div>
            <div className="text-[12.5px] text-muted">{t("regularity.regularityWins")}</div>
          </div>
          <button onClick={() => setCelebrate(null)} className="shrink-0 text-muted-2 hover:text-ink" aria-label={t("common.close")}>
            ✕
          </button>
        </div>
      ) : null}

      <MonoLabel>{t("regularity.title")}</MonoLabel>

      {started ? (
        <>
          <div className="flex items-end gap-4">
            <div className="flex items-baseline gap-1">
              <span className="font-archivo font-extrabold text-[52px] leading-[0.9] tracking-[-0.03em] text-ink tabular-nums">
                {adherence}
              </span>
              <span className="font-archivo font-bold text-[18px] text-muted-2">/100</span>
            </div>
            <span
              className={`mb-1.5 rounded-pill px-3 py-1 text-[12.5px] font-semibold ${scoreLabel(adherence!, t).cls}`}
            >
              {scoreLabel(adherence!, t).text}
            </span>
          </div>

          <div className="h-2.5 overflow-hidden rounded-[5px] bg-surface-2">
            <div
              className="h-full rounded-[5px] bg-brand transition-[width] duration-500"
              style={{ width: `${adherence}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="text-brand">🔥</span>
              <span className="font-semibold text-ink">{streak}</span> {t("regularity.inARow")}
            </span>
            <span>
              <span className="font-semibold text-ink">{completedTotal}</span> {t("regularity.sessionsTotal")}
            </span>
            {missed > 0 ? (
              <span>
                <span className="font-semibold text-ink">{missed}</span> {t("regularity.missed")}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="font-archivo font-bold text-[19px] text-ink">{t("regularity.startsSoon")}</div>
          <p className="text-[13.5px] leading-[1.6] text-muted">{t("regularity.startsSoonBody")}</p>
        </div>
      )}

      {cta}
    </Card>
  );
}
