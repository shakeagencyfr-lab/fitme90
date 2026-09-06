import { fmtLocale, tx } from "@/lib/i18n/request";
// Courbe de poids compacte, rendue côté serveur (SVG). Lecture seule, pour la
// fiche client du coach.
export interface WeightPoint {
  kg: number;
  date: string; // ISO date
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(fmtLocale(), { day: "2-digit", month: "short", timeZone: "UTC" });

export function MiniWeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) {
    return <p className="text-[13px] text-muted">{tx("Aucune pesée enregistrée.")}</p>;
  }
  if (points.length === 1) {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-archivo text-[24px] font-extrabold tracking-[-0.02em] text-ink">{points[0].kg} {tx("kg")}</span>
        <span className="text-[12px] text-muted-2">{tx("le")} {fmtDate(points[0].date)}</span>
      </div>
    );
  }

  const W = 640;
  const H = 160;
  const pad = 26;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const span = max - min || 1;
  const n = points.length;

  const x = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (kg: number) => pad + (1 - (kg - min) / span) * (H - 2 * pad);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;

  const first = points[0];
  const last = points[n - 1];
  const delta = +(last.kg - first.kg).toFixed(1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-archivo text-[24px] font-extrabold tracking-[-0.02em] text-ink">{last.kg} {tx("kg")}</span>
        <span className={`text-[13px] font-semibold ${delta < 0 ? "text-brand" : delta > 0 ? "text-body-2" : "text-muted-2"}`}>
          {delta > 0 ? "+" : ""}{delta} {tx("kg depuis le")} {fmtDate(first.date)}
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[160px] w-full min-w-[420px]" role="img" aria-label={tx("Courbe de poids")}>
          <path d={area} fill="var(--color-brand)" opacity="0.10" />
          <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.kg)} r="3.2" fill="var(--color-brand)" />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-[11px] text-muted-2">
        <span>{fmtDate(first.date)}</span>
        <span>{fmtDate(last.date)}</span>
      </div>
    </div>
  );
}
