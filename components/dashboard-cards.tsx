import type { ReactNode } from "react";
import { Card, MonoLabel } from "@/components/ui";
import type { MonthPoint } from "@/lib/dashboard-math";
import { fmtLocale } from "@/lib/i18n/request";

/**
 * Briques du tableau de bord. Tout est rendu côté serveur : ces écrans se
 * lisent, ils ne se manipulent pas, donc rien ne justifie d'envoyer du
 * JavaScript au navigateur pour les afficher.
 */

/** Chiffre principal d'une carte, avec sa variation par rapport au mois d'avant. */
export function KeyFigure({
  label,
  value,
  hint,
  trend,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Variation en pourcentage. `null` ou absent : rien ne s'affiche. */
  trend?: number | null;
  accent?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1.5">
      <MonoLabel>{label}</MonoLabel>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <span
          className={[
            "font-archivo text-[30px] font-extrabold leading-none tracking-[-0.03em]",
            accent ? "text-brand" : "text-ink",
          ].join(" ")}
        >
          {value}
        </span>
        {trend != null ? <Trend pct={trend} /> : null}
      </div>
      {hint ? <div className="text-[12.5px] leading-[1.55] text-muted">{hint}</div> : null}
    </Card>
  );
}

/** Variation mois sur mois. Le signe porte l'information, pas seulement la couleur. */
function Trend({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 font-mono text-[11px] tracking-[0.04em]",
        up ? "bg-brand/10 text-brand" : "bg-alert text-alert-ink",
      ].join(" ")}
    >
      {up ? "+" : ""}
      {pct} %
    </span>
  );
}

/**
 * Histogramme des six derniers mois, en CSS pur.
 *
 * Les barres sont proportionnelles au plus haut mois de la série, pas à un
 * maximum absolu : ce qu'un coach veut voir, c'est la forme de sa courbe, pas
 * sa place dans un classement imaginaire. Un mois vide garde une barre
 * résiduelle visible, sinon la colonne disparaît et on croit à un trou de
 * données plutôt qu'à un mois sans vente.
 */
export function MonthBars({
  points,
  metric,
  title,
  format,
}: {
  points: readonly MonthPoint[];
  metric: "clients" | "oneTimeCents";
  title: string;
  format: (n: number) => string;
}) {
  const values = points.map((p) => p[metric]);
  const max = Math.max(1, ...values);
  return (
    <Card className="flex flex-col gap-3.5">
      <MonoLabel>{title}</MonoLabel>
      <div className="flex items-end gap-2 sm:gap-3">
        {points.map((p, i) => {
          const v = values[i];
          const h = Math.max(3, Math.round((v / max) * 100));
          return (
            <div key={p.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="font-mono text-[10.5px] tabular-nums text-muted-2">{v > 0 ? format(v) : ""}</span>
              <div className="flex h-[92px] w-full items-end">
                <div
                  className="w-full rounded-t-[4px] transition-[height] duration-500 [transition-timing-function:var(--ease-out-soft)]"
                  style={{ height: `${h}%`, background: v > 0 ? "var(--color-brand)" : "var(--color-line-4)" }}
                />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">{monthLabel(p.month)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** « 2026-09 » devient « SEPT ». Le tableau tient sur un téléphone. */
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return d.toLocaleDateString(fmtLocale(), { month: "short", timeZone: "UTC" }).replace(".", "");
}

/** Liste ordonnée avec une barre de proportion : offres, paliers. */
export function RankList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: readonly { name: string; note: string; value: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="flex flex-col gap-3.5">
      <MonoLabel>{title}</MonoLabel>
      {rows.length === 0 ? (
        <p className="text-[13.5px] leading-[1.6] text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.name} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[14px] font-semibold text-ink">{r.name}</span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">{r.note}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-pill bg-line-2">
                <div
                  className="h-full rounded-pill bg-brand"
                  style={{ width: `${Math.max(2, Math.round((r.value / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Jauge de remplissage (places clients consommées). */
export function FillBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit == null) return null;
  const pct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-pill bg-line-2">
      <div
        className="h-full rounded-pill transition-[width] duration-500 [transition-timing-function:var(--ease-out-soft)]"
        style={{ width: `${pct}%`, background: pct >= 100 ? "var(--color-alert-ink)" : "var(--color-brand)" }}
      />
    </div>
  );
}
