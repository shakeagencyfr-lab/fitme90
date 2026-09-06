"use client";

import { useActionState, useState } from "react";
import { usePhrase, useLocale } from "@/components/locale-provider";
import {
  addBlockAction,
  addCalendarAction,
  addServiceAction,
  deleteBlockAction,
  deleteCalendarAction,
  deleteServiceAction,
  saveBookingSettingsAction,
  saveHoursAction,
  setBookingActiveAction,
  toggleCalendarAction,
  toggleServiceAction,
  updateCalendarAction,
  updateServiceAction,
  type BookingState,
} from "@/app/admin/reservations/actions";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { CALENDAR_COLORS, formatHm, type BookingSettings, type HoursRange } from "@/lib/booking-rules";
import type { BookingBlock, BookingCalendar, BookingService } from "@/lib/booking";
import { formatEuros } from "@/lib/config";
import { zonedParts } from "@/lib/booking-time";

// ------------------------------------------------------------------ *
// L'écran Réservations d'un coach ou d'une salle, quand le pack est ouvert :
// l'interrupteur, puis trois onglets. PLANNINGS (un par coach, avec ses
// horaires de la semaine et ses absences), PRESTATIONS (nom, durée, prix),
// RÈGLES (pas des créneaux, délais, paiement, confirmation, adresse, fuseau).
//
// Chaque bloc est un petit formulaire autonome : on enregistre ce qu'on vient
// de toucher, pas une page entière. Une salle avec six coachs règle un
// planning sans risquer d'en écraser un autre.
// ------------------------------------------------------------------ */

interface Props {
  active: boolean;
  timezone: string;
  settings: BookingSettings;
  calendars: BookingCalendar[];
  blocks: BookingBlock[];
  services: BookingService[];
  ready: { calendars: number; services: number; ready: boolean };
  /** D'où vient le pack : « plan », « addon », « own ». Pour le dire au coach. */
  source: string;
}

type Tab = "plannings" | "prestations" | "regles";

const TIMEZONES = [
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Luxembourg",
  "Europe/Zurich",
  "Europe/Monaco",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Berlin",
  "Europe/Amsterdam",
  "Europe/Vienna",
  "Europe/Dublin",
  "Europe/London",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Athens",
  "Atlantic/Canary",
  "America/Martinique",
  "America/Guadeloupe",
  "America/Cayenne",
  "Indian/Reunion",
  "Indian/Mayotte",
  "Pacific/Noumea",
  "Pacific/Tahiti",
];

const inputCls = "h-10 w-full rounded-control border border-line-4 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink";

export function BookingAdmin({ active, timezone, settings, calendars, blocks, services, ready, source }: Props) {
  const tx = usePhrase();
  const [tab, setTab] = useState<Tab>("plannings");
  const [aState, aAction, aPending] = useActionState(setBookingActiveAction, {} as BookingState);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[26px] tracking-[-0.02em] text-ink">{tx("Réservations")}</h1>
        <p className="max-w-[72ch] text-[14px] leading-[1.6] text-muted">
          {tx("Tes clients prennent rendez-vous pour une séance en présentiel depuis leur espace, sur les créneaux que tu ouvres. Tu choisis client par client qui peut réserver, depuis sa fiche.")}
        </p>
      </div>

      {/* L'interrupteur, et l'état de préparation : ce qui manque pour qu'un
          client puisse effectivement réserver se lit ici, pas dans un onglet. */}
      <Card className="flex flex-col gap-3">
        <form action={aAction} className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2.5 text-[15px] text-ink">
            <input type="checkbox" name="active" defaultChecked={active} className="size-4 accent-brand" />
            {tx("Réservation ouverte dans mon espace")}
          </label>
          <Button type="submit" loading={aPending} className="h-10">
            {tx("Enregistrer")}
          </Button>
          {aState.ok ? <span className="text-[12.5px] text-muted">{tx("Enregistré.")}</span> : null}
          {aState.error ? <span className="text-[12.5px] text-alert-ink">{aState.error}</span> : null}
        </form>
        <div className="flex flex-wrap gap-2 text-[12.5px]">
          <Pill ok={ready.calendars > 0}>
            {ready.calendars} {ready.calendars > 1 ? tx("plannings avec des horaires") : tx("planning avec des horaires")}
          </Pill>
          <Pill ok={ready.services > 0}>
            {ready.services} {ready.services > 1 ? tx("prestations actives") : tx("prestation active")}
          </Pill>
          <Pill ok={active}>{active ? tx("Ouverte") : tx("Éteinte")}</Pill>
        </div>
        {active && !ready.ready ? <Alert tone="info">{tx("Personne ne peut encore réserver : il faut au moins un planning avec des horaires et une prestation active.")}</Alert> : null}
        {source === "addon" ? <p className="text-[12px] text-muted-2">{tx("Pack souscrit à part auprès de ton revendeur. Il se gère depuis Mon abonnement.")}</p> : null}
      </Card>

      <div className="inline-flex self-start rounded-full border border-line-4 p-1" role="tablist">
        {(
          [
            ["plannings", tx("Plannings")],
            ["prestations", tx("Prestations")],
            ["regles", tx("Règles")],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={["tap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors", tab === k ? "bg-brand text-white" : "text-muted hover:text-ink"].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "plannings" ? <CalendarsTab calendars={calendars} blocks={blocks} timezone={timezone} /> : null}
      {tab === "prestations" ? <ServicesTab services={services} /> : null}
      {tab === "regles" ? <RulesTab settings={settings} timezone={timezone} /> : null}
    </div>
  );
}

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={["rounded-pill px-2.5 py-1 font-semibold", ok ? "bg-brand/10 text-brand" : "bg-surface-2 text-muted-2"].join(" ")}>{children}</span>;
}

// ────────────────────────────────────────────────── plannings

function CalendarsTab({ calendars, blocks, timezone }: { calendars: BookingCalendar[]; blocks: BookingBlock[]; timezone: string }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(addCalendarAction, {} as BookingState);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-[1.6] text-muted">
        {tx("Un planning par personne qui reçoit des clients. Coach indépendant : un seul suffit. Salle : un par coach, chacun avec ses horaires. Le client choisit le planning au moment de réserver quand il y en a plusieurs.")}
      </p>
      {calendars.map((c) => (
        <CalendarCard key={c.id} cal={c} blocks={blocks.filter((b) => b.calendar_id === c.id)} timezone={timezone} />
      ))}

      <Card className="flex flex-col gap-3">
        <MonoLabel>{tx("Ajouter un planning")}</MonoLabel>
        <form action={action} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <span className="text-[12.5px] text-muted-2">{tx("Nom (le coach, ou le lieu)")}</span>
            <input name="name" maxLength={60} placeholder={tx("Ex : Sarah")} className={inputCls} />
          </label>
          <ColorPicker name="color" />
          <Button type="submit" loading={pending} className="h-10">
            {tx("Ajouter")}
          </Button>
        </form>
        {state.error ? <Alert>{state.error}</Alert> : null}
      </Card>
    </div>
  );
}

function ColorPicker({ name, initial }: { name: string; initial?: string }) {
  const [v, setV] = useState(initial ?? CALENDAR_COLORS[0]);
  return (
    <div className="flex items-center gap-1.5">
      <input type="hidden" name={name} value={v} />
      {CALENDAR_COLORS.map((c) => (
        <button key={c} type="button" onClick={() => setV(c)} aria-label={c} className={["size-6 rounded-full border-2 transition-transform", v === c ? "scale-110 border-ink" : "border-transparent"].join(" ")} style={{ background: c }} />
      ))}
    </div>
  );
}

function CalendarCard({ cal, blocks, timezone }: { cal: BookingCalendar; blocks: BookingBlock[]; timezone: string }) {
  const tx = usePhrase();
  const [uState, uAction, uPending] = useActionState(updateCalendarAction, {} as BookingState);
  return (
    <Card className={["flex flex-col gap-4", cal.is_active ? "" : "opacity-70"].join(" ")}>
      <form action={uAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={cal.id} />
        <span className="size-3.5 shrink-0 rounded-full" style={{ background: cal.color }} aria-hidden />
        <input name="name" defaultValue={cal.name} maxLength={60} className="h-10 min-w-[180px] flex-1 rounded-control border border-line-4 bg-surface px-3 font-archivo text-[15px] font-semibold text-ink outline-none focus:border-ink" />
        <ColorPicker name="color" initial={cal.color} />
        <Button type="submit" variant="outline" loading={uPending} className="h-10">
          {tx("Renommer")}
        </Button>
        {uState.ok ? <span className="text-[12px] text-muted">{tx("Enregistré.")}</span> : null}
        {uState.error ? <span className="text-[12px] text-alert-ink">{uState.error}</span> : null}
      </form>

      <HoursEditor calendarId={cal.id} hours={cal.hours} />

      <BlocksEditor calendarId={cal.id} blocks={blocks} timezone={timezone} />

      <div className="flex flex-wrap items-center gap-2 border-t border-line-2 pt-3">
        <form action={toggleCalendarAction}>
          <input type="hidden" name="id" value={cal.id} />
          <input type="hidden" name="active" value={cal.is_active ? "" : "on"} />
          <button type="submit" className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink">
            {cal.is_active ? tx("Mettre en pause") : tx("Réactiver")}
          </button>
        </form>
        <form action={deleteCalendarAction} onSubmit={(e) => (window.confirm(tx("Supprimer ce planning et ses rendez-vous à venir ?")) ? undefined : e.preventDefault())}>
          <input type="hidden" name="id" value={cal.id} />
          <button type="submit" className="tap rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink">
            {tx("Supprimer")}
          </button>
        </form>
        {!cal.is_active ? <span className="text-[12px] text-muted-2">{tx("En pause : ce planning n'est pas proposé aux clients.")}</span> : null}
      </div>
    </Card>
  );
}

/** Une semaine d'horaires : par jour, des plages qu'on ajoute et qu'on retire, enregistrées d'un bloc. */
function HoursEditor({ calendarId, hours }: { calendarId: string; hours: HoursRange[] }) {
  const tx = usePhrase();
  const DAYS = [tx("Lundi"), tx("Mardi"), tx("Mercredi"), tx("Jeudi"), tx("Vendredi"), tx("Samedi"), tx("Dimanche")];
  const [state, action, pending] = useActionState(saveHoursAction, {} as BookingState);
  const [rows, setRows] = useState<{ weekday: number; start: string; end: string }[]>(() => hours.map((h) => ({ weekday: h.weekday, start: formatHm(h.startMin), end: formatHm(h.endMin) })));

  const add = (wd: number) => setRows((r) => [...r, { weekday: wd, start: "09:00", end: "12:00" }]);
  const remove = (i: number) => setRows((r) => r.filter((_, j) => j !== i));
  const set = (i: number, k: "start" | "end", v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const copyMondayToWeek = () => {
    const monday = rows.filter((r) => r.weekday === 0);
    setRows([...monday, ...[1, 2, 3, 4].flatMap((wd) => monday.map((m) => ({ ...m, weekday: wd })))]);
  };

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="calendar_id" value={calendarId} />
      <input type="hidden" name="hours" value={JSON.stringify(rows)} />
      <div className="flex items-baseline justify-between gap-2">
        <MonoLabel>{tx("Horaires de la semaine")}</MonoLabel>
        <button type="button" onClick={copyMondayToWeek} className="tap text-[12px] text-brand hover:underline">
          {tx("Copier le lundi sur la semaine")}
        </button>
      </div>
      <div className="flex flex-col divide-y divide-line-2">
        {DAYS.map((label, wd) => {
          const mine = rows.map((r, i) => ({ ...r, i })).filter((r) => r.weekday === wd);
          return (
            <div key={wd} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className={["w-[84px] text-[13px] font-semibold", mine.length ? "text-ink" : "text-muted-2"].join(" ")}>{label}</span>
              {mine.length === 0 ? <span className="text-[12.5px] text-muted-2">{tx("Fermé")}</span> : null}
              {mine.map((r) => (
                <span key={r.i} className="flex items-center gap-1">
                  <input type="time" value={r.start} onChange={(e) => set(r.i, "start", e.target.value)} step={300} className="h-8 rounded-control border border-line-4 bg-surface px-1.5 text-[13px] tabular-nums text-ink" />
                  <span className="text-[12px] text-muted-2">→</span>
                  <input type="time" value={r.end} onChange={(e) => set(r.i, "end", e.target.value)} step={300} className="h-8 rounded-control border border-line-4 bg-surface px-1.5 text-[13px] tabular-nums text-ink" />
                  <button type="button" onClick={() => remove(r.i)} aria-label={tx("Retirer")} className="tap flex size-7 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink">
                    ×
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => add(wd)} className="tap rounded-pill border border-line-4 px-2.5 py-0.5 text-[12px] font-semibold text-body hover:border-ink">
                + {tx("plage")}
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending} className="h-9">
          {tx("Enregistrer les horaires")}
        </Button>
        {state.ok ? <span className="text-[12px] text-muted">{tx("Enregistré.")}</span> : null}
        {state.error ? <span className="text-[12px] text-alert-ink">{state.error}</span> : null}
      </div>
    </form>
  );
}

function BlocksEditor({ calendarId, blocks, timezone }: { calendarId: string; blocks: BookingBlock[]; timezone: string }) {
  const tx = usePhrase();
  const locale = useLocale();
  const [state, action, pending] = useActionState(addBlockAction, {} as BookingState);
  const [open, setOpen] = useState(false);
  // Formaté à la main : le rendu de toLocaleString diffère entre le serveur
  // et le navigateur (virgules, abréviations), et React refuse l'hydratation.
  const DAYS = locale === "en" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
  const MONTHS = locale === "en" ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const fmt = (iso: string) => {
    const z = zonedParts(new Date(iso), timezone);
    return `${DAYS[z.weekday]} ${z.day} ${MONTHS[z.month - 1]} ${String(z.hour).padStart(2, "0")}:${String(z.minute).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <MonoLabel>{tx("Absences et fermetures")}</MonoLabel>
        <button type="button" onClick={() => setOpen((o) => !o)} className="tap text-[12px] text-brand hover:underline">
          {open ? tx("Fermer") : tx("Ajouter une absence")}
        </button>
      </div>
      {blocks.length === 0 && !open ? <p className="text-[12.5px] text-muted-2">{tx("Aucune absence à venir.")}</p> : null}
      {blocks.map((b) => (
        <div key={b.id} className="flex items-center gap-3 text-[13px]">
          <span className="text-body">
            {fmt(b.starts_at)} → {fmt(b.ends_at)}
          </span>
          {b.reason ? <span className="text-muted-2">· {b.reason}</span> : null}
          <form action={deleteBlockAction} className="ml-auto">
            <input type="hidden" name="id" value={b.id} />
            <button type="submit" className="tap text-[12px] text-muted-2 underline hover:text-ink">
              {tx("Retirer")}
            </button>
          </form>
        </div>
      ))}
      {open ? (
        <form action={action} className="flex flex-wrap items-end gap-2 rounded-control border border-line-4 bg-surface-2 p-3">
          <input type="hidden" name="calendar_id" value={calendarId} />
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] text-muted-2">{tx("Du")}</span>
            <span className="flex gap-1">
              <input type="date" name="start_day" required className="h-9 rounded-control border border-line-4 bg-surface px-2 text-[13px] text-ink" />
              <input type="time" name="start_time" defaultValue="00:00" step={300} className="h-9 rounded-control border border-line-4 bg-surface px-2 text-[13px] text-ink" />
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] text-muted-2">{tx("Au")}</span>
            <span className="flex gap-1">
              <input type="date" name="end_day" required className="h-9 rounded-control border border-line-4 bg-surface px-2 text-[13px] text-ink" />
              <input type="time" name="end_time" defaultValue="23:59" step={300} className="h-9 rounded-control border border-line-4 bg-surface px-2 text-[13px] text-ink" />
            </span>
          </label>
          <label className="flex min-w-[160px] flex-1 flex-col gap-1">
            <span className="text-[11.5px] text-muted-2">{tx("Motif (facultatif)")}</span>
            <input name="reason" maxLength={120} placeholder={tx("Vacances")} className="h-9 w-full rounded-control border border-line-4 bg-surface px-2 text-[13px] text-ink" />
          </label>
          <Button type="submit" loading={pending} className="h-9">
            {tx("Ajouter")}
          </Button>
          {state.error ? (
            <div className="w-full">
              <Alert>{state.error}</Alert>
            </div>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────── prestations

function ServiceFields({ svc }: { svc?: BookingService }) {
  const tx = usePhrase();
  return (
    <>
      <label className="flex min-w-[200px] flex-1 flex-col gap-1">
        <span className="text-[11.5px] text-muted-2">{tx("Nom")}</span>
        <input name="name" defaultValue={svc?.name ?? ""} maxLength={80} placeholder={tx("Séance individuelle")} className={inputCls} />
      </label>
      <label className="flex w-[110px] flex-col gap-1">
        <span className="text-[11.5px] text-muted-2">{tx("Durée (min)")}</span>
        <input name="duration_min" inputMode="numeric" defaultValue={svc?.duration_min ?? 60} className={inputCls} />
      </label>
      <label className="flex w-[110px] flex-col gap-1">
        <span className="text-[11.5px] text-muted-2">{tx("Prix (€)")}</span>
        <input name="price_euros" inputMode="decimal" defaultValue={svc?.price_cents != null ? String(svc.price_cents / 100) : ""} placeholder={tx("vide = inclus")} className={inputCls} />
      </label>
      <label className="flex w-full flex-col gap-1">
        <span className="text-[11.5px] text-muted-2">{tx("Description (facultatif)")}</span>
        <input name="description" defaultValue={svc?.description ?? ""} maxLength={300} placeholder={tx("Ce qu'on fait pendant la séance, ce qu'il faut apporter…")} className={inputCls} />
      </label>
    </>
  );
}

function ServicesTab({ services }: { services: BookingService[] }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(addServiceAction, {} as BookingState);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] leading-[1.6] text-muted">
        {tx("Ce que le client réserve : une séance individuelle, un bilan, une séance duo… La durée fixe la taille du créneau. Sans prix, la séance est comprise dans son programme ; avec un prix, il règle à la réservation si tu l'exiges dans les règles, sinon sur place.")}
      </p>
      {services.map((s) => (
        <ServiceCard key={s.id} svc={s} />
      ))}
      <Card className="flex flex-col gap-3">
        <MonoLabel>{tx("Ajouter une prestation")}</MonoLabel>
        <form action={action} className="flex flex-wrap items-end gap-3">
          <ServiceFields />
          <Button type="submit" loading={pending} className="h-10">
            {tx("Ajouter")}
          </Button>
        </form>
        {state.error ? <Alert>{state.error}</Alert> : null}
      </Card>
    </div>
  );
}

function ServiceCard({ svc }: { svc: BookingService }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(updateServiceAction, {} as BookingState);
  return (
    <Card className={["flex flex-col gap-3", svc.is_active ? "" : "opacity-70"].join(" ")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-archivo text-[15px] font-bold text-ink">{svc.name}</span>
        <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[12px] text-muted">{svc.duration_min} min</span>
        <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[12px] text-muted">{svc.price_cents != null ? formatEuros(svc.price_cents) : tx("Inclus")}</span>
        {!svc.is_active ? <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[12px] text-muted-2">{tx("En pause")}</span> : null}
      </div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={svc.id} />
        <ServiceFields svc={svc} />
        <Button type="submit" variant="outline" loading={pending} className="h-10">
          {tx("Enregistrer")}
        </Button>
        {state.ok ? <span className="text-[12px] text-muted">{tx("Enregistré.")}</span> : null}
        {state.error ? <span className="text-[12px] text-alert-ink">{state.error}</span> : null}
      </form>
      <div className="flex flex-wrap items-center gap-2 border-t border-line-2 pt-3">
        <form action={toggleServiceAction}>
          <input type="hidden" name="id" value={svc.id} />
          <input type="hidden" name="active" value={svc.is_active ? "" : "on"} />
          <button type="submit" className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink">
            {svc.is_active ? tx("Mettre en pause") : tx("Réactiver")}
          </button>
        </form>
        <form action={deleteServiceAction} onSubmit={(e) => (window.confirm(tx("Supprimer cette prestation ?")) ? undefined : e.preventDefault())}>
          <input type="hidden" name="id" value={svc.id} />
          <button type="submit" className="tap rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink">
            {tx("Supprimer")}
          </button>
        </form>
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────── règles

function RulesTab({ settings, timezone }: { settings: BookingSettings; timezone: string }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(saveBookingSettingsAction, {} as BookingState);
  const tzOptions = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];
  const num = (name: string, label: string, value: number, help: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-[12.5px] font-medium text-body">{label}</span>
      <input name={name} inputMode="numeric" defaultValue={value} className={inputCls} />
      <span className="text-[11.5px] leading-[1.5] text-muted-2">{help}</span>
    </label>
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <MonoLabel>{tx("Créneaux")}</MonoLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-body">{tx("Pas des créneaux")}</span>
            <select name="slot_step_min" defaultValue={settings.slotStepMin} className={inputCls}>
              {[15, 20, 30, 45, 60].map((v) => (
                <option key={v} value={v}>
                  {v} min
                </option>
              ))}
            </select>
            <span className="text-[11.5px] leading-[1.5] text-muted-2">{tx("Un départ possible toutes les 30 min : 9 h, 9 h 30, 10 h…")}</span>
          </label>
          {num("buffer_min", tx("Battement entre deux rendez-vous (min)"), settings.bufferMin, tx("Le temps de souffler, ranger, accueillir le suivant."))}
          {num("min_notice_hours", tx("Délai minimal avant un rendez-vous (h)"), settings.minNoticeHours, tx("Pas de réservation pour dans dix minutes : 12 h laisse le temps de s'organiser."))}
          {num("max_advance_days", tx("Réservable jusqu'à (jours)"), settings.maxAdvanceDays, tx("Au-delà, l'agenda n'est pas encore ouvert."))}
          {num("cancel_limit_hours", tx("Annulation libre jusqu'à (h avant)"), settings.cancelLimitHours, tx("Passé ce délai, le client doit te contacter."))}
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <MonoLabel>{tx("Paiement et confirmation")}</MonoLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-body">{tx("Paiement en ligne")}</span>
            <select name="payment" defaultValue={settings.payment} className={inputCls}>
              <option value="none">{tx("Aucun : réglé sur place ou compris")}</option>
              <option value="required">{tx("Exigé à la réservation (prestations avec un prix)")}</option>
            </select>
            <span className="text-[11.5px] leading-[1.5] text-muted-2">{tx("Sur ton compte Stripe, comme tes programmes. Une prestation sans prix ne demande jamais de paiement.")}</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-body">{tx("Confirmation")}</span>
            <select name="confirmation" defaultValue={settings.confirmation} className={inputCls}>
              <option value="auto">{tx("Automatique : le créneau est confirmé tout de suite")}</option>
              <option value="manual">{tx("Manuelle : tu valides chaque demande")}</option>
            </select>
            <span className="text-[11.5px] leading-[1.5] text-muted-2">{tx("En manuel, le créneau est tenu en attente jusqu'à ta réponse.")}</span>
          </label>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <MonoLabel>{tx("Lieu et fuseau horaire")}</MonoLabel>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-body">{tx("Adresse")}</span>
            <input name="address" defaultValue={settings.address} maxLength={200} placeholder={tx("12 rue des Sports, 69003 Lyon")} className={inputCls} />
            <span className="text-[11.5px] leading-[1.5] text-muted-2">{tx("Rappelée dans chaque confirmation.")}</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-medium text-body">{tx("Fuseau horaire")}</span>
            <select name="timezone" defaultValue={timezone} className={inputCls}>
              {tzOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            <span className="text-[11.5px] leading-[1.5] text-muted-2">{tx("Tes horaires et ceux de tes clients se lisent dans ce fuseau.")}</span>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[12.5px] font-medium text-body">{tx("Consignes (facultatif)")}</span>
          <textarea name="instructions" defaultValue={settings.instructions} maxLength={600} rows={3} placeholder={tx("Tenue de sport, serviette, code de la porte…")} className="w-full rounded-control border border-line-4 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending} className="h-11">
          {tx("Enregistrer les règles")}
        </Button>
        {state.ok ? <span className="text-[12.5px] text-muted">{tx("Enregistré.")}</span> : null}
        {state.error ? <span className="text-[12.5px] text-alert-ink">{state.error}</span> : null}
      </div>
    </form>
  );
}
