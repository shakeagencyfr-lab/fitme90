// Ce que la réservation doit remonter sur les tableaux de bord.
//
// LE PROBLÈME. Le module de réservation était complet mais invisible :
// l'agenda du coach vivait à deux clics dans un onglet de réglages, et le
// client n'avait aucune trace de son rendez-vous ailleurs qu'un onglet caché
// dans le menu « Plus ». Un planning qu'on ne voit pas en ouvrant l'app n'est
// pas un planning : c'est un formulaire.
//
// CE MODULE. Les deux lectures qu'on veut en ouvrant son tableau de bord :
// « qu'est-ce que j'ai aujourd'hui » et « où j'en suis ». Purs, testables,
// sans réseau : les écrans passent une liste de rendez-vous déjà lue.

import type { Booking, BookingStatus } from "@/lib/booking-model";
import { awaitingPayment } from "@/lib/booking-model";
import { dayKey } from "@/lib/booking-time";

/** Les statuts qui occupent vraiment une place dans le planning. */
const VIVANTS: readonly BookingStatus[] = ["pending", "confirmed"] as const;

export function isLive(b: Pick<Booking, "status">): boolean {
  return VIVANTS.includes(b.status);
}

export interface BookingDay<T> {
  /** Jour au format AAAA-MM-JJ, dans le fuseau du coach. */
  key: string;
  items: T[];
}

export interface AgendaView<T> {
  /** Les rendez-vous d'aujourd'hui, passés compris : la journée en cours. */
  today: T[];
  /** Les jours suivants qui ont au moins un rendez-vous, dans l'ordre. */
  next: BookingDay<T>[];
  /** Rendez-vous vivants à venir, tous jours confondus. */
  upcoming: number;
  /** Ceux qui attendent une validation du coach : c'est ce qui presse. */
  pending: number;
  /** Ceux qui attendent un paiement du client, et qui sautent sinon. */
  awaitingPayment: number;
}

/**
 * L'agenda ramené à ce qu'on lit d'un coup d'œil : aujourd'hui, puis les
 * prochains jours servis.
 *
 * Les rendez-vous annulés sont exclus : un planning n'est pas un journal. Ce
 * qui est déjà passé DANS la journée reste affiché, parce qu'un coach qui
 * ouvre son écran à 15 h veut voir sa journée entière, pas seulement la fin.
 */
export function agendaView<T extends Pick<Booking, "status" | "starts_at" | "paid" | "hold_until" | "price_cents">>(
  bookings: readonly T[],
  opts: { now: Date; timezone: string; days?: number },
): AgendaView<T> {
  const days = Math.max(1, Math.min(30, opts.days ?? 7));
  const todayKey = dayKey(opts.now, opts.timezone);
  const vivants = bookings.filter(isLive).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const today: T[] = [];
  const parJour = new Map<string, T[]>();
  for (const b of vivants) {
    const k = dayKey(new Date(b.starts_at), opts.timezone);
    if (k === todayKey) today.push(b);
    else if (k > todayKey) {
      const list = parJour.get(k) ?? [];
      list.push(b);
      parJour.set(k, list);
    }
  }

  const next = [...parJour.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, days)
    .map(([key, items]) => ({ key, items }));

  const futurs = vivants.filter((b) => new Date(b.starts_at).getTime() >= opts.now.getTime());
  return {
    today,
    next,
    upcoming: futurs.length,
    pending: futurs.filter((b) => b.status === "pending").length,
    awaitingPayment: futurs.filter((b) => awaitingPayment(b)).length,
  };
}

export interface BookingFigures {
  /** Rendez-vous vivants encore à venir. */
  upcoming: number;
  /** En attente de validation du coach. */
  pending: number;
  /** Séances honorées sur la fenêtre lue. */
  done: number;
  /** Séances où le client n'est pas venu. */
  noShow: number;
  /** Annulées sur la fenêtre. */
  cancelled: number;
  /** Encaissé sur les séances payées de la fenêtre, en centimes. */
  paidCents: number;
  /** Taux de présence, en pourcentage entier, ou null sans séance terminée. */
  attendancePct: number | null;
}

/**
 * Les chiffres du tableau de bord, sur la fenêtre de rendez-vous fournie.
 *
 * Le taux de présence ne compte QUE ce qui est arrivé à son terme : une
 * séance annulée trois jours avant n'est pas un absentéisme, c'est une
 * annulation, et les mélanger donnerait un chiffre décourageant et faux.
 */
export function bookingFigures(
  bookings: readonly Pick<Booking, "status" | "starts_at" | "paid" | "price_cents" | "hold_until">[],
  now: Date,
): BookingFigures {
  const t = now.getTime();
  const done = bookings.filter((b) => b.status === "done").length;
  const noShow = bookings.filter((b) => b.status === "no_show").length;
  const termine = done + noShow;
  const futurs = bookings.filter((b) => isLive(b) && new Date(b.starts_at).getTime() >= t);
  return {
    upcoming: futurs.length,
    pending: futurs.filter((b) => b.status === "pending").length,
    done,
    noShow,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    paidCents: bookings.filter((b) => b.paid).reduce((s, b) => s + (b.price_cents ?? 0), 0),
    attendancePct: termine ? Math.round((done / termine) * 100) : null,
  };
}
