import { describe, expect, it } from "vitest";
import { translate, localeFromAcceptLanguage, asLocale, DICTS } from "./index";

describe("i18n", () => {
  it("interpolates variables and falls back to French", () => {
    expect(translate("fr", "nav.dayOf", { day: 3, total: 90 })).toBe("Jour 3 / 90");
    expect(translate("en", "nav.dayOf", { day: 3, total: 90 })).toBe("Day 3 / 90");
    expect(translate("en", "common.continue")).toBe("Continue");
  });

  it("picks the first supported Accept-Language", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,fr;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("de-DE,de;q=0.9")).toBeNull();
    expect(localeFromAcceptLanguage("fr-FR")).toBe("fr");
    expect(localeFromAcceptLanguage(null)).toBeNull();
  });

  it("normalises free values", () => {
    expect(asLocale("EN")).toBe("en");
    expect(asLocale("en-GB")).toBe("en");
    expect(asLocale("es")).toBe("fr");
    expect(asLocale(undefined)).toBe("fr");
  });

  it("keeps the same keys in both dictionaries", () => {
    const keys = (o: unknown, p = ""): string[] =>
      typeof o === "string" ? [p] : Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k));
    expect(keys(DICTS.en).sort()).toEqual(keys(DICTS.fr).sort());
  });
});
