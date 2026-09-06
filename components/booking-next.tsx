import Link from "next/link";
import type { TFn } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { humanDate, humanTime, dayKey, shiftDayKey } from "@/lib/booking-time";
import { awaitingPayment, type Booking } from "@/lib/booking-model";
import { Card, MonoLabel } from "@/components/ui";

// Le prochain rendez-vous en présentiel, sur l'accueil du client.
//
// POURQUOI. Ses rendez-vous vivaient dans un onglet, lui-même caché dans le
// menu « Plus » : le client réservait, puis n'en voyait plus la trace en
// ouvrant l'app. Un rendez-vous qu'on oublie est un rendez-vous manqué, et
// c'est le coach qui perd l'heure.

export function BookingNext({
  upcoming,
  timezone,
  locale,
  t,
  now,
}: {
  upcoming: Booking[];
  timezone: string;
  locale: Locale;
  t: TFn;
  now?: Date;
}) {
  const next = upcoming[0];
  if (!next) return null;
  const start = new Date(next.starts_at);
  const today = dayKey(now ?? new Date(), timezone);
  const k = dayKey(start, timezone);
  // « aujourd'hui » et « demain » plutôt qu'une date : c'est ce qu'on retient.
  const quand = k === today ? t("booking.whenToday") : k === shiftDayKey(today, 1) ? t("booking.whenTomorrow") : humanDate(start, timezone, locale);
  const aPayer = awaitingPayment(next);

  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-control bg-brand/10 text-brand">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z" />
            <path d="M5 10h14M9 3v4M15 3v4" />
          </svg>
        </span>
        <MonoLabel>{t("booking.nextTitle")}</MonoLabel>
      </div>

      <p className="font-archivo text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
        {next.service_name}
      </p>
      <p className="text-[14.5px] text-body">
        <span className="font-semibold capitalize">{quand}</span> {t("dates.at")} {humanTime(start, timezone, locale)}
      </p>

      {aPayer ? (
        <p className="text-[13px] font-semibold text-alert-ink">{t("booking.stAwaitingPayment")}</p>
      ) : next.status === "pending" ? (
        <p className="text-[13px] text-muted">{t("booking.stPending")}</p>
      ) : null}

      <Link href="/app/reservation" className="tap w-fit text-[13.5px] font-semibold text-brand hover:underline">
        {upcoming.length > 1 ? `${t("booking.seeAll")} (${upcoming.length})` : t("booking.seeAll")}
      </Link>
    </Card>
  );
}
