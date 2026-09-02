// Internationalisation : deux langues (fr, en), un dictionnaire par langue, une
// fonction `t` à chemin pointé (« app.nav.program ») avec interpolation
// « {name} ». Le français est la source de vérité : le type du dictionnaire
// anglais dérive du sien, donc une clé manquante en anglais casse la compilation.
//
// La langue d'une page vient, dans l'ordre : du cookie `lang` (choix explicite
// de la personne), de la langue du tenant (réglée en marque blanche), de
// l'en-tête Accept-Language, puis du français. Voir lib/i18n/server.ts.

import { fr } from "./fr";
import { en } from "./en";

export type Locale = "fr" | "en";
export const LOCALES: readonly Locale[] = ["fr", "en"] as const;
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "lang";

/** Forme du dictionnaire : mêmes clés que le français, valeurs chaînes. */
export type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type Dict = Shape<typeof fr>;
export const DICTS: Record<Locale, Dict> = { fr: fr as Dict, en };

export function isLocale(v: unknown): v is Locale {
  return v === "fr" || v === "en";
}

/** Normalise une valeur libre (cookie, base, en-tête) en locale connue. */
export function asLocale(v: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (typeof v !== "string") return fallback;
  const base = v.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : fallback;
}

/** Première langue supportée d'un en-tête Accept-Language, sinon null. */
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
    if (isLocale(base)) return base;
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

/** Traduit une clé ; repli sur le français puis sur la clé elle-même. */
export function translate(locale: Locale, key: TKey, vars?: Record<string, string | number>): string {
  const raw = lookup(DICTS[locale], key) ?? lookup(fr, key) ?? key;
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
  return locale === "en"
    ? "LANGUAGE: the client speaks English. Write EVERYTHING in natural English (titles, notes, meal names, explanations), never in French."
    : "LANGUE : le client parle français. Écris tout en français naturel.";
}

/** Locale Intl pour les dates (fr-FR / en-GB). */
export function dateLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "fr-FR";
}

/** Libellé lisible d'une locale, dans sa propre langue. */
export function localeLabel(locale: Locale): string {
  return locale === "en" ? "English" : "Français";
}
