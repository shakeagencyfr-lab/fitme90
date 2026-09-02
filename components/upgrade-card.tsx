"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { formatEuros, monthlyEquivalentCents } from "@/lib/config";
import { useT } from "@/components/locale-provider";

interface Props {
  /** Séances validées / dues depuis le début (chiffres réels du client). */
  done: number;
  due: number;
  /** Évolution du poids depuis le départ, en kg (null si inconnue). */
  weightDelta: number | null;
  offerName: string;
  twelveMonthCents: number;
  alreadyPaidCents: number;
  dueCents: number;
  /** Jours restants sur le 3 mois (0 en période de consultation). */
  daysLeft: number;
}

/**
 * Semaine 10 : le client voit ses résultats, on lui propose de prolonger sur
 * 12 mois en déduisant ce qu'il a déjà payé. Il ne rachète pas, il continue.
 */
export function UpgradeCard(p: Props) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const perMonth = monthlyEquivalentCents(p.twelveMonthCents, 12);

  async function go() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coach/upgrade", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; applied?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || t("upgrade.unavailable"));
      if (data.applied) {
        router.replace("/app?upgrade=1");
        router.refresh();
        return;
      }
      if (!data.url) throw new Error(t("payment.unavailable"));
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("upgrade.unavailable"));
      setBusy(false);
    }
  }

  const proof: string[] = [];
  if (p.due > 0) proof.push(t("upgrade.sessionsDone", { done: p.done, due: p.due }));
  if (p.weightDelta != null && p.weightDelta !== 0) {
    proof.push(t("upgrade.weightSince", { delta: `${p.weightDelta > 0 ? "+" : ""}${p.weightDelta.toFixed(1)}` }));
  }

  return (
    <Card className="relative flex flex-col gap-4 overflow-hidden border-brand/40">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-brand" />
      <div className="flex flex-col gap-1">
        <MonoLabel className="text-brand">{t("upgrade.eyebrow")}</MonoLabel>
        <h2 className="font-archivo font-extrabold text-[22px] leading-[1.1] tracking-[-0.02em] text-ink">
          {p.daysLeft > 0 ? t("upgrade.daysLeft", { days: p.daysLeft }) : t("upgrade.over")}
        </h2>
        {proof.length ? (
          <p className="text-[14px] leading-[1.6] text-body">{proof.join(" · ")}. {t("upgrade.keep")}</p>
        ) : null}
      </div>

      <p className="text-[14px] leading-[1.6] text-muted">{t("upgrade.pitch", { offer: p.offerName })}</p>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-1 rounded-control border border-line-4 bg-surface-2 px-4 py-3">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{t("upgrade.remaining")}</span>
          <span className="font-archivo text-[28px] font-extrabold leading-none tracking-[-0.02em] text-ink">
            {formatEuros(p.dueCents)}
          </span>
        </div>
        <span className="pb-1 text-[12.5px] leading-[1.5] text-muted">
          {t("upgrade.breakdown", { total: formatEuros(p.twelveMonthCents), paid: formatEuros(p.alreadyPaidCents) })}
          {perMonth > 0 ? ` ${t("upgrade.perMonth", { amount: formatEuros(perMonth) })}` : ""}
        </span>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      <Button onClick={go} loading={busy} className="h-[50px] self-start px-6 text-[15.5px]">
        {t("upgrade.cta")}
      </Button>
    </Card>
  );
}
