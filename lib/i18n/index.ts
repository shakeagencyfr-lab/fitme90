// Internationalisation : six langues (fr, en, de, es, it, nl), un dictionnaire
// par langue, une fonction `t` à chemin pointé (« app.nav.program ») avec
// interpolation « {name} ». Le français est la source de vérité : le type du
// dictionnaire dérive du sien, donc une clé manquante dans une autre langue
// casse la compilation.
//
// La langue d'une page vient, dans l'ordre : du cookie `lang` (choix explicite
// de la personne), de la langue du tenant (réglée en marque blanche), de
// l'en-tête Accept-Language, puis du français. Voir lib/i18n/server.ts.
//
// Deux listes : LOCALES, tout ce que la base et le code savent porter ; et
// LIVE_LOCALES, ce qu'on propose vraiment aux visiteurs (bascule, détection
// du navigateur, choix du coach). Une langue entre dans la seconde quand ses
// textes sont complets, jamais avant : un client allemand qui verrait un
// écran moitié anglais moitié français n'a rien gagné.

import { fr } from "./fr";
import { en } from "./en";
import { de } from "./de";
import { es } from "./es";
import { PHRASES_EN } from "./phrases-en";
import { PHRASES_DE } from "./phrases-de";
import { PHRASES_ES } from "./phrases-es";

export type Locale = "fr" | "en" | "de" | "es" | "it" | "nl";
export const LOCALES: readonly Locale[] = ["fr", "en", "de", "es", "it", "nl"] as const;
export const LIVE_LOCALES: readonly Locale[] = ["fr", "en", "de", "es"] as const;
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "lang";

/** Forme du dictionnaire : mêmes clés que le français, valeurs chaînes. */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type Dict = Shape<typeof fr>;
// Tant qu'une langue n'a pas son dictionnaire, elle lit l'anglais : c'est la
// langue de repli de toute l'Europe, et jamais un mélange.
export const DICTS: Record<Locale, Dict> = { fr: fr as Dict, en, de, es, it: en, nl: en };

// Phrases (dashboards, landings) : le français est la clé, chaque langue a sa
// table. Une phrase absente dans une langue tombe sur l'anglais, puis reste
// en français.
const PHRASES: Partial<Record<Locale, Record<string, string>>> = { en: PHRASES_EN, de: PHRASES_DE, es: PHRASES_ES };

/**
 * Un texte par langue, le français obligatoire. `pick` choisit la langue
 * demandée, sinon l'anglais, sinon le français : c'est le repli de toutes les
 * tables locales (échauffements, rayons, échelles).
 */
export type LocalText<T = string> = { fr: T } & Partial<Record<Locale, T>>;

export function pick<T>(table: LocalText<T>, locale: Locale): T {
  return table[locale] ?? table.en ?? table.fr;
}

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function isLiveLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LIVE_LOCALES as readonly string[]).includes(v);
}

/** Normalise une valeur libre (cookie, base, en-tête) en locale connue. */
export function asLocale(v: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (typeof v !== "string") return fallback;
  const base = v.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : fallback;
}

/** Première langue PROPOSÉE d'un en-tête Accept-Language, sinon null. */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const base = tag.split("-")[0];
    if (isLiveLocale(base)) return base;
  }
  return null;
}

type Path<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Path<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TKey = Path<Dict>;

function lookup(dict: Dict, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

/** Traduit une clé ; repli sur l'anglais, puis le français, puis la clé. */
export function translate(locale: Locale, key: TKey, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[locale], key) ?? lookup(en, key) ?? lookup(fr, key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export type TFn = (key: TKey, vars?: Record<string, string | number>) => string;

/** Fabrique un `t` lié à une locale. */
export function makeT(locale: Locale): TFn {
  return (key, vars) => translate(locale, key, vars);
}

/** Consigne de langue pour les prompts IA : le modèle répond dans la langue du client. */
export function aiLanguageInstruction(locale: Locale): string {
  return pick(AI_LANGUAGE, locale);
}

const AI_LANGUAGE: LocalText = {
  fr: "LANGUE : le client parle français. Écris tout en français naturel.",
  en: "LANGUAGE: the client speaks English. Write EVERYTHING in natural English (titles, notes, meal names, explanations), never in French.",
  de: "SPRACHE: Der Kunde spricht Deutsch. Schreibe ALLES in natürlichem Deutsch (Titel, Hinweise, Mahlzeiten, Erklärungen), niemals auf Französisch oder Englisch. Duze den Kunden.",
  es: "IDIOMA: el cliente habla español. Escribe TODO en español natural (títulos, notas, nombres de comidas, explicaciones), nunca en francés ni en inglés. Tutea al cliente.",
  it: "LINGUA: il cliente parla italiano. Scrivi TUTTO in italiano naturale (titoli, note, nomi dei pasti, spiegazioni), mai in francese o in inglese. Dai del tu al cliente.",
  nl: "TAAL: de klant spreekt Nederlands. Schrijf ALLES in natuurlijk Nederlands (titels, opmerkingen, maaltijdnamen, uitleg), nooit in het Frans of Engels. Tutoyeer de klant.",
};

/** Locale Intl pour les dates (fr-FR, en-GB, de-DE…). */
export function dateLocale(locale: Locale): string {
  return DATE_LOCALES[locale];
}

const DATE_LOCALES: Record<Locale, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", nl: "nl-NL" };

/** Locale pour la synthèse et la reconnaissance vocales du navigateur. */
export function speechLocale(locale: Locale): string {
  return SPEECH_LOCALES[locale];
}

const SPEECH_LOCALES: Record<Locale, string> = { fr: "fr-FR", en: "en-US", de: "de-DE", es: "es-ES", it: "it-IT", nl: "nl-NL" };

/** Libellé lisible d'une locale, dans sa propre langue. */
export function localeLabel(locale: Locale): string {
  return LOCALE_LABELS[locale];
}

const LOCALE_LABELS: Record<Locale, string> = { fr: "Français", en: "English", de: "Deutsch", es: "Español", it: "Italiano", nl: "Nederlands" };

/** La locale dont c'est le libellé (« Deutsch » -> de), ou null. */
export function localeFromLabel(label: unknown): Locale | null {
  if (typeof label !== "string") return null;
  const v = label.trim().toLowerCase();
  return LOCALES.find((l) => LOCALE_LABELS[l].toLowerCase() === v) ?? null;
}

/** Traduction « par phrase » (dashboards, landings) : le français est la clé. */
export function translatePhrase(locale: Locale, text: string): string {
  if (locale === "fr") return text;
  return PHRASES[locale]?.[text] ?? PHRASES_EN[text] ?? text;
}
