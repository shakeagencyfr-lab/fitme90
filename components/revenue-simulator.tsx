"use client";

import { usePhrase } from "@/components/locale-provider";

import { useState } from "react";

// Simulateur de revenus interactif (curseurs). Réutilisable :
// - côté coach : nb de clients × prix mensuel → revenu.
// - côté revendeur : nb de coachs × marge par coach → revenu.
// Chiffres purement illustratifs (l'utilisateur fixe ses propres valeurs).

function euros(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

export function RevenueSimulator({
  countLabel = "Nombre de clients actifs",
  countUnit = "clients",
  priceLabel = "Prix mensuel par client",
  countMin = 1,
  countMax = 150,
  countDefault = 25,
  priceMin = 10,
  priceMax = 300,
  priceStep = 5,
  priceDefault = 49,
  note = "Estimation illustrative. À toi de fixer tes tarifs et ton volume.",
  aiNote,
}: {
  countLabel?: string;
  countUnit?: string;
  priceLabel?: string;
  countMin?: number;
  countMax?: number;
  countDefault?: number;
  priceMin?: number;
  priceMax?: number;
  priceStep?: number;
  priceDefault?: number;
  note?: string;
  /** Ligne informative sur le coût IA (BYOK), affichée sous le résultat. */
  aiNote?: string;
}) {
  const tx = usePhrase();
  const [count, setCount] = useState(countDefault);
  const [price, setPrice] = useState(priceDefault);
  const monthly = count * price;
  const yearly = monthly * 12;
  const pct = (v: number, min: number, max: number) => ((v - min) / (max - min)) * 100;

  const rangeStyle = (v: number, min: number, max: number) =>
    ({
      background: `linear-gradient(90deg, var(--color-brand) ${pct(v, min, max)}%, rgba(255,255,255,0.12) ${pct(v, min, max)}%)`,
    }) as React.CSSProperties;

  return (
    <div className="mx-auto max-w-[880px] overflow-hidden rounded-[26px] border border-white/12 bg-white/[0.03] p-6 sm:p-9">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        {/* Curseurs */}
        <div className="flex flex-col gap-7">
          <label className="flex flex-col gap-2.5">
            <span className="flex items-baseline justify-between">
              <span className="text-[14px] font-medium text-white/70">{countLabel}</span>
              <span className="font-archivo text-[20px] font-extrabold text-white">
                {count} <span className="text-[13px] font-medium text-white/45">{countUnit}</span>
              </span>
            </span>
            <input
              type="range"
              min={countMin}
              max={countMax}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              style={rangeStyle(count, countMin, countMax)}
              className="rl-range h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
            />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className="flex items-baseline justify-between">
              <span className="text-[14px] font-medium text-white/70">{priceLabel}</span>
              <span className="font-archivo text-[20px] font-extrabold text-white">{euros(price)}</span>
            </span>
            <input
              type="range"
              min={priceMin}
              max={priceMax}
              step={priceStep}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={rangeStyle(price, priceMin, priceMax)}
              className="rl-range h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
            />
          </label>
        </div>

        {/* Résultat */}
        <div className="rounded-[20px] border border-brand/25 bg-gradient-to-b from-brand/[0.12] to-transparent p-6 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand">{tx("Revenu mensuel estimé")}</div>
          <div className="mt-2 font-archivo text-[clamp(34px,7vw,52px)] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
            {euros(monthly)}
          </div>
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="text-[13px] text-white/55">{tx("soit sur un an")}</div>
            <div className="mt-1 font-archivo text-[24px] font-extrabold tracking-[-0.02em] text-brand tabular-nums">{euros(yearly)}</div>
          </div>
        </div>
      </div>
      {aiNote ? (
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-brand/25 bg-brand/[0.07] px-4 py-3 text-[13px] leading-[1.5] text-white/80">
          <svg viewBox="0 0 24 24" width="18" height="18" className="mt-0.5 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3l1.6 4L18 8.5l-4 3 1 4.5-3-2.4-3 2.4 1-4.5-4-3L10.4 7z" />
          </svg>
          <span>{aiNote}</span>
        </div>
      ) : null}
      <p className="mt-4 text-center text-[12.5px] text-white/40">{note}</p>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .rl-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:22px; height:22px; border-radius:9999px; background:#fff; border:4px solid var(--color-brand); cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.4); transition:transform .1s }
        .rl-range::-webkit-slider-thumb:active { transform:scale(1.12) }
        .rl-range::-moz-range-thumb { width:22px; height:22px; border-radius:9999px; background:#fff; border:4px solid var(--color-brand); cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.4) }
        .rl-range::-moz-range-track { background:transparent }
      `,
        }}
      />
    </div>
  );
}
