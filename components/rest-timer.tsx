"use client";

import { useEffect, useState } from "react";

// Minuteur de repos — pensé mobile : grand affichage, gros boutons tactiles,
// démarrage/pause clair, ±15 s, presets. Bip léger + vibration en fin.
const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          setRunning(false);
          try {
            navigator.vibrate?.(200);
          } catch {
            /* ignore */
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function set(sec: number) {
    setTotal(sec);
    setRemaining(sec);
    setRunning(sec > 0);
  }
  function bump(delta: number) {
    setRemaining((s) => Math.max(0, s + delta));
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = total ? (remaining / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-mono uppercase tracking-[0.12em] text-[10px] text-muted-2">
          Minuteur de repos
        </span>
        <span
          className="font-archivo font-extrabold text-[44px] leading-none tracking-[-0.03em] tabular-nums"
          style={{ color: remaining > 0 && remaining <= 5 ? "#E0551F" : "#17191B" }}
        >
          {mm}:{ss}
        </span>
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full bg-brand transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>

      {/* Presets — cibles larges */}
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => set(p)}
            className="tap rounded-control border border-line-4 bg-surface-2 py-3 text-[15px] font-semibold text-body active:bg-paper"
          >
            {p < 120 ? `${p}s` : `${p / 60}min`}
          </button>
        ))}
      </div>

      {/* Contrôles principaux — gros boutons */}
      <div className="flex items-stretch gap-2">
        <button
          onClick={() => bump(-15)}
          disabled={remaining === 0}
          className="tap w-16 shrink-0 rounded-control border border-line-4 bg-surface text-[15px] font-semibold text-body disabled:text-disabled"
        >
          −15
        </button>
        <button
          onClick={() => setRunning((r) => (remaining > 0 ? !r : r))}
          disabled={remaining === 0}
          className="tap flex-1 rounded-control bg-ink py-3.5 text-[16px] font-semibold text-white disabled:bg-disabled"
        >
          {running ? "Pause" : remaining > 0 ? "Reprendre" : "Choisis une durée"}
        </button>
        <button
          onClick={() => bump(15)}
          className="tap w-16 shrink-0 rounded-control border border-line-4 bg-surface text-[15px] font-semibold text-body"
        >
          +15
        </button>
      </div>

      <button
        onClick={() => {
          setRemaining(0);
          setRunning(false);
          setTotal(0);
        }}
        className="tap text-[13px] font-medium text-muted-2 hover:text-ink self-center"
      >
        Réinitialiser
      </button>
    </div>
  );
}
