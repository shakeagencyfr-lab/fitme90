import { describe, expect, it } from "vitest";
import { availableSlots, nextSlot, slotIsAvailable } from "./booking-slots";
import { dayKey, humanTime, instantOf, isTimezone, shiftDayKey, timeKey, tzOffsetMinutes, weekdayOfKey, zonedParts, zonedTime } from "./booking-time";

const TZ = "Europe/Paris";

describe("booking-time", () => {
  it("connaît les fuseaux", () => {
    expect(isTimezone("Europe/Paris")).toBe(true);
    expect(isTimezone("Europe/Lisbon")).toBe(true);
    expect(isTimezone("Mars/Olympus")).toBe(false);
    expect(isTimezone("")).toBe(false);
  });

  it("lit un instant dans le fuseau, heure d'été comprise", () => {
    const p = zonedParts(new Date("2026-07-14T08:30:00Z"), TZ);
    expect(p).toMatchObject({ year: 2026, month: 7, day: 14, hour: 10, minute: 30, weekday: 1 });
    expect(tzOffsetMinutes(new Date("2026-07-14T08:30:00Z"), TZ)).toBe(120);
    expect(tzOffsetMinutes(new Date("2026-01-14T08:30:00Z"), TZ)).toBe(60);
  });

  it("retrouve l'instant d'une heure locale, des deux côtés du changement d'heure", () => {
    expect(zonedTime(2026, 7, 14, 10, 30, TZ).toISOString()).toBe("2026-07-14T08:30:00.000Z");
    expect(zonedTime(2026, 1, 14, 10, 30, TZ).toISOString()).toBe("2026-01-14T09:30:00.000Z");
    // Lisbonne est à UTC+1 en été : 10 h 30 là-bas, c'est 9 h 30 UTC.
    expect(zonedTime(2026, 7, 14, 10, 30, "Europe/Lisbon").toISOString()).toBe("2026-07-14T09:30:00.000Z");
  });

  it("le jour qui suit le passage à l'heure d'été garde ses heures locales", () => {
    // En 2026, l'Europe passe à l'heure d'été le dimanche 29 mars.
    expect(timeKey(zonedTime(2026, 3, 29, 12, 0, TZ), TZ)).toBe("12:00");
    expect(timeKey(zonedTime(2026, 3, 30, 9, 0, TZ), TZ)).toBe("09:00");
  });

  it("clés de jour", () => {
    expect(dayKey(new Date("2026-09-06T22:30:00Z"), TZ)).toBe("2026-09-07");
    expect(shiftDayKey("2026-02-27", 3)).toBe("2026-03-02");
    expect(weekdayOfKey("2026-09-07")).toBe(0); // lundi
    expect(weekdayOfKey("2026-09-06")).toBe(6); // dimanche
    expect(instantOf("2026-09-07", "10:00", TZ)?.toISOString()).toBe("2026-09-07T08:00:00.000Z");
    expect(instantOf("2026-02-31", "10:00", TZ)).toBeNull();
    expect(instantOf("2026-09-07", "25:00", TZ)).toBeNull();
  });

  it("écrit l'heure à la française et à l'anglaise", () => {
    const d = zonedTime(2026, 9, 7, 10, 30, TZ);
    expect(humanTime(d, TZ, "fr")).toBe("10 h 30");
    expect(humanTime(zonedTime(2026, 9, 7, 9, 0, TZ), TZ, "fr")).toBe("9 h");
    expect(humanTime(d, TZ, "en")).toBe("10:30");
  });
});

describe("availableSlots", () => {
  // Lundi 7 septembre 2026, 9 h à 12 h et 14 h à 17 h ; mardi 9 h à 11 h.
  const hours = [
    { weekday: 0, startMin: 540, endMin: 720 },
    { weekday: 0, startMin: 840, endMin: 1020 },
    { weekday: 1, startMin: 540, endMin: 660 },
  ];
  const now = zonedTime(2026, 9, 5, 8, 0, TZ); // samedi 5, 8 h
  const base = { tz: TZ, hours, busy: [], durationMin: 60, stepMin: 30, bufferMin: 0, minNoticeHours: 12, maxAdvanceDays: 30, now, fromDay: "2026-09-07", days: 2 };
  const times = (d: { slots: Date[] }) => d.slots.map((s) => timeKey(s, TZ));

  it("propose les départs qui tiennent dans les plages", () => {
    const out = availableSlots(base);
    expect(out.map((d) => d.day)).toEqual(["2026-09-07", "2026-09-08"]);
    expect(times(out[0])).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00"]);
    expect(times(out[1])).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("retire ce qui chevauche un rendez-vous, battement compris", () => {
    const busy = [{ start: zonedTime(2026, 9, 7, 10, 0, TZ), end: zonedTime(2026, 9, 7, 11, 0, TZ) }];
    expect(times(availableSlots({ ...base, busy })[0])).toEqual(["09:00", "11:00", "14:00", "14:30", "15:00", "15:30", "16:00"]);
    // Battement de 15 min : 9 h finirait à 10 h, à moins d'un quart d'heure du
    // rendez-vous ; 11 h partirait un quart d'heure trop tôt après lui.
    expect(times(availableSlots({ ...base, busy, bufferMin: 15 })[0])).toEqual(["14:00", "14:30", "15:00", "15:30", "16:00"]);
  });

  it("respecte le délai minimal et l'horizon", () => {
    const late = zonedTime(2026, 9, 7, 9, 45, TZ);
    // Délai de 1 h : rien avant 10 h 45, donc premier départ 11 h.
    expect(times(availableSlots({ ...base, now: late, minNoticeHours: 1 })[0])).toEqual(["11:00", "14:00", "14:30", "15:00", "15:30", "16:00"]);
    // Horizon d'un jour à partir de samedi : lundi est hors de portée.
    expect(availableSlots({ ...base, maxAdvanceDays: 1 })).toEqual([]);
  });

  it("une absence ferme les créneaux comme un rendez-vous", () => {
    const busy = [{ start: zonedTime(2026, 9, 7, 0, 0, TZ), end: zonedTime(2026, 9, 8, 0, 0, TZ) }];
    const out = availableSlots({ ...base, busy });
    expect(out.map((d) => d.day)).toEqual(["2026-09-08"]);
  });

  it("une durée plus longue réduit les départs", () => {
    expect(times(availableSlots({ ...base, durationMin: 120 })[0])).toEqual(["09:00", "09:30", "10:00", "14:00", "14:30", "15:00"]);
  });

  it("vérifie un départ précis et trouve le prochain", () => {
    const q = { ...base };
    expect(slotIsAvailable(q, zonedTime(2026, 9, 7, 9, 30, TZ))).toBe(true);
    expect(slotIsAvailable(q, zonedTime(2026, 9, 7, 9, 45, TZ))).toBe(false);
    expect(slotIsAvailable(q, zonedTime(2026, 9, 7, 12, 0, TZ))).toBe(false);
    expect(nextSlot(q)?.toISOString()).toBe(zonedTime(2026, 9, 7, 9, 0, TZ).toISOString());
  });
});
