import { APP_TIMEZONE } from "@/lib/config";

/**
 * Dates CALENDAIRES dans le fuseau de l'application. Pur, sans dépendance.
 *
 * Le serveur (Vercel) vit en UTC ; les clients vivent à Paris. Entre 0 h et
 * 2 h du matin l'été (0 h et 1 h l'hiver), les deux ne sont pas le même jour.
 * Tout ce qui répond à « quel jour sommes-nous ? » passe par ici.
 */

/** Année, mois (1-12), jour du mois de `now`, lus dans le fuseau donné. */
export function localDateParts(now: Date, timeZone = APP_TIMEZONE): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const num = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: num("year"), m: num("month"), d: num("day") };
}

/** Minuit UTC de la date calendaire locale de `now` (pour compter des jours). */
export function localDayUTC(now: Date, timeZone = APP_TIMEZONE): number {
  const { y, m, d } = localDateParts(now, timeZone);
  return Date.UTC(y, m - 1, d);
}

/** « YYYY-MM-DD » du jour local. */
export function todayIso(now: Date = new Date(), timeZone = APP_TIMEZONE): string {
  const { y, m, d } = localDateParts(now, timeZone);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * « YYYY-MM-DD » d'une date selon l'horloge LOCALE du navigateur (composants
 * client). `toISOString()` donnait la date UTC : à 0 h 30 à Paris, la veille.
 */
export function browserLocalIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
