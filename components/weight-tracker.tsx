"use client";

import { useActionState, useState } from "react";
import { addWeight, type EvoState } from "@/app/app/evolution/actions";
import { Card, MonoLabel, Button, Alert } from "@/components/ui";

interface W {
  kg: number;
  measured_at: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}
function fmtLong(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function WeightTracker({ weights }: { weights: W[] }) {
  const [state, action, pending] = useActionState(addWeight, {} as EvoState);
  const [sel, setSel] = useState<number | null>(null);

  const wl = weights; // ascendant par date
  const kgs = wl.map((w) => w.kg);
  const last = wl[wl.length - 1];
  const first = wl[0];
  const delta = first && last ? last.kg - first.kg : 0;
  const wmin = kgs.length ? Math.min(...kgs) : 0;
  const wmax = kgs.length ? Math.max(...kgs) : 0;
  const span = wmax - wmin || 2;

  // Coordonnées de chaque point, en pourcentage (pour poser des pastilles HTML
  // cliquables par-dessus le tracé SVG).
  const coords = wl.map((w, i) => {
    const x = wl.length > 1 ? (i / (wl.length - 1)) * 100 : 50;
    const yV = 100 - ((w.kg - (wmin - span * 0.3)) / (span * 1.6)) * 90; // 0..110 échelle SVG
    const y = (yV / 110) * 100;
    return { x, y };
  });
  const pts = wl.map((w, i) => {
    const x = wl.length > 1 ? (i / (wl.length - 1)) * 300 : 150;
    const y = 100 - ((w.kg - (wmin - span * 0.3)) / (span * 1.6)) * 90;
    return `${Math.round(x)},${Math.round(y)}`;
  });
  const line = pts.join(" ");
  const area = pts.length > 1 ? `0,100 ${line} 300,100` : "";
  const hasChart = wl.length > 1;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <MonoLabel>Suivi du poids</MonoLabel>
          {last ? (
            <div className="flex items-baseline gap-1">
              <span className="font-archivo font-extrabold text-[40px] leading-none tracking-[-0.03em] text-ink">
                {String(last.kg).replace(".", ",")}
              </span>
              <span className="font-archivo font-bold text-[16px] text-muted-2">kg</span>
            </div>
          ) : (
            <div className="font-archivo font-extrabold text-[28px] text-muted-2">·</div>
          )}
          <span
            className="text-[13.5px] font-medium"
            style={{ color: wl.length < 2 ? "#8A8880" : delta <= 0 ? "#2F6B3C" : "#C4471A" }}
          >
            {wl.length < 2
              ? "Ajoute une pesée pour voir la courbe"
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} kg depuis la première pesée`}
          </span>
        </div>

        <form action={action} className="flex items-end gap-2">
          <input
            name="kg"
            inputMode="decimal"
            placeholder="Nouvelle pesée"
            className="tap w-[150px] rounded-control border border-line-3 bg-surface-2 px-3.5 text-ink placeholder:text-disabled outline-none focus:border-ink"
          />
          <Button type="submit" loading={pending} variant="primary" className="h-11">
            Ajouter
          </Button>
        </form>
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}

      {hasChart ? (
        <div className="rounded-card bg-surface-2 p-3.5">
          <div className="relative h-[130px] w-full">
            <svg viewBox="0 0 300 110" preserveAspectRatio="none" className="block h-full w-full">
              <polyline points={area} fill="#FBEDE6" stroke="none" />
              <polyline points={line} fill="none" stroke="#E0551F" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            {/* Pastilles cliquables : touche un point pour voir sa date et son poids. */}
            {coords.map((c, i) => {
              const on = sel === i;
              return (
                <button
                  key={i}
                  onClick={() => setSel(on ? null : i)}
                  aria-label={`${wl[i].kg} kg le ${fmtLong(wl[i].measured_at)}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <span
                    className={[
                      "block rounded-full border-2 border-brand transition-all",
                      on ? "size-4 bg-brand" : "size-3 bg-surface",
                    ].join(" ")}
                  />
                </button>
              );
            })}
            {/* Popup du point sélectionné */}
            {sel != null ? (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-control border border-line bg-surface px-3 py-1.5 shadow-[0_6px_18px_rgba(23,25,27,0.18)]"
                style={{
                  left: `${Math.min(88, Math.max(12, coords[sel].x))}%`,
                  top: `${Math.max(0, coords[sel].y - 22)}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-archivo font-extrabold text-[15px] leading-none text-ink">
                  {String(wl[sel].kg).replace(".", ",")} kg
                </div>
                <div className="pt-0.5 text-[11px] text-muted-2">{fmtLong(wl[sel].measured_at)}</div>
              </div>
            ) : null}
          </div>
          <div className="flex justify-between pt-1.5 font-mono text-[10px] text-muted-2">
            <span>{first ? fmt(first.measured_at) : ""}</span>
            <span>touche un point pour le détail</span>
            <span>{last ? fmt(last.measured_at) : ""}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-card bg-surface-2 p-5 text-[14px] leading-[1.6] text-muted">
          Enregistre une première pesée : ta courbe se construira à chaque nouvelle mesure.
        </div>
      )}
    </Card>
  );
}
