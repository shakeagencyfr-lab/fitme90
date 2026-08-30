"use client";

import { useState } from "react";
import Link from "next/link";
import { formatEuros } from "@/lib/config";
import { S } from "@/components/landing-icons";

interface Props {
  slug: string;
  offerId: string;
  priceMonthCents: number | null;
  priceYearCents: number | null;
  chargesEnabled: boolean;
}

// Bloc prix + CTA d'une offre en ABONNEMENT sur la landing. Toggle mensuel /
// annuel avec comparateur d'économies quand les deux prix existent.
export function SubscriptionPrice({ slug, offerId, priceMonthCents, priceYearCents, chargesEnabled }: Props) {
  const hasMonth = priceMonthCents != null;
  const hasYear = priceYearCents != null;
  const both = hasMonth && hasYear;
  const [interval, setInterval] = useState<"month" | "year">(hasMonth ? "month" : "year");

  const cents = interval === "year" ? priceYearCents : priceMonthCents;
  const suffix = interval === "year" ? "/an" : "/mois";

  // Économie annuelle vs 12 mensualités.
  let savingPct = 0;
  if (both && priceMonthCents! > 0) {
    savingPct = Math.round((1 - priceYearCents! / (priceMonthCents! * 12)) * 100);
  }

  return (
    <div className="flex flex-col gap-4">
      {both ? (
        <div className="inline-flex self-start rounded-full border border-white/15 p-1">
          {(["month", "year"] as const).map((it) => (
            <button
              type="button"
              key={it}
              onClick={() => setInterval(it)}
              className={[
                "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                interval === it ? "bg-brand text-white" : "text-white/70 hover:text-white",
              ].join(" ")}
            >
              {it === "month" ? "Mensuel" : "Annuel"}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <span className="font-archivo text-[clamp(40px,7vw,56px)] font-extrabold leading-none tracking-[-0.03em] text-white">
          {formatEuros(cents)}
        </span>
        <span className="pb-2 text-[13px] text-white/55">{suffix}</span>
      </div>

      {both && interval === "year" && savingPct > 0 ? (
        <span className="self-start rounded-pill bg-brand/15 px-2.5 py-1 text-[12px] font-semibold text-brand">
          Tu économises {savingPct}% vs mensuel
        </span>
      ) : null}
      {both && interval === "month" && savingPct > 0 ? (
        <span className="self-start text-[12px] text-white/55">
          Passe à l&apos;annuel et économise {savingPct}%.
        </span>
      ) : null}

      {chargesEnabled ? (
        <Link
          href={`/inscription?c=${slug}&offer=${offerId}&interval=${interval}`}
          className="tap mt-1 inline-flex h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-btn bg-brand px-5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
        >
          Choisir ce programme
          <S.arrow className="h-4.5 w-4.5 shrink-0" />
        </Link>
      ) : (
        <span className="mt-1 inline-flex h-[52px] items-center justify-center rounded-btn border border-white/15 px-6 text-[14px] text-white/50">
          Bientôt disponible
        </span>
      )}
    </div>
  );
}
