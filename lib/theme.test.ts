import { describe, it, expect } from "vitest";
import {
  normalizeHex,
  normalizeTheme,
  themeVars,
  themeAttrs,
  isDefaultTheme,
  DEFAULT_THEME,
  STYLE_THEMES,
  COLOR_PRESETS,
  FONT_KEYS,
  HEADING_FONTS,
  BODY_FONTS,
  LOGO_MIN,
  LOGO_MAX,
} from "./theme";

/**
 * Ces valeurs finissent dans des variables CSS servies sur la page publique
 * d'un coach. Une chaîne qui passe sans contrôle, et c'est du CSS arbitraire
 * injecté par quiconque sait poster un formulaire. Les tests portent donc
 * d'abord sur ce qui est REFUSÉ.
 */

describe("couleurs", () => {
  it("accepte un hex à six chiffres, avec ou sans dièse", () => {
    expect(normalizeHex("#E0551F")).toBe("#e0551f");
    expect(normalizeHex("e0551f")).toBe("#e0551f");
    expect(normalizeHex("  #abcdef  ")).toBe("#abcdef");
  });

  it("refuse tout le reste", () => {
    for (const mauvais of ["", "red", "#fff", "#12345g", "rgb(1,2,3)", "#e0551f;}", "url(x)", "#e0551f #000"]) {
      expect(normalizeHex(mauvais)).toBeNull();
    }
  });

  it("ne laisse aucune couleur douteuse entrer dans le thème", () => {
    const t = normalizeTheme({ primary: "red;}body{display:none", accent: "url(//evil)", success: 42, danger: null });
    expect(t.primary).toBe(DEFAULT_THEME.primary);
    expect(t.accent).toBe(DEFAULT_THEME.accent);
    expect(t.success).toBe(DEFAULT_THEME.success);
    expect(t.danger).toBe(DEFAULT_THEME.danger);
  });
});

describe("relecture d'un thème", () => {
  it("retombe entièrement sur le défaut quand l'entrée n'a rien d'exploitable", () => {
    for (const rien of [null, undefined, 0, "", "texte", [], { inconnu: 1 }]) {
      expect(normalizeTheme(rien)).toEqual(DEFAULT_THEME);
    }
  });

  it("refuse une police, un fond, un style ou un rayon hors liste", () => {
    const t = normalizeTheme({ headingFont: "comic-sans", bodyFont: "../../etc", background: "javascript:", card: "x", corners: "y" });
    expect(t.headingFont).toBe(DEFAULT_THEME.headingFont);
    expect(t.bodyFont).toBe(DEFAULT_THEME.bodyFont);
    expect(t.background).toBe(DEFAULT_THEME.background);
    expect(t.card).toBe(DEFAULT_THEME.card);
    expect(t.corners).toBe(DEFAULT_THEME.corners);
  });

  it("garde ce qui est valide", () => {
    const t = normalizeTheme({ primary: "#5b5bd6", headingFont: "sora", background: "glow", card: "glass", corners: "sharp" });
    expect(t).toMatchObject({ primary: "#5b5bd6", headingFont: "sora", background: "glow", card: "glass", corners: "sharp" });
  });

  it("borne la taille du logo au lieu de la refuser", () => {
    // Un curseur d'interface ne devrait jamais sortir des bornes, mais un POST
    // direct le peut : un logo de 9000 px casserait le menu.
    expect(normalizeTheme({ logoScale: 9000 }).logoScale).toBe(LOGO_MAX);
    expect(normalizeTheme({ logoScale: -5 }).logoScale).toBe(LOGO_MIN);
    expect(normalizeTheme({ logoScale: "abc" }).logoScale).toBe(DEFAULT_THEME.logoScale);
    expect(normalizeTheme({ logoScale: 41.6 }).logoScale).toBe(42);
  });

  it("lit le mouvement aussi bien depuis une case cochée que depuis un booléen", () => {
    expect(normalizeTheme({ backgroundMotion: true }).backgroundMotion).toBe(true);
    expect(normalizeTheme({ backgroundMotion: "on" }).backgroundMotion).toBe(true);
    expect(normalizeTheme({ backgroundMotion: "off" }).backgroundMotion).toBe(false);
    expect(normalizeTheme({}).backgroundMotion).toBe(false);
  });

  it("est stable : relire un thème déjà normalisé ne le change pas", () => {
    const une = normalizeTheme({ primary: "#0891b2", headingFont: "manrope", logoScale: 48 });
    expect(normalizeTheme(une)).toEqual(une);
  });
});

describe("variables CSS", () => {
  it("ne produit que des valeurs sûres, même sur un thème hostile en entrée", () => {
    const vars = themeVars(normalizeTheme({ primary: "#fff}html{x", corners: "sharp" }));
    for (const v of Object.values(vars)) {
      // Rien qui puisse fermer une déclaration ou charger une ressource.
      expect(v).not.toMatch(/[;{}]/);
      expect(v).not.toMatch(/url\(/i);
    }
  });

  it("dérive une couleur de survol de la couleur principale", () => {
    const vars = themeVars(normalizeTheme({ primary: "#0891b2" }));
    expect(vars["--color-brand"]).toBe("#0891b2");
    expect(vars["--color-brand-hover"]).toContain("#0891b2");
  });

  it("branche les polices sur les variables next/font correspondantes", () => {
    const vars = themeVars(normalizeTheme({ headingFont: "fraunces", bodyFont: "inter" }));
    expect(vars["--font-archivo"]).toBe("var(--font-wl-fraunces)");
    expect(vars["--font-plex"]).toBe("var(--font-wl-inter)");
  });

  it("change réellement les rayons selon le style de coins", () => {
    const doux = themeVars(normalizeTheme({ corners: "soft" }))["--radius-card"];
    const vifs = themeVars(normalizeTheme({ corners: "sharp" }))["--radius-card"];
    expect(doux).not.toBe(vifs);
    expect(parseInt(doux, 10)).toBeGreaterThan(parseInt(vifs, 10));
  });

  it("porte la taille du logo choisie", () => {
    expect(themeVars(normalizeTheme({ logoScale: 48 }))["--wl-logo-h"]).toBe("48px");
  });
});

describe("attributs d'apparence", () => {
  it("expose le fond et le style de cartes", () => {
    const a = themeAttrs(normalizeTheme({ background: "grid", card: "glass" }));
    expect(a["data-wl-bg"]).toBe("grid");
    expect(a["data-wl-card"]).toBe("glass");
  });

  it("n'anime rien sur un fond uni, même mouvement demandé", () => {
    // Il n'y a rien à animer : l'attribut ferait tourner une animation pour
    // aucun pixel visible.
    expect(themeAttrs(normalizeTheme({ background: "plain", backgroundMotion: true }))["data-wl-motion"]).toBeUndefined();
    expect(themeAttrs(normalizeTheme({ background: "glow", backgroundMotion: true }))["data-wl-motion"]).toBe("on");
  });
});

describe("thèmes et palettes prêts à l'emploi", () => {
  it("ne propose que des polices et des réglages connus", () => {
    for (const th of STYLE_THEMES) {
      expect(normalizeTheme({ ...DEFAULT_THEME, ...th.patch })).toMatchObject(th.patch);
    }
  });

  it("n'offre pour les titres et le corps que des familles de la palette", () => {
    for (const k of [...HEADING_FONTS, ...BODY_FONTS]) expect(FONT_KEYS).toContain(k);
    expect(HEADING_FONTS.length).toBeGreaterThan(1);
    expect(BODY_FONTS.length).toBeGreaterThan(1);
  });

  it("propose des couleurs valides et des clés uniques", () => {
    for (const p of COLOR_PRESETS) {
      expect(normalizeHex(p.primary)).toBe(p.primary);
      expect(normalizeHex(p.accent)).toBe(p.accent);
    }
    expect(new Set(COLOR_PRESETS.map((p) => p.key)).size).toBe(COLOR_PRESETS.length);
    expect(new Set(STYLE_THEMES.map((t) => t.key)).size).toBe(STYLE_THEMES.length);
  });

  it("reconnaît le thème par défaut, pour ne rien injecter inutilement", () => {
    expect(isDefaultTheme(DEFAULT_THEME)).toBe(true);
    expect(isDefaultTheme(normalizeTheme({ primary: "#0891b2" }))).toBe(false);
  });

  it("donne à chaque thème une couleur principale lisible sur fond clair", () => {
    // Elle sert de fond de bouton avec du texte blanc : trop claire, le libellé
    // devient illisible.
    for (const t of STYLE_THEMES) {
      const [r, v, b] = [1, 3, 5].map((i) => parseInt(t.patch.primary.slice(i, i + 2), 16));
      const lum = (0.2126 * r + 0.7152 * v + 0.0722 * b) / 255;
      expect(lum, `${t.label} (${t.patch.primary})`).toBeLessThan(0.55);
    }
  });
});
