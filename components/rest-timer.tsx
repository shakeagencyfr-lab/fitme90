"use client";

import { useEffect, useState } from "react";

// Minuteur de repos : décompte à la seconde, remise à zéro (README).
const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [remaining, setRemaining] = useState(0);

  // Un seul intervalle, qui ne décompte que tant qu'il reste du temps.
  useEffect(() => {
    const id = setInterval(() => setRemaining((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono uppercase tracking-[0.12em] text-[10px] text-muted-2">
          Minuteur de repos
        </span>
        <span className="font-archivo font-extrabold text-[26px] leading-none tracking-[-0.03em] text-ink tabular-nums">
          {mm}:{ss}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setRemaining(p)}
            className="tap rounded-pill border border-line-4 bg-surface px-3 text-[13px] font-medium text-body"
          >
            {p < 120 ? `${p} s` : `${p / 60} min`}
          </button>
        ))}
        <button
          onClick={() => setRemaining(0)}
          className="tap rounded-pill border border-line-4 bg-surface px-3 text-[13px] font-medium text-muted"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
