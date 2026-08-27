"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdherenceStats } from "@/lib/streak";
import { Card, MonoLabel } from "@/components/ui";

// Bloc « rétention » du tableau de bord : série en cours, adhérence, séances
// validées et progression vers le prochain palier. Une petite célébration
// (une seule fois par palier) s'affiche quand un nouveau palier est atteint,
// mémorisée en localStorage pour ne pas se répéter à chaque visite.

const CELEBRATE_KEY = "fitme90:lastMilestone";

function flame(active: boolean) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className={active ? "" : "opacity-40"}>
      <path
        fill="currentColor"
        d="M12 2c.4 3-1.6 4.3-2.9 5.7C7.6 9.2 7 10.7 7 12.5 7 16 9.7 18.5 12 18.5s5-2.5 5-6c0-2.6-1.4-4.3-2.4-5.6-.3 1.2-1 1.9-1.8 2.3.4-2.4-.2-5-.8-7.2Z"
      />
    </svg>
  );
}

export function AdherencePanel({
  stats,
  todayTraining,
}: {
  stats: AdherenceStats;
  todayTraining: boolean;
}) {
  const { streak, adherence, completedTotal, nextMilestone, todayPending, missed } = stats;
  const [celebrate, setCelebrate] = useState<number | null>(null);

  // Palier atteint : le plus grand palier <= completedTotal.
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

  const toNext = nextMilestone ? nextMilestone - completedTotal : 0;
  const pct =
    nextMilestone && nextMilestone > 0
      ? Math.min(100, Math.round((completedTotal / nextMilestone) * 100))
      : 100;

  return (
    <Card className="flex flex-col gap-4">
      {celebrate ? (
        <div className="flex items-center gap-3 rounded-control border border-brand/40 bg-brand/10 px-3.5 py-3 animate-[popin_.3s_ease-out]">
          <span className="text-[22px]">🎉</span>
          <div className="min-w-0">
            <div className="font-archivo font-bold text-[14px] text-ink">
              {celebrate} séance{celebrate > 1 ? "s" : ""} validée{celebrate > 1 ? "s" : ""} !
            </div>
            <div className="text-[12.5px] text-muted">Continue, la régularité fait tout le résultat.</div>
          </div>
          <button
            onClick={() => setCelebrate(null)}
            className="ml-auto shrink-0 text-muted-2 hover:text-ink"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <MonoLabel>Ta régularité</MonoLabel>
        <span className="font-mono text-[11px] text-muted-2">
          {completedTotal} séance{completedTotal > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Série en cours */}
        <div className="flex flex-col gap-1 rounded-control bg-surface-2 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-brand">
            {flame(streak > 0)}
            <span className="font-archivo font-extrabold text-[28px] leading-none tracking-[-0.03em] text-ink">
              {streak}
            </span>
          </div>
          <div className="text-[12.5px] text-muted">
            {streak > 0 ? "d'affilée" : "série en cours"}
          </div>
        </div>

        {/* Adhérence */}
        <div className="flex flex-col gap-1 rounded-control bg-surface-2 px-3.5 py-3">
          <span className="font-archivo font-extrabold text-[28px] leading-none tracking-[-0.03em] text-ink tabular-nums">
            {adherence == null ? "·" : `${adherence}%`}
          </span>
          <div className="text-[12.5px] text-muted">
            {adherence == null
              ? "adhérence"
              : missed > 0
                ? `adhérence · ${missed} manquée${missed > 1 ? "s" : ""}`
                : "adhérence"}
          </div>
        </div>
      </div>

      {/* Progression vers le prochain palier */}
      {nextMilestone ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[12.5px] text-muted">
            <span>Prochain palier</span>
            <span className="tabular-nums">
              {completedTotal}/{nextMilestone}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-[4px] bg-surface-2">
            <div className="h-full rounded-[4px] bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[12px] text-muted-2">
            Plus que {toNext} séance{toNext > 1 ? "s" : ""} avant le prochain palier.
          </div>
        </div>
      ) : null}

      {/* Appel à l'action séance du jour */}
      {todayTraining && todayPending ? (
        <Link
          href="/app/seance"
          className="tap flex items-center justify-center rounded-btn bg-fill px-5 py-3 font-plex font-semibold text-[15px] text-fillfg transition-transform active:scale-[0.98]"
        >
          Faire ma séance du jour
        </Link>
      ) : todayTraining && !todayPending ? (
        <div className="rounded-control bg-brand/10 px-3.5 py-2.5 text-center text-[13.5px] font-medium text-ink">
          Séance du jour validée. Beau travail.
        </div>
      ) : null}
    </Card>
  );
}
