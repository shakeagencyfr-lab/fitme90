import Link from "next/link";
import { tx, getRequestLocale } from "@/lib/i18n/request";
import { humanDate, humanTime } from "@/lib/booking-time";
import { agendaView } from "@/lib/booking-summary";
import type { AgendaBooking } from "@/lib/booking-appointments";
import { Card, MonoLabel } from "@/components/ui";

// La carte « Rendez-vous » de l'accueil du coach.
//
// POURQUOI ICI. L'agenda complet vit dans l'onglet Réservations, avec les
// réglages. C'est le bon endroit pour organiser sa semaine, mais pas pour
// savoir ce qu'on a dans deux heures. Un coach ouvre son dashboard le matin :
// il doit y lire sa journée sans cliquer, et voir tout de suite ce qui attend
// une réponse de sa part.

function Ligne({ b, timezone, withDay }: { b: AgendaBooking; timezone: string; withDay?: boolean }) {
  const locale = getRequestLocale();
  const start = new Date(b.starts_at);
  const enAttente = b.status === "pending";
  return (
    <li className="flex items-center gap-3 border-t border-line-2 py-2.5 first:border-t-0 first:pt-0">
      <span
        className="mt-0.5 h-8 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: b.calendar_color || "var(--color-brand)" }}
        aria-hidden
      />
      <span className="flex w-[74px] shrink-0 flex-col">
        <span className="font-archivo text-[15px] font-bold tabular-nums leading-tight text-ink">
          {humanTime(start, timezone, locale)}
        </span>
        {withDay ? <span className="text-[11.5px] text-muted-2">{humanDate(start, timezone, locale)}</span> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-semibold text-ink">{b.client_name}</span>
        <span className="truncate text-[12.5px] text-muted-2">
          {b.service_name}
          {b.calendar_name ? ` · ${b.calendar_name}` : ""}
        </span>
      </span>
      {enAttente ? (
        <span className="shrink-0 rounded-pill bg-alert px-2.5 py-0.5 text-[11.5px] font-semibold text-alert-ink">
          {tx("à valider")}
        </span>
      ) : null}
    </li>
  );
}

export function BookingToday({ agenda, timezone, now }: { agenda: AgendaBooking[]; timezone: string; now?: Date }) {
  const v = agendaView(agenda, { now: now ?? new Date(), timezone, days: 3 });
  // Les prochains jours ne servent qu'à combler : une journée déjà remplie se
  // suffit, et empiler trois jours en dessous noierait ce qui compte.
  const suite = v.today.length >= 4 ? [] : v.next.slice(0, v.today.length ? 1 : 2);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-control bg-brand/10 text-brand">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z" />
              <path d="M5 10h14M9 3v4M15 3v4" />
            </svg>
          </span>
          <MonoLabel>{tx("Rendez-vous")}</MonoLabel>
        </div>
        <Link href="/admin/reservations" className="tap text-[13px] font-semibold text-brand hover:underline">
          {tx("Tout l'agenda")}
        </Link>
      </div>

      {v.pending > 0 || v.awaitingPayment > 0 ? (
        <p className="text-[13px] font-semibold text-alert-ink">
          {v.pending > 0 ? `${v.pending} ${v.pending > 1 ? tx("demandes attendent ta validation") : tx("demande attend ta validation")}.` : ""}
          {v.awaitingPayment > 0 ? ` ${v.awaitingPayment} ${tx("en attente de paiement : le créneau saute si le client ne règle pas.")}` : ""}
        </p>
      ) : null}

      {v.today.length === 0 && suite.length === 0 ? (
        <p className="text-[13.5px] text-muted">
          {v.upcoming > 0
            ? `${v.upcoming} ${tx("rendez-vous à venir, aucun dans les prochains jours.")}`
            : tx("Aucun rendez-vous à venir. Tes clients réservent depuis leur espace, ou en parlant à leur coach IA.")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {v.today.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-2">{tx("Aujourd'hui")}</span>
              <ul className="flex flex-col">
                {v.today.map((b) => (
                  <Ligne key={b.id} b={b} timezone={timezone} />
                ))}
              </ul>
            </div>
          ) : null}
          {suite.map((d) => (
            <div key={d.key} className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-2">
                {humanDate(new Date(d.items[0].starts_at), timezone, getRequestLocale())}
              </span>
              <ul className="flex flex-col">
                {d.items.map((b) => (
                  <Ligne key={b.id} b={b} timezone={timezone} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
