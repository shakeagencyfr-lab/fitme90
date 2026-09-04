import { describe, it, expect } from "vitest";
import { isThemePreviewMessage, THEME_PREVIEW_TYPE } from "./theme-preview";
import { DEFAULT_THEME } from "./theme";

/**
 * Le pont d'aperçu écoute des messages venant d'une autre fenêtre. Il ne peut
 * donc pas faire confiance à ce qu'il reçoit : la reconnaissance du message est
 * le seul garde-fou entre un brouillon légitime et le bruit d'un autre script.
 */
const bon = { type: THEME_PREVIEW_TYPE, theme: DEFAULT_THEME };

describe("isThemePreviewMessage", () => {
  it("reconnaît un brouillon complet", () => {
    expect(isThemePreviewMessage(bon)).toBe(true);
  });

  it("ignore tout message qui ne porte pas notre discriminant", () => {
    // Les extensions de navigateur et les outils tiers émettent en permanence
    // sur window : sans ce filtre, on réagirait à leur bruit.
    for (const x of [
      { theme: DEFAULT_THEME },
      { type: "autre", theme: DEFAULT_THEME },
      { type: "webpackHotUpdate" },
      "texte",
      42,
      null,
      undefined,
      [],
    ]) {
      expect(isThemePreviewMessage(x)).toBe(false);
    }
  });

  it("refuse un thème incomplet, qui ne rendrait la page qu'à moitié", () => {
    const sansPrimaire: Record<string, unknown> = { ...DEFAULT_THEME };
    delete sansPrimaire.primary;
    expect(isThemePreviewMessage({ type: THEME_PREVIEW_TYPE, theme: sansPrimaire })).toBe(false);
    expect(isThemePreviewMessage({ type: THEME_PREVIEW_TYPE, theme: {} })).toBe(false);
    expect(isThemePreviewMessage({ type: THEME_PREVIEW_TYPE })).toBe(false);
  });

  it("refuse un champ du bon nom mais du mauvais type", () => {
    expect(
      isThemePreviewMessage({ type: THEME_PREVIEW_TYPE, theme: { ...DEFAULT_THEME, primary: 123 } }),
    ).toBe(false);
  });

  it("ne jette jamais, quelle que soit l'entrée", () => {
    for (const x of [Symbol("x"), () => {}, new Map(), NaN]) {
      expect(() => isThemePreviewMessage(x)).not.toThrow();
    }
  });
});
