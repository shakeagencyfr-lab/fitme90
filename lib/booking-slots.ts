/**
 * Le moteur des créneaux : à partir des horaires d'un planning, de ses
 * absences, des rendez-vous déjà pris et des règles du coach, quels départs
 * peut-on proposer pour une prestation d'une durée donnée ?
 *
 * PUR. Aucune base, aucune horloge implicite : `now` se passe en argument,
 * et c'est ce qui rend le calcul testable à la minute près, changement
 * d'heure compris. Le même moteur sert l'écran du client, le Coach IA et la
 * vérification côté serveur au moment d'enregistrer (un créneau proposé hier
 * peut avoir été pris entre-temps : on recalcule toujours avant d'écrire).
 */

import type { HoursRange } from "@/lib/booking-rules";
import { dayKey, instantOf, shiftDayKey, weekdayOfKey } from "@/lib/booking-time";

/** Un intervalle occupé : rendez-vous existant ou absence. */
export interface Busy {
  start: Date;
  end: Date;
}

export interface SlotQuery {
  tz: string;
  hours: readonly HoursRange[];
  /** Rendez-vous déjà pris ET absences, dans le même sac. */
  busy: readonly Busy[];
  durationMin: number;
  stepMin: number;
  bufferMin: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  now: Date;
  /** Premier jour à examiner (clé « 2026-09-06 » dans le fuseau). Défaut : aujourd'hui. */
  fromDay?: string;
  /** Nombre de jours à examiner à partir de `fromDay`. Défaut : 14. */
  days?: number;
}

export interface DaySlots {
  day: string;
  slots: Date[];
}

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

/**
 * Les créneaux libres, jour par jour. Un jour sans créneau n'apparaît pas.
 *
 * Un créneau est un départ tel que [départ, départ + durée + battement]
 * tient dans une plage d'ouverture, ne touche ni un rendez-vous ni une
 * absence (avec le battement de chaque côté), respecte le délai minimal et ne
 * dépasse pas l'horizon de réservation.
 */
export function availableSlots(q: SlotQuery): DaySlots[] {
  const days = Math.max(1, Math.min(60, q.days ?? 14));
  const from = q.fromDay ?? dayKey(q.now, q.tz);
  const notBefore = q.now.getTime() + q.minNoticeHours * 3600000;
  const horizon = q.now.getTime() + q.maxAdvanceDays * 86400000;
  const step = Math.max(5, q.stepMin);
  const dur = q.durationMin * 60000;
  const buf = Math.max(0, q.bufferMin) * 60000;
  const busy = q.busy.map((b) => ({ s: b.start.getTime() - buf, e: b.end.getTime() + buf }));

  const out: DaySlots[] = [];
  for (let i = 0; i < days; i++) {
    const key = shiftDayKey(from, i);
    const wd = weekdayOfKey(key);
    const ranges = q.hours.filter((h) => h.weekday === wd);
    if (!ranges.length) continue;
    const slots: Date[] = [];
    for (const r of ranges) {
      for (let m = r.startMin; m + q.durationMin <= r.endMin; m += step) {
        const start = instantOf(key, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, q.tz);
        if (!start) continue;
        const s = start.getTime();
        const e = s + dur;
        if (s < notBefore || s > horizon) continue;
        if (busy.some((b) => overlaps(s, e, b.s, b.e))) continue;
        slots.push(start);
      }
    }
    if (slots.length) out.push({ day: key, slots: slots.sort((a, b) => a.getTime() - b.getTime()) });
  }
  return out;
}

/** Ce départ précis est-il proposable ? (Vérification avant d'écrire.) */
export function slotIsAvailable(q: Omit<SlotQuery, "fromDay" | "days">, start: Date): boolean {
  const key = dayKey(start, q.tz);
  const day = availableSlots({ ...q, fromDay: key, days: 1 })[0];
  return !!day && day.slots.some((s) => s.getTime() === start.getTime());
}

/** Le premier créneau libre à partir de maintenant, ou null. */
export function nextSlot(q: Omit<SlotQuery, "fromDay" | "days">): Date | null {
  const d = availableSlots({ ...q, days: Math.min(60, q.maxAdvanceDays + 1) });
  return d[0]?.slots[0] ?? null;
}
