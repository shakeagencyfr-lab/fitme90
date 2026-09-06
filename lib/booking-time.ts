/**
 * Dates et heures DANS LE FUSEAU DU COACH, sans bibliothèque.
 *
 * Un rendez-vous se prend « mardi à 10 h » à Lisbonne, à Berlin ou à Paris, et
 * le serveur, lui, vit en UTC. Toutes les conversions passent par ici, à
 * partir du fuseau IANA du compte (`tenants.timezone`, « Europe/Paris » par
 * défaut). Le moteur repose sur Intl, présent partout où l'app tourne, et sur
 * une seule astuce : l'écart entre l'instant et sa lecture locale donne le
 * décalage du fuseau à cet instant, heure d'été comprise.
 */

import { dateLocale, type Locale } from "@/lib/i18n";
export interface ZonedParts {
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  hour: number;
  minute: number;
  /** 0 = lundi ... 6 = dimanche : l'ordre des semaines européennes. */
  weekday: number;
}

const cache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string): Intl.DateTimeFormat {
  let f = cache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    cache.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Le fuseau existe-t-il ? (« Europe/Paris » oui, « Mars/Olympus » non.) */
export function isTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const DEFAULT_TIMEZONE = "Europe/Paris";

/** Lecture locale d'un instant. */
export function zonedParts(date: Date, tz: string): ZonedParts {
  const parts = fmt(tz).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: Math.max(0, WEEKDAYS.indexOf(get("weekday"))),
  };
}

/** Décalage du fuseau à cet instant, en minutes (Paris en été : +120). */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, 0);
  // On compare à la minute près : les secondes de l'instant ne comptent pas.
  const truncated = Math.floor(date.getTime() / 60000) * 60000;
  return Math.round((asUtc - truncated) / 60000);
}

/**
 * L'instant qui se lit « année-mois-jour heure:minute » dans ce fuseau.
 *
 * Deux passes : on part de l'heure lue comme UTC, on retranche le décalage
 * qu'on y trouve, puis on corrige une fois si on est tombé sur un changement
 * d'heure. Une heure locale qui n'existe pas (le passage à l'heure d'été)
 * glisse d'une heure, comme le font les agendas.
 */
export function zonedTime(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const off1 = tzOffsetMinutes(new Date(guess), tz);
  const first = guess - off1 * 60000;
  const off2 = tzOffsetMinutes(new Date(first), tz);
  return off1 === off2 ? new Date(first) : new Date(guess - off2 * 60000);
}

/** « 2026-09-06 » d'un instant, dans le fuseau. */
export function dayKey(date: Date, tz: string): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Les trois nombres d'un « 2026-09-06 », ou null. */
export function parseDayKey(key: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key ?? "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Rejette un 31 février : la date reconstruite doit relire pareil.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return { year, month, day };
}

/** Minuit local du jour donné (clé « 2026-09-06 »), comme instant. */
export function startOfDay(key: string, tz: string): Date | null {
  const p = parseDayKey(key);
  return p ? zonedTime(p.year, p.month, p.day, 0, 0, tz) : null;
}

/** La clé du jour, décalée de n jours (calendrier, pas 24 h : robuste aux changements d'heure). */
export function shiftDayKey(key: string, n: number): string {
  const p = parseDayKey(key);
  if (!p) return key;
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Jour de semaine (0 = lundi) d'une clé de jour. */
export function weekdayOfKey(key: string): number {
  const p = parseDayKey(key);
  if (!p) return 0;
  // getUTCDay : 0 = dimanche. On ramène lundi en tête.
  return (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7;
}

/** « 10:30 » d'un instant, dans le fuseau. */
export function timeKey(date: Date, tz: string): string {
  const p = zonedParts(date, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Instant d'une clé de jour et d'une heure « 10:30 », dans le fuseau. */
export function instantOf(key: string, hm: string, tz: string): Date | null {
  const p = parseDayKey(key);
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm ?? "").trim());
  if (!p || !m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return zonedTime(p.year, p.month, p.day, h, mi, tz);
}

/** Date lisible (« mardi 8 septembre »), dans le fuseau et la langue. */
export function humanDate(date: Date, tz: string, locale: Locale, withYear = false): string {
  return date.toLocaleDateString(dateLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: tz,
  });
}

/** Heure lisible (« 10:30 » partout, « 10 h 30 » en français). */
export function humanTime(date: Date, tz: string, locale: Locale): string {
  const k = timeKey(date, tz);
  if (locale !== "fr") return k;
  const [h, m] = k.split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}
