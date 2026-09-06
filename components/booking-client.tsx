"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/locale-provider";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { bookSlotAction, cancelMyBookingAction, loadSlotsAction, payBookingAction } from "@/app/app/reservation/actions";
import { awaitingPayment, HOLD_MINUTES, type Booking } from "@/lib/booking-model";
import type { BookingService } from "@/lib/booking";
import type { SlotsResult } from "@/lib/booking-appointments";
import { clientCanCancel } from "@/lib/booking-rules";
import { humanDate, humanTime, shiftDayKey, dayKey, parseDayKey } from "@/lib/booking-time";
import { formatEuros } from "@/lib/config";
import { dateLocale, type Locale } from "@/lib/i18n";

// ------------------------------------------------------------------ *
// La prise de rendez-vous côté client, en quatre gestes : la prestation,
// avec qui (seulement s'il y a plusieurs plannings), le créneau, confirmer.
// Puis la liste de ses rendez-vous, avec paiement en attente, annulation
// dans le délai, et le passé.
//
// Les créneaux viennent du serveur, quatorze jours à la fois : ils sont
// recalculés à chaque fenêtre, jamais mis en cache, parce qu'un créneau vu
// il y a une minute peut avoir été pris entre-temps. La confirmation le
// revérifie encore, et la base tranche en dernier.
// ------------------------------------------------------------------ */

interface CalendarLite {
  id: string;
  name: string;
  color: string;
}

interface Props {
  services: BookingService[];
  calendars: CalendarLite[];
  settings: { payment: "none" | "required"; confirmation: "auto" | "manual"; cancelLimitHours: number; address: string; instructions: string };
  timezone: string;
  locale: Locale;
  upcoming: Booking[];
  past: Booking[];
  notice: "paid" | "payFailed" | "payCancelled" | null;
  canLog: boolean;
}

type Step = "service" | "calendar" | "slot" | "confirm" | "done";

export function BookingClient({ services, calendars, settings, timezone, locale, upcoming, past, notice, canLog }: Props) {
  const t = useT();
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<BookingService | null>(null);
  const [calendarId, setCalendarId] = useState<string | null>(null); // null = peu importe
  const [fromDay, setFromDay] = useState<string>(() => dayKey(new Date(), timezone));
  // Les créneaux, avec la clé de la demande qui les a produits : « en cours »
  // se lit par comparaison, sans état posé depuis l'effet. `reload` force
  // une nouvelle lecture après un créneau parti entre-temps.
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<{ key: string; data: SlotsResult | null; error: string }>({ key: "", data: null, error: "" });
  const [picked, setPicked] = useState<{ calendarId: string; startIso: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<"confirmed" | "pending" | null>(null);
  const [list, setList] = useState(upcoming);

  // Le navigateur du client peut être dans un autre fuseau que le coach : on
  // le dit, une fois, sous les créneaux.
  const browserTz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : timezone;

  const reqKey = step === "slot" && service ? `${service.id}|${calendarId ?? ""}|${fromDay}|${reload}` : "";
  const loading = !!reqKey && result.key !== reqKey;
  const slots = result.key === reqKey ? result.data : null;

  useEffect(() => {
    if (!reqKey || !service) return;
    let live = true;
    loadSlotsAction({ serviceId: service.id, calendarId, fromDay }).then((res) => {
      if (!live) return;
      if ("error" in res) setResult({ key: reqKey, data: null, error: res.error });
      else setResult({ key: reqKey, data: res, error: "" });
    });
    return () => {
      live = false;
    };
  }, [reqKey, service, calendarId, fromDay]);

  function chooseService(s: BookingService) {
    setService(s);
    setPicked(null);
    setStep(calendars.length > 1 ? "calendar" : "slot");
    if (calendars.length === 1) setCalendarId(calendars[0].id);
  }

  async function confirm() {
    if (!service || !picked) return;
    setBusy(true);
    setErr("");
    const res = await bookSlotAction({ serviceId: service.id, calendarId: picked.calendarId, startIso: picked.startIso, note });
    setBusy(false);
    if (res.error || !res.booking) {
      setErr(res.error || t("common.error"));
      // Le créneau est parti : on recharge la fenêtre.
      setPicked(null);
      setStep("slot");
      setReload((r) => r + 1);
      return;
    }
    if (res.payUrl) {
      window.location.href = res.payUrl;
      return;
    }
    setList((l) => [...l, res.booking!].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
    setDone(res.awaitingCoach ? "pending" : "confirmed");
    setStep("done");
  }

  async function pay(id: string) {
    setBusy(true);
    const res = await payBookingAction(id);
    setBusy(false);
    if (res.url) window.location.href = res.url;
    else setErr(res.error || t("common.error"));
  }

  async function cancel(id: string) {
    if (!window.confirm(t("booking.cancelConfirm"))) return;
    const before = list;
    setList((l) => l.filter((b) => b.id !== id));
    const res = await cancelMyBookingAction(id);
    if (!res.ok) {
      setList(before);
      setErr(res.error || t("common.error"));
    }
  }

  const reset = () => {
    setStep("service");
    setService(null);
    setPicked(null);
    setNote("");
    setDone(null);
    setErr("");
  };

  const when = (iso: string) => `${humanDate(new Date(iso), timezone, locale)} · ${humanTime(new Date(iso), timezone, locale)}`;
  const calName = (id: string) => calendars.find((c) => c.id === id)?.name ?? "";
  const priceLabel = (s: BookingService) => (s.price_cents != null ? formatEuros(s.price_cents) : t("booking.included"));

  return (
    <div className="flex flex-col gap-6">
      {notice === "paid" ? <Alert tone="info">{t("booking.paid")}</Alert> : null}
      {notice === "payFailed" ? <Alert>{t("booking.payFailed")}</Alert> : null}
      {notice === "payCancelled" ? <Alert tone="info">{t("booking.payCancelled")}</Alert> : null}

      {/* Prise de rendez-vous */}
      {canLog ? (
        <section className="flex flex-col gap-3">
          <MonoLabel>{t("booking.book")}</MonoLabel>
          <Card className="flex flex-col gap-4">
            <Steps step={step} hasCalendars={calendars.length > 1} t={t} />

            {step === "service" ? (
              <div className="flex flex-col gap-2">
                {services.length === 0 ? <p className="text-[13px] text-muted-2">{t("booking.closed")}</p> : null}
                {services.map((s) => (
                  <button key={s.id} type="button" onClick={() => chooseService(s)} className="tap flex items-center gap-3 rounded-control border border-line-4 px-3.5 py-3 text-left hover:border-ink">
                    <div className="min-w-0 flex-1">
                      <div className="font-archivo text-[15px] font-semibold text-ink">{s.name}</div>
                      {s.description ? <div className="text-[12.5px] leading-[1.45] text-muted">{s.description}</div> : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-archivo text-[14px] font-bold text-ink">{priceLabel(s)}</span>
                      <span className="text-[12px] text-muted-2">{t("booking.minutes", { n: s.duration_min })}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            {step === "calendar" ? (
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => { setCalendarId(null); setStep("slot"); }} className="tap rounded-control border border-line-4 px-3.5 py-3 text-left font-semibold text-ink hover:border-ink">
                  {t("booking.anyCalendar")}
                </button>
                {calendars.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setCalendarId(c.id); setStep("slot"); }} className="tap flex items-center gap-3 rounded-control border border-line-4 px-3.5 py-3 text-left hover:border-ink">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                    <span className="font-archivo text-[15px] font-semibold text-ink">{c.name}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {step === "slot" && service ? (
              <SlotPicker slots={slots} loading={loading} fromDay={fromDay} setFromDay={setFromDay} timezone={timezone} locale={locale} t={t} onPick={(calId, iso) => { setPicked({ calendarId: calId, startIso: iso }); setStep("confirm"); }} showCalendarName={!calendarId && calendars.length > 1} />
            ) : null}

            {step === "confirm" && service && picked ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-control bg-surface-2 p-3.5">
                  <div className="font-archivo text-[16px] font-bold text-ink">{service.name}</div>
                  <div className="text-[14px] text-body">
                    {when(picked.startIso)}
                    {calendars.length > 1 ? ` · ${t("booking.with", { name: calName(picked.calendarId) })}` : ""}
                  </div>
                  <div className="text-[13px] text-muted-2">
                    {t("booking.minutes", { n: service.duration_min })} · {priceLabel(service)}
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[12.5px] text-muted-2">{t("booking.note")}</span>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("booking.notePlaceholder")} className="h-11 w-full rounded-control border border-line-4 bg-surface px-3 text-[16px] text-ink" />
                </label>
                {settings.payment === "required" && (service.price_cents ?? 0) > 0 ? <p className="text-[12px] text-muted-2">{t("booking.holdInfo", { n: HOLD_MINUTES })}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={confirm} loading={busy} className="h-11">
                    {settings.payment === "required" && (service.price_cents ?? 0) > 0 ? t("booking.payAndConfirm", { price: formatEuros(service.price_cents!) }) : t("booking.confirm")}
                  </Button>
                  <Button variant="outline" onClick={() => { setPicked(null); setStep("slot"); }} disabled={busy} className="h-11">
                    {t("booking.change")}
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "done" ? (
              <div className="flex flex-col gap-3">
                <Alert tone="info">{done === "pending" ? t("booking.bookedPending") : t("booking.bookedConfirmed")}</Alert>
                <Button variant="outline" onClick={reset} className="h-11 self-start">
                  {t("booking.book")}
                </Button>
              </div>
            ) : null}

            {err || (step === "slot" && result.key === reqKey && result.error) ? <Alert>{err || result.error}</Alert> : null}
            {step !== "service" && step !== "done" ? (
              <button type="button" onClick={reset} className="tap self-start text-[12.5px] text-muted-2 underline hover:text-ink">
                {t("common.back")}
              </button>
            ) : null}
          </Card>
        </section>
      ) : null}

      {/* Mes rendez-vous */}
      <section className="flex flex-col gap-3">
        <MonoLabel>{t("booking.mine")}</MonoLabel>
        <Card className="flex flex-col gap-3">
          {list.length === 0 ? <p className="text-[13px] text-muted-2">{t("booking.none")}</p> : null}
          {list.map((b) => {
            const toPay = awaitingPayment(b);
            const canCancel = b.status === "pending" || clientCanCancel(new Date(b.starts_at), settings.cancelLimitHours);
            return (
              <div key={b.id} className="flex flex-col gap-2 border-b border-line-2 pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-archivo text-[15px] font-semibold text-ink">{b.service_name}</span>
                    <span className="text-[13.5px] text-body">
                      {when(b.starts_at)}
                      {calendars.length > 1 ? ` · ${t("booking.with", { name: calName(b.calendar_id) })}` : ""}
                    </span>
                  </div>
                  <StatusPill b={b} t={t} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {toPay ? (
                    <Button onClick={() => pay(b.id)} loading={busy} className="h-9">
                      {t("booking.pay")} · {formatEuros(b.price_cents!)}
                    </Button>
                  ) : null}
                  {canCancel ? (
                    <button type="button" onClick={() => cancel(b.id)} className="tap text-[13px] text-muted-2 underline hover:text-ink">
                      {t("booking.cancel")}
                    </button>
                  ) : (
                    <span className="text-[12px] text-muted-2">{t("booking.cancelTooLate", { n: settings.cancelLimitHours })}</span>
                  )}
                </div>
              </div>
            );
          })}
          {settings.address || settings.instructions ? (
            <div className="rounded-control bg-surface-2 p-3 text-[12.5px] leading-[1.55] text-muted">
              {settings.address ? (
                <div>
                  <span className="font-semibold text-body">{t("booking.where")} :</span> {settings.address}
                </div>
              ) : null}
              {settings.instructions ? (
                <div>
                  <span className="font-semibold text-body">{t("booking.instructions")} :</span> {settings.instructions}
                </div>
              ) : null}
            </div>
          ) : null}
          {browserTz !== timezone ? <p className="text-[11.5px] text-muted-2">{t("booking.tzNote", { tz: timezone })}</p> : null}
        </Card>

        {past.length > 0 ? (
          <details className="group">
            <summary className="tap cursor-pointer text-[13px] text-muted-2 hover:text-ink">{t("booking.past")} ({past.length})</summary>
            <Card className="mt-2 flex flex-col gap-2">
              {past.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line-2 pb-2 text-[13px] last:border-0 last:pb-0">
                  <span className="text-body">
                    {b.service_name} · {when(b.starts_at)}
                  </span>
                  <StatusPill b={b} t={t} />
                </div>
              ))}
            </Card>
          </details>
        ) : null}
      </section>
    </div>
  );
}

function Steps({ step, hasCalendars, t }: { step: Step; hasCalendars: boolean; t: (k: never, v?: Record<string, string | number>) => string }) {
  const tt = t as unknown as (k: string) => string;
  const steps = [
    ["service", tt("booking.step1")],
    ...(hasCalendars ? [["calendar", tt("booking.step2")]] : []),
    ["slot", tt("booking.step3")],
    ["confirm", tt("booking.step4")],
  ] as const;
  const idx = Math.max(0, steps.findIndex(([k]) => k === step));
  return (
    <ol className="flex flex-wrap gap-1.5">
      {steps.map(([k, label], i) => (
        <li key={k} className={["rounded-pill px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em]", i === idx || step === "done" ? "bg-brand text-white" : i < idx ? "bg-brand/10 text-brand" : "bg-surface-2 text-muted-2"].join(" ")}>
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function StatusPill({ b, t }: { b: Booking; t: (k: never) => string }) {
  const tt = t as unknown as (k: string) => string;
  const key = awaitingPayment(b) ? "stAwaitingPayment" : b.status === "confirmed" ? "stConfirmed" : b.status === "pending" ? "stPending" : b.status === "cancelled" ? "stCancelled" : b.status === "done" ? "stDone" : "stNoShow";
  const tone = key === "stConfirmed" || key === "stDone" ? "bg-[#2F6B3C]/10 text-[#2F6B3C]" : key === "stAwaitingPayment" ? "bg-brand/10 text-brand" : key === "stPending" ? "bg-surface-2 text-body" : "bg-surface-2 text-muted-2";
  return <span className={["rounded-pill px-2.5 py-1 text-[11.5px] font-semibold", tone].join(" ")}>{tt(`booking.${key}`)}</span>;
}

function SlotPicker({
  slots,
  loading,
  fromDay,
  setFromDay,
  timezone,
  locale,
  t,
  onPick,
  showCalendarName,
}: {
  slots: SlotsResult | null;
  loading: boolean;
  fromDay: string;
  setFromDay: (d: string) => void;
  timezone: string;
  locale: Locale;
  t: (k: never, v?: Record<string, string | number>) => string;
  onPick: (calendarId: string, iso: string) => void;
  showCalendarName: boolean;
}) {
  const tt = t as unknown as (k: string, v?: Record<string, string | number>) => string;
  const [day, setDay] = useState<string | null>(null);
  // Tous les jours qui ont au moins un créneau, tous plannings confondus.
  const days = [...new Set((slots?.calendars ?? []).flatMap((c) => c.days.map((d) => d.day)))].sort();
  const current = day && days.includes(day) ? day : days[0] ?? null;
  const today = dayKey(new Date(), timezone);
  const dayLabel = (key: string) => {
    const p = parseDayKey(key);
    if (!p) return key;
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
    return d.toLocaleDateString(dateLocale(locale), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  };
  // Les créneaux du jour choisi, planning par planning, fusionnés et triés.
  const items = (slots?.calendars ?? [])
    .flatMap((c) => (c.days.find((d) => d.day === current)?.slots ?? []).map((iso) => ({ iso, calendarId: c.id, name: c.name, color: c.color })))
    .sort((a, b) => a.iso.localeCompare(b.iso));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" disabled={fromDay <= today} onClick={() => setFromDay(shiftDayKey(fromDay, -14) < today ? today : shiftDayKey(fromDay, -14))} className="tap text-[12.5px] text-brand hover:underline disabled:opacity-40">
          ← {tt("booking.earlierDays")}
        </button>
        <button type="button" onClick={() => setFromDay(shiftDayKey(fromDay, 14))} className="tap text-[12.5px] text-brand hover:underline">
          {tt("booking.laterDays")} →
        </button>
      </div>
      {loading ? <p className="text-[13px] text-muted-2">{tt("booking.loadingSlots")}</p> : null}
      {!loading && days.length === 0 ? <p className="text-[13px] text-muted-2">{tt("booking.noSlots")}</p> : null}
      {days.length > 0 ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {days.map((k) => (
            <button key={k} type="button" onClick={() => setDay(k)} className={["tap shrink-0 rounded-pill border px-3 py-1.5 text-[13px] font-semibold", k === current ? "border-fill bg-fill text-fillfg" : "border-line-4 bg-surface text-body"].join(" ")}>
              {dayLabel(k)}
            </button>
          ))}
        </div>
      ) : null}
      {current ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <button key={`${it.calendarId}-${it.iso}`} type="button" onClick={() => onPick(it.calendarId, it.iso)} className="tap flex items-center gap-1.5 rounded-control border border-line-4 bg-surface px-3 py-2 text-[14px] font-semibold tabular-nums text-ink hover:border-ink">
              {showCalendarName ? <span className="size-2 rounded-full" style={{ background: it.color }} aria-hidden /> : null}
              {humanTime(new Date(it.iso), timezone, locale)}
              {showCalendarName ? <span className="text-[11px] font-normal text-muted-2">{it.name}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
