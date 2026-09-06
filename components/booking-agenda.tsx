"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useLocale, usePhrase } from "@/components/locale-provider";
import { coachAddBookingAction, coachBookingStatusAction, coachCancelBookingAction, coachConfirmBookingAction, type BookingState } from "@/app/admin/reservations/actions";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { awaitingPayment, isAlive } from "@/lib/booking-model";
import type { AgendaBooking } from "@/lib/booking-appointments";
import type { BookingCalendar, BookingService } from "@/lib/booking";
import { dayKey, zonedParts } from "@/lib/booking-time";
import { formatEuros } from "@/lib/config";

// ------------------------------------------------------------------ *
// L'agenda du coach : les demandes à valider, puis les rendez-vous à venir
// jour par jour, avec les gestes du quotidien (confirmer, annuler, fait,
// absent), et un formulaire pour poser un rendez-vous à la main.
//
// Les dates sont formatées à la main dans le fuseau du compte : le rendu de
// toLocaleString diffère entre le serveur et le navigateur, et React refuse
// alors l'hydratation.
// ------------------------------------------------------------------ */

interface Props {
  bookings: AgendaBooking[];
  timezone: string;
  calendars: BookingCalendar[];
  services: BookingService[];
  clients: { id: string; name: string }[];
}

const inputCls = "h-10 w-full rounded-control border border-line-4 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink";

export function BookingAgenda({ bookings, timezone, calendars, services, clients }: Props) {
  const tx = usePhrase();
  const locale = useLocale();
  const now = new Date();
  const DAYS = locale === "en" ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] : ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  const MONTHS = locale === "en" ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] : ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const hm = (iso: string) => {
    const z = zonedParts(new Date(iso), timezone);
    return `${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}`;
  };
  const dayTitle = (key: string) => {
    const z = zonedParts(new Date(`${key}T12:00:00Z`), "UTC");
    const label = `${DAYS[z.weekday]} ${z.day} ${MONTHS[z.month - 1]}`;
    return key === dayKey(now, timezone) ? `${tx("Aujourd'hui")} · ${label}` : label;
  };

  const live = bookings.filter((b) => isAlive(b, now));
  const pending = live.filter((b) => b.status === "pending" && !awaitingPayment(b));
  const upcoming = live.filter((b) => b.status === "confirmed" || awaitingPayment(b));
  const byDay = new Map<string, AgendaBooking[]>();
  for (const b of upcoming) {
    const k = dayKey(new Date(b.starts_at), timezone);
    byDay.set(k, [...(byDay.get(k) ?? []), b]);
  }
  const recent = bookings.filter((b) => !isAlive(b, now)).slice(-8).reverse();

  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 ? (
        <Card className="flex flex-col gap-3 border-brand/40">
          <MonoLabel>
            {tx("À valider")} ({pending.length})
          </MonoLabel>
          {pending.map((b) => (
            <Row key={b.id} b={b} hm={hm} tx={tx} calendars={calendars.length} dayLabel={dayTitle(dayKey(new Date(b.starts_at), timezone))}>
              <form action={coachConfirmBookingAction}>
                <input type="hidden" name="id" value={b.id} />
                <Button type="submit" className="h-9">
                  {tx("Confirmer")}
                </Button>
              </form>
              <CancelForm id={b.id} label={tx("Refuser")} tx={tx} />
            </Row>
          ))}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-4">
        <MonoLabel>{tx("À venir")}</MonoLabel>
        {upcoming.length === 0 ? <p className="text-[13px] text-muted-2">{tx("Aucun rendez-vous à venir sur les 30 prochains jours.")}</p> : null}
        {[...byDay.entries()].map(([key, list]) => (
          <div key={key} className="flex flex-col gap-2">
            <div className="font-archivo text-[14px] font-bold capitalize text-ink">{dayTitle(key)}</div>
            {list.map((b) => (
              <Row key={b.id} b={b} hm={hm} tx={tx} calendars={calendars.length}>
                {b.status === "confirmed" ? (
                  <>
                    <form action={coachBookingStatusAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="status" value="done" />
                      <button type="submit" className="tap rounded-btn border border-line-4 px-3 py-1.5 text-[12.5px] font-semibold text-body hover:border-ink">
                        {tx("Fait")}
                      </button>
                    </form>
                    <form action={coachBookingStatusAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="status" value="no_show" />
                      <button type="submit" className="tap rounded-btn border border-line-4 px-3 py-1.5 text-[12.5px] font-semibold text-body hover:border-ink">
                        {tx("Absent")}
                      </button>
                    </form>
                  </>
                ) : null}
                <CancelForm id={b.id} label={tx("Annuler")} tx={tx} />
              </Row>
            ))}
          </div>
        ))}
      </Card>

      <AddBooking calendars={calendars} services={services} clients={clients} />

      {recent.length > 0 ? (
        <details>
          <summary className="tap cursor-pointer text-[13px] text-muted-2 hover:text-ink">{tx("Passés et annulés récents")}</summary>
          <Card className="mt-2 flex flex-col gap-2">
            {recent.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center gap-2 border-b border-line-2 pb-2 text-[13px] last:border-0 last:pb-0">
                <span className="text-body">
                  {dayTitle(dayKey(new Date(b.starts_at), timezone))} {hm(b.starts_at)} · {b.client_name} · {b.service_name}
                </span>
                <StatusPill b={b} tx={tx} />
                {b.cancel_reason ? <span className="text-muted-2">· {b.cancel_reason}</span> : null}
              </div>
            ))}
          </Card>
        </details>
      ) : null}
    </div>
  );
}

function Row({ b, hm, tx, calendars, dayLabel, children }: { b: AgendaBooking; hm: (iso: string) => string; tx: (s: string) => string; calendars: number; dayLabel?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-control border border-line px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-2 sm:w-[118px] sm:shrink-0">
        <span className="size-2.5 shrink-0 rounded-full" style={{ background: b.calendar_color }} aria-hidden />
        <span className="font-archivo text-[16px] font-extrabold tabular-nums text-ink">
          {hm(b.starts_at)}
          <span className="text-[12px] font-semibold text-muted-2"> → {hm(b.ends_at)}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {dayLabel ? <div className="text-[12px] capitalize text-muted-2">{dayLabel}</div> : null}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link href={`/admin/clients/${b.client_id}`} className="font-archivo text-[14.5px] font-semibold text-ink hover:underline">
            {b.client_name}
          </Link>
          <span className="text-[13px] text-body">· {b.service_name}</span>
          {b.price_cents != null ? <span className="text-[12px] text-muted-2">· {formatEuros(b.price_cents)}{b.paid ? ` ${tx("payé")}` : ""}</span> : null}
          {calendars > 1 ? <span className="text-[12px] text-muted-2">· {b.calendar_name}</span> : null}
          {b.source === "ai" ? <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-muted-2">{tx("via Coach IA")}</span> : null}
          <StatusPill b={b} tx={tx} />
        </div>
        {b.client_note ? <div className="text-[12.5px] text-muted">« {b.client_note} »</div> : null}
        {b.coach_note ? <div className="text-[12.5px] text-muted-2">{b.coach_note}</div> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function StatusPill({ b, tx }: { b: AgendaBooking; tx: (s: string) => string }) {
  const label = awaitingPayment(b) ? tx("En attente de paiement") : b.status === "confirmed" ? tx("Confirmé") : b.status === "pending" ? tx("À valider") : b.status === "cancelled" ? tx("Annulé") : b.status === "done" ? tx("Fait") : tx("Absent");
  const tone = b.status === "confirmed" || b.status === "done" ? "bg-[#2F6B3C]/10 text-[#2F6B3C]" : b.status === "pending" ? "bg-brand/10 text-brand" : "bg-surface-2 text-muted-2";
  return <span className={["rounded-pill px-2 py-0.5 text-[10.5px] font-semibold", tone].join(" ")}>{label}</span>;
}

function CancelForm({ id, label, tx }: { id: string; label: string; tx: (s: string) => string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="tap rounded-btn border border-alert-line bg-alert px-3 py-1.5 text-[12.5px] font-semibold text-alert-ink">
        {label}
      </button>
    );
  }
  return (
    <form action={coachCancelBookingAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input name="reason" maxLength={200} placeholder={tx("Motif (envoyé au client)")} autoFocus className="h-9 w-[190px] rounded-control border border-line-4 bg-surface px-2 text-[13px] text-ink" />
      <button type="submit" className="tap rounded-btn border border-alert-line bg-alert px-3 py-1.5 text-[12.5px] font-semibold text-alert-ink">
        {label}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="tap text-[12px] text-muted-2 underline">
        {tx("Non")}
      </button>
    </form>
  );
}

function AddBooking({ calendars, services, clients }: { calendars: BookingCalendar[]; services: BookingService[]; clients: { id: string; name: string }[] }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(coachAddBookingAction, {} as BookingState);
  const [open, setOpen] = useState(false);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <MonoLabel>{tx("Poser un rendez-vous à la main")}</MonoLabel>
        <button type="button" onClick={() => setOpen((o) => !o)} className="tap text-[12.5px] text-brand hover:underline">
          {open ? tx("Fermer") : tx("Ouvrir")}
        </button>
      </div>
      {open ? (
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] text-muted-2">{tx("Client")}</span>
            <select name="client_id" required className={inputCls}>
              <option value="">…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] text-muted-2">{tx("Prestation")}</span>
            <select name="service_id" required className={inputCls}>
              <option value="">…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration_min} min
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] text-muted-2">{tx("Planning")}</span>
            <select name="calendar_id" required className={inputCls}>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] text-muted-2">{tx("Jour")}</span>
              <input type="date" name="day" required className={inputCls} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11.5px] text-muted-2">{tx("Heure")}</span>
              <input type="time" name="time" required step={300} className={inputCls} />
            </label>
          </div>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-[11.5px] text-muted-2">{tx("Note interne (facultatif)")}</span>
            <input name="note" maxLength={300} className={inputCls} />
          </label>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Button type="submit" loading={pending} className="h-10">
              {tx("Enregistrer le rendez-vous")}
            </Button>
            {state.ok ? <span className="text-[12.5px] text-muted">{tx("Enregistré.")}</span> : null}
          </div>
          {state.error ? (
            <div className="sm:col-span-2">
              <Alert>{state.error}</Alert>
            </div>
          ) : null}
          <p className="text-[11.5px] leading-[1.5] text-muted-2 sm:col-span-2">{tx("Posé par toi, le rendez-vous est confirmé d'emblée, sans délai ni paiement en ligne. Le client est prévenu.")}</p>
        </form>
      ) : null}
    </Card>
  );
}
