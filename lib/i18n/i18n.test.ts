import { describe, expect, it } from "vitest";
import { translate, localeFromAcceptLanguage, asLocale, localeFromLabel, translatePhrase, DICTS, LIVE_LOCALES, LOCALES } from "./index";

describe("i18n", () => {
  it("interpolates variables and falls back to French", () => {
    expect(translate("fr", "nav.dayOf", { day: 3, total: 90 })).toBe("Jour 3 / 90");
    expect(translate("en", "nav.dayOf", { day: 3, total: 90 })).toBe("Day 3 / 90");
    expect(translate("en", "common.continue")).toBe("Continue");
  });

  it("picks the first supported Accept-Language", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    // L'allemand existe dans le code mais n'est pas encore proposé : le
    // navigateur ne l'obtient pas tant que ses textes ne sont pas complets.
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9")).toBe(LIVE_LOCALES.includes("de") ? "de" : null);
    expect(localeFromAcceptLanguage("fr-FR")).toBe("fr");
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });

  it("normalises free values", () => {
    expect(asLocale("EN")).toBe("en");
    expect(asLocale("en-GB")).toBe("en");
    expect(asLocale("es")).toBe("es");
    expect(asLocale("pt")).toBe("fr");
    expect(asLocale(undefined)).toBe("fr");
  });

  it("keeps the same keys in every dictionary", () => {
    const keys = (o: unknown, p = ""): string[] =>
      typeof o === "string" ? [p] : Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k));
    const ref = keys(DICTS.fr).sort();
    for (const l of LOCALES) expect(keys(DICTS[l]).sort()).toEqual(ref);
  });

  it("maps a language label back to its locale", () => {
    expect(localeFromLabel("Deutsch")).toBe("de");
    expect(localeFromLabel("english")).toBe("en");
    expect(localeFromLabel("Klingon")).toBeNull();
  });

  it("falls back to English for a phrase missing in another language", () => {
    expect(translatePhrase("fr", "Chat avec mes clients")).toBe("Chat avec mes clients");
    expect(translatePhrase("en", "Chat avec mes clients")).toBe("Chat with my clients");
    expect(translatePhrase("de", "Chat avec mes clients")).not.toBe("Chat avec mes clients");
  });
});
