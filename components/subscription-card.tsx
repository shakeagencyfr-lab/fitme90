"use client";

import { useState, useTransition } from "react";
import { useLocale, useT } from "@/components/locale-provider";
import { dateLocale, type Locale } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { cancelSubscription } from "@/app/app/profil/actions";
import { Card, Button, Alert, MonoLabel } from "@/components/ui";

interface Props {
  interval: string | null; // 'month' | 'year'
  periodEnd: string | null; // ISO
  cancelAtPeriodEnd: boolean;
}

const fmtDate = (iso: string | null, locale: Locale) =>
  iso ? new Date(iso).toLocaleDateString(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : null;

export function SubscriptionCard({ interval, periodEnd, cancelAtPeriodEnd }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [doneAt, setDoneAt] = useState<string | null>(null);

  const t = useT();
  const locale = useLocale();
  const cadence = interval === "year" ? t("sub.yearly") : t("sub.monthly");
  const end = fmtDate(periodEnd, locale);
  const canceled = cancelAtPeriodEnd || doneAt != null;

  function confirmCancel() {
    setError("");
    start(async () => {
      const res = await cancelSubscription();
      if (res.ok) {
        setDoneAt(res.endsAt ?? periodEnd ?? null);
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? t("sub.failed"));
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <MonoLabel>{t("sub.title")}</MonoLabel>

      {canceled ? (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            {t("sub.canceledBody", { cadence, date: fmtDate(doneAt, locale) ?? end ?? t("sub.periodEnd") })}
          </p>
        </>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            {t("sub.activeBody", { cadence })}
            {end ? <> {t("sub.nextDue", { date: end })}</> : null} {t("sub.noCommitment")}
          </p>
          {error ? <Alert>{error}</Alert> : null}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="self-start text-[13px] font-semibold text-muted-2 underline underline-offset-2 hover:text-ink"
          >
            {t("sub.cancelCta")}
          </button>
        </>
      )}

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button aria-label={t("common.close")} onClick={() => !pending && setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
            <h2 className="font-archivo font-extrabold text-[20px] tracking-[-0.02em] text-ink">{t("sub.confirmTitle")}</h2>
            <p className="text-[14px] leading-relaxed text-body">
              {t("sub.confirmBody", { cadence, when: end ? ` (${end})` : "" })}
            </p>
            {error ? <Alert>{error}</Alert> : null}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button type="button" onClick={confirmCancel} loading={pending} className="h-11">
                {t("sub.confirmYes")}
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="tap rounded-btn border border-line-4 px-4 py-2.5 text-[14px] font-semibold text-body hover:border-ink disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
