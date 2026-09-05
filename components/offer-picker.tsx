"use client";

import { useActionState } from "react";
import { useT } from "@/components/locale-provider";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { chooseOffer, type ChooseOfferState } from "@/app/app/actions";
import { formatEuros } from "@/lib/config";

export interface PickableOffer {
  id: string;
  name: string;
  durationLabel: string;
  pitch: string | null;
  onceCents: number | null;
  monthlyCents: number | null;
  months: number;
}

/**
 * Le client n'a pas encore de programme : il choisit parmi ceux que son coach
 * met en vitrine. Une carte par programme, ses deux façons de payer en clair,
 * un bouton. L'étape suivante (une fois ou mensualités) reste la page de
 * paiement habituelle.
 */
export function OfferPicker({ offers }: { offers: PickableOffer[] }) {
  const t = useT();
  const [state, action, pending] = useActionState(chooseOffer, {} as ChooseOfferState);

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-6 py-4">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">{t("payment.pickEyebrow")}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {t("payment.pickTitle")}
        </h1>
        <p className="text-[15px] leading-[1.6] text-muted">{t("payment.pickBody")}</p>
      </header>

      {state.error ? <Alert>{state.error}</Alert> : null}

      <div className="flex flex-col gap-3">
        {offers.map((o) => {
          const once = o.onceCents != null && o.onceCents > 0;
          const monthly = o.monthlyCents != null && o.monthlyCents > 0;
          return (
            <Card key={o.id} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-archivo text-[18px] font-bold text-ink">{o.name}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">{o.durationLabel}</span>
                </div>
                {o.pitch ? <p className="text-[13.5px] leading-[1.55] text-muted">{o.pitch}</p> : null}
              </div>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 tabular-nums">
                {once ? (
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-archivo text-[22px] font-extrabold tracking-[-0.02em] text-ink">{formatEuros(o.onceCents!)}</span>
                    <span className="text-[12.5px] text-muted-2">{t("payment.payOnce").toLowerCase()}</span>
                  </span>
                ) : null}
                {once && monthly ? <span className="text-[12.5px] text-muted-2">{t("common.or")}</span> : null}
                {monthly ? (
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-archivo text-[22px] font-extrabold tracking-[-0.02em] text-ink">
                      {t("payment.installmentsHeadline", { n: o.months, amount: formatEuros(o.monthlyCents!) })}
                    </span>
                  </span>
                ) : null}
              </div>
              <form action={action}>
                <input type="hidden" name="offer_id" value={o.id} />
                <Button type="submit" full loading={pending} className="h-11">
                  {t("payment.pickCta", { name: o.name })}
                </Button>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
