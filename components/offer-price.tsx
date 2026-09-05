"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { formatEuros } from "@/lib/config";
import { S } from "@/components/landing-icons";

export interface OfferPriceLabels {
  /** « paiement unique », sous le prix en une fois. */
  oneTime: string;
  /** « soit X/mois sur N mois », sous le prix en une fois (null sans équivalent). */
  perMonthOn: string | null;
  /** Bascule : « En 1 fois ». */
  payOnce: string;
  /** Bascule : « En N fois ». */
  payInstallments: string;
  /** Suffixe du prix mensuel : « /mois × N ». */
  perMonthTimes: string;
  /** « N paiements, puis plus rien : l'arrêt est automatique. » */
  autoStop: string;
  /** « soit X au total sur N mois » (null sans mensualité). */
  totalOver: string | null;
  choose: string;
  soon: string;
}

interface Props {
  slug: string;
  offerId: string;
  /** Prix en une fois, ou null si l'offre ne le propose pas. */
  onceCents: number | null;
  /** Mensualité, ou null si l'offre ne le propose pas. */
  monthlyCents: number | null;
  /** Nombre de mensualités = durée du programme en mois. */
  months: number;
  chargesEnabled: boolean;
  /** Habillage selon le fond du template : sombre (défaut) ou clair. */
  variant?: "dark" | "light";
  labels: OfferPriceLabels;
  /** Ce qui s'affiche entre le prix et le bouton : la liste des inclusions. */
  children?: ReactNode;
}

/**
 * Le prix d'un programme sur la page de vente, et la façon de le payer.
 *
 * Un programme se paie EN UNE FOIS ou EN N MENSUALITÉS, N étant sa durée. La
 * bascule n'apparaît que si le coach a fixé les deux prix : sinon elle
 * promettrait un choix qui n'existe pas. En mensualités, on écrit noir sur
 * blanc combien de paiements, et que ça s'arrête tout seul : c'est ce qui
 * distingue un programme d'un abonnement, et c'est ce qui rassure.
 *
 * Le bouton emporte le choix jusqu'à l'inscription (`interval=once|month`),
 * et la page de paiement le retrouve.
 */
export function OfferPrice({
  slug,
  offerId,
  onceCents,
  monthlyCents,
  months,
  chargesEnabled,
  variant = "dark",
  labels,
  children,
}: Props) {
  const hasOnce = onceCents != null && onceCents > 0;
  const hasMonthly = monthlyCents != null && monthlyCents > 0;
  const both = hasOnce && hasMonthly;
  const [mode, setMode] = useState<"once" | "month">(hasOnce ? "once" : "month");
  const light = variant === "light";

  const toggleBorder = light ? "border-black/10" : "border-white/15";
  const toggleInactive = light ? "text-ink/60 hover:text-ink" : "text-white/70 hover:text-white";
  const priceColor = light ? "text-ink" : "text-white";
  const priceSuffix = light ? "text-ink/50" : "text-white/55";
  const softNote = light ? "text-ink/55" : "text-white/55";
  const disabledCta = light ? "border-black/10 text-ink/40" : "border-white/15 text-white/50";

  const once = mode === "once" && hasOnce;

  return (
    <>
      <div className="flex flex-col gap-3">
        {both ? (
          <div className={`inline-flex self-start rounded-full border ${toggleBorder} p-1`} role="group">
            {(["once", "month"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={[
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  mode === m ? "bg-brand text-white" : toggleInactive,
                ].join(" ")}
              >
                {m === "once" ? labels.payOnce : labels.payInstallments}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <span className={`font-archivo text-[clamp(40px,7vw,56px)] font-extrabold leading-none tracking-[-0.03em] ${priceColor}`}>
            {formatEuros(once ? onceCents : monthlyCents)}
          </span>
          <span className={`pb-2 text-[13px] ${priceSuffix}`}>{once ? labels.oneTime : labels.perMonthTimes}</span>
        </div>

        {once ? (
          labels.perMonthOn ? <span className={`text-[13px] ${softNote}`}>{labels.perMonthOn}</span> : null
        ) : (
          <div className="flex flex-col gap-0.5">
            {labels.totalOver ? <span className={`text-[13px] ${softNote}`}>{labels.totalOver}</span> : null}
            <span className="self-start rounded-pill bg-brand/15 px-2.5 py-1 text-[12px] font-semibold text-brand">
              {labels.autoStop}
            </span>
          </div>
        )}
      </div>

      {children}

      {chargesEnabled ? (
        <Link
          href={`/inscription?c=${slug}&offer=${offerId}&interval=${once ? "once" : "month"}`}
          className="tap inline-flex h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-btn bg-brand px-5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
        >
          {labels.choose}
          <S.arrow className="h-4.5 w-4.5 shrink-0" />
        </Link>
      ) : (
        <span className={`inline-flex h-[52px] items-center justify-center rounded-btn border px-6 text-[14px] ${disabledCta}`}>
          {labels.soon}
        </span>
      )}
      {/* `months` reste dans les libellés : le nombre est déjà écrit dedans. */}
      <span className="sr-only">{months}</span>
    </>
  );
}
