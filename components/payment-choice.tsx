"use client";

import { useState } from "react";
import { useT } from "@/components/locale-provider";
import { CoachCheckoutButton } from "@/components/coach-checkout-button";
import { Card, MonoLabel } from "@/components/ui";
import { formatEuros } from "@/lib/config";

interface Props {
  offerName: string;
  /** « Nom · promesse » au-dessus du titre, si le produit en a une. */
  eyebrow: string;
  pitch: string;
  bullets: string[];
  onceCents: number | null;
  monthlyCents: number | null;
  months: number;
  /** Préférence enregistrée à l'inscription. */
  initialMode: "once" | "month";
  /** « soit X/mois sur 3 mois », pour le paiement en une fois. */
  perMonthEq: string | null;
}

/**
 * La page de paiement d'un programme : en une fois, ou en N mensualités.
 *
 * Le client a déjà choisi sur la page de vente ; il peut encore changer ici,
 * parce que c'est ici qu'il sort sa carte. En mensualités, on répète combien
 * de paiements et que ça s'arrête tout seul : c'est la promesse, elle doit
 * être lisible au moment de payer.
 */
export function PaymentChoice({ offerName, eyebrow, pitch, bullets, onceCents, monthlyCents, months, initialMode, perMonthEq }: Props) {
  const t = useT();
  const hasOnce = onceCents != null && onceCents > 0;
  const hasMonthly = monthlyCents != null && monthlyCents > 0;
  const both = hasOnce && hasMonthly;
  const [mode, setMode] = useState<"once" | "month">(hasOnce && (initialMode === "once" || !hasMonthly) ? "once" : "month");
  const once = mode === "once" && hasOnce;
  const amount = once ? onceCents! : monthlyCents!;

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-6 py-4">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">{eyebrow}</MonoLabel>
        {both ? (
          <div className="inline-flex self-start rounded-full border border-line-4 p-1" role="group" aria-label={t("payment.choosePayment")}>
            {(["once", "month"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={[
                  "tap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  mode === m ? "bg-brand text-white" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {m === "once" ? t("payment.payOnce") : t("payment.payInstallments", { n: months })}
              </button>
            ))}
          </div>
        ) : null}
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {once ? t("payment.once", { price: formatEuros(amount) }) : t("payment.installmentsHeadline", { n: months, amount: formatEuros(amount) })}
        </h1>
        {once && perMonthEq ? <p className="text-[14px] text-muted-2">{perMonthEq}</p> : null}
        {!once ? (
          <p className="text-[14px] text-muted-2">{t("payment.installmentsTotal", { total: formatEuros(amount * months) })}</p>
        ) : null}
        <p className="text-[15px] leading-[1.6] text-muted">{pitch}</p>
      </header>

      {bullets.length > 0 ? (
        <Card className="flex flex-col gap-3">
          {bullets.map((b) => (
            <div key={b} className="flex items-start gap-2.5 text-[14.5px] text-body">
              <span className="text-brand mt-0.5" aria-hidden>✓</span>
              <span>{b}</span>
            </div>
          ))}
        </Card>
      ) : null}

      <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[13px] leading-[1.6] text-body">
        {once ? t("payment.onceBody") : t("payment.installmentsBody", { n: months, amount: formatEuros(amount) })}
      </div>

      <CoachCheckoutButton
        priceLabel={formatEuros(amount)}
        allowPromo={once}
        mode={mode}
        ctaLabel={once ? undefined : t("payment.payInstallmentsCta", { amount: formatEuros(amount), n: months })}
      />
      <span className="sr-only">{offerName}</span>
    </div>
  );
}
