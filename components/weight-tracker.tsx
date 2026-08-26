"use client";

import { useActionState } from "react";
import { addWeight, type EvoState } from "@/app/app/evolution/actions";
import { Card, MonoLabel, Button, Alert } from "@/components/ui";

interface W {
  kg: number;
  measured_at: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

export function WeightTracker({ weights }: { weights: W[] }) {
  const [state, action, pending] = useActionState(addWeight, {} as EvoState);

  const wl = weights; // ascendant par date
  const kgs = wl.map((w) => w.kg);
  const last = wl[wl.length - 1];
  const first = wl[0];
  const delta = first && last ? last.kg - first.kg : 0;
  const wmin = kgs.length ? Math.min(...kgs) : 0;
  const wmax = kgs.length ? Math.max(...kgs) : 0;
  const span = wmax - wmin || 2;

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
            <div className="font-archivo font-extrabold text-[28px] text-muted-2">—</div>
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
          <Button type="submit" loading={pending} variant="primary" className="h-11 bg-fill text-fillfg hover:bg-fill">
            Ajouter
          </Button>
        </form>
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}

      {hasChart ? (
        <div className="rounded-card bg-surface-2 p-3.5">
          <svg viewBox="0 0 300 110" preserveAspectRatio="none" className="block h-[130px] w-full overflow-visible">
            <polyline points={area} fill="#FBEDE6" stroke="none" />
            <polyline points={line} fill="none" stroke="#E0551F" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div className="flex justify-between pt-1.5 font-mono text-[10px] text-muted-2">
            <span>{first ? fmt(first.measured_at) : ""}</span>
            <span>
              {wmin.toFixed(1).replace(".", ",")} → {wmax.toFixed(1).replace(".", ",")} kg
            </span>
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
