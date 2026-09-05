"use client";

import { useState, useTransition } from "react";
import { useLocale, useT } from "@/components/locale-provider";
import { dateLocale, type Locale } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { cancelSubscription, startCardUpdate } from "@/app/app/profil/actions";
import { formatEuros } from "@/lib/config";
import { Card, Button, Alert, MonoLabel } from "@/components/ui";
import type { Schedule } from "@/lib/installments";

export type BillingKind = "internal" | "none" | "once" | "installments" | "legacy";

interface Props {
  kind: BillingKind;
  /** Paiement en une fois : date de l'encaissement. */
  paidAt?: string | null;
  /** Mensualités : l'échéancier reconstitué. */
  schedule?: Schedule | null;
  /** Statut Stripe de l'abonnement (mensualités ou abonnement d'avant). */
  status?: string | null;
  interval?: string | null;
  periodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  paidInFull?: boolean;
  /** Une carte peut être changée (un client Stripe existe). */
  canChangeCard?: boolean;
  notice?: "card_updated" | "card_failed" | null;
}

const fmtDate = (iso: string | null | undefined, locale: Locale) =>
  iso ? new Date(iso).toLocaleDateString(dateLocale(locale), { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }) : null;

/**
 * « Ma facturation », dans l'espace client.
 *
 * Un client doit pouvoir répondre seul à « qu'est-ce qu'on va me prélever, et
 * quand ? ». Payé en une fois : rien à venir. Compte tenu par le coach : rien
 * à venir non plus, c'est le coach qui encaisse. Mensualités : l'échéancier,
 * combien sont passées, la prochaine, la dernière, et le moyen de changer de
 * carte sans appeler personne.
 */
export function BillingCard({
  kind,
  paidAt,
  schedule,
  status,
  interval,
  periodEnd,
  cancelAtPeriodEnd,
  paidInFull = false,
  canChangeCard = false,
  notice = null,
}: Props) {
  const t = useT();
  const locale = useLocale();

  return (
    <Card className="flex flex-col gap-3">
      <MonoLabel>{t("sub.billingTitle")}</MonoLabel>
      {notice === "card_updated" ? <Alert tone="info">{t("sub.cardUpdated")}</Alert> : null}
      {notice === "card_failed" ? <Alert>{t("sub.cardFailed")}</Alert> : null}

      {kind === "internal" ? (
        <p className="text-[14px] leading-relaxed text-body">
          {t("sub.noUpcoming")} {t("sub.managedByCoach")}
        </p>
      ) : kind === "once" ? (
        <p className="text-[14px] leading-relaxed text-body">
          {paidAt ? <>{t("sub.paidOnce", { date: fmtDate(paidAt, locale) ?? "" })} </> : null}
          {t("sub.noUpcoming")}
        </p>
      ) : kind === "installments" && schedule ? (
        <Installments
          schedule={schedule}
          status={status ?? null}
          cancelAtPeriodEnd={cancelAtPeriodEnd}
          periodEnd={periodEnd ?? null}
          paidInFull={paidInFull}
          canChangeCard={canChangeCard}
        />
      ) : kind === "legacy" ? (
        <Legacy interval={interval ?? null} periodEnd={periodEnd ?? null} cancelAtPeriodEnd={cancelAtPeriodEnd} />
      ) : (
        <p className="text-[14px] leading-relaxed text-body">{t("sub.noUpcoming")}</p>
      )}
    </Card>
  );
}

function Installments({
  schedule,
  status,
  cancelAtPeriodEnd,
  periodEnd,
  paidInFull,
  canChangeCard,
}: {
  schedule: Schedule;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  paidInFull: boolean;
  canChangeCard: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const done = paidInFull || schedule.done;
  const stopped = cancelAtPeriodEnd && !done;
  const failing = status === "past_due" || status === "unpaid";
  const amount = formatEuros(schedule.monthlyCents);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] leading-relaxed text-body">
        {t("sub.schedule", { n: schedule.count, amount, total: formatEuros(schedule.totalCents) })}{" "}
        {done ? (
          t("sub.completed")
        ) : stopped ? (
          t("sub.stopped", { date: fmtDate(periodEnd, locale) ?? t("sub.periodEnd") })
        ) : (
          <>
            {t("sub.paidCount", { paid: schedule.paid, n: schedule.count })}{" "}
            {schedule.nextAt ? t("sub.nextInstallment", { date: fmtDate(schedule.nextAt, locale) ?? "" }) : null}{" "}
            {t("sub.lastInstallment", { date: fmtDate(schedule.lastAt, locale) ?? "" })}
          </>
        )}
      </p>

      {/* La progression, en clair : k mensualités passées sur N. */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: schedule.count }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < schedule.paid ? "bg-brand" : "bg-line-4"}`} />
        ))}
      </div>

      {failing && !done ? <Alert>{t("sub.pastDue")}</Alert> : null}

      {!done ? (
        <div className="flex flex-wrap items-center gap-3">
          {canChangeCard ? <ChangeCardButton /> : null}
          {!stopped ? <StopInstallments periodEnd={periodEnd} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function ChangeCardButton() {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        loading={pending}
        className="h-10"
        onClick={() =>
          start(async () => {
            setError("");
            const res = await startCardUpdate();
            if (res.url) window.location.href = res.url;
            else setError(res.error ?? t("sub.cardFailed"));
          })
        }
      >
        {t("sub.changeCard")}
      </Button>
      {error ? <span className="text-[12.5px] text-[#C4471A]">{error}</span> : null}
    </div>
  );
}

/** Arrêter les mensualités restantes : l'accès s'arrête avec le mois déjà payé. */
function StopInstallments({ periodEnd }: { periodEnd: string | null }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const end = fmtDate(periodEnd, locale);

  function confirm() {
    setError("");
    start(async () => {
      const res = await cancelSubscription();
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? t("sub.failed"));
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-muted-2 underline underline-offset-2 hover:text-ink"
      >
        {t("sub.stopCta")}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button aria-label={t("common.close")} onClick={() => !pending && setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div className="relative z-10 flex w-full max-w-[440px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
            <h2 className="font-archivo font-extrabold text-[20px] tracking-[-0.02em] text-ink">{t("sub.stopConfirmTitle")}</h2>
            <p className="text-[14px] leading-relaxed text-body">{t("sub.stopConfirmBody", { when: end ? ` (${end})` : "" })}</p>
            {error ? <Alert>{error}</Alert> : null}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button type="button" onClick={confirm} loading={pending} className="h-11">
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
    </>
  );
}

/** Abonnement d'avant (mensuel ou annuel, sans terme) : le comportement historique. */
function Legacy({ interval, periodEnd, cancelAtPeriodEnd }: { interval: string | null; periodEnd: string | null; cancelAtPeriodEnd: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [doneAt, setDoneAt] = useState<string | null>(null);
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
    <>
      {canceled ? (
        <p className="text-[14px] leading-relaxed text-body">
          {t("sub.canceledBody", { cadence, date: fmtDate(doneAt, locale) ?? end ?? t("sub.periodEnd") })}
        </p>
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
            <p className="text-[14px] leading-relaxed text-body">{t("sub.confirmBody", { cadence, when: end ? ` (${end})` : "" })}</p>
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
    </>
  );
}
