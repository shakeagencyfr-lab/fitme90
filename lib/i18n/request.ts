import "server-only";
import { cache } from "react";
import { dateLocale, DEFAULT_LOCALE, translatePhrase, type Locale } from "./index";

// Locale « de requête » pour les composants serveur : posée une fois par le
// layout (setRequestLocale), lue de façon synchrone par p(). React cache() est
// isolé par requête, donc aucune fuite entre visiteurs.
const store = cache(() => ({ locale: DEFAULT_LOCALE as Locale }));

export function setRequestLocale(locale: Locale): void {
  store().locale = locale;
}

export function getRequestLocale(): Locale {
  return store().locale;
}

/** Traduit une phrase française (dashboards, landings) dans la locale de la requête. */
export function tx(text: string): string {
  return translatePhrase(store().locale, text);
}

/** Locale Intl (« de-DE ») de la requête, pour formater dates et nombres. */
export function fmtLocale(): string {
  return dateLocale(store().locale);
}
