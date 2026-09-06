import { describe, it, expect } from "vitest";
import { generationPct, generationStep } from "./generation-progress";

describe("generationPct", () => {
  it("part de zéro et n'atteint jamais 100 % toute seule", () => {
    expect(generationPct(0)).toBe(0);
    expect(generationPct(600)).toBeLessThan(100);
    expect(generationPct(3600)).toBeLessThanOrEqual(99);
  });

  it("avance encore après trois minutes", () => {
    // C'est tout le problème corrigé : l'ancienne barre était figée à 92 %
    // dès la dixième seconde et n'en bougeait plus.
    expect(generationPct(200)).toBeGreaterThan(generationPct(180));
    expect(generationPct(300)).toBeGreaterThan(generationPct(240));
  });

  it("est croissante et ralentit", () => {
    const p = [0, 30, 60, 120, 180, 300].map((s) => generationPct(s));
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i - 1]);
    expect(p[1] - p[0]).toBeGreaterThan(p[5] - p[4]);
  });

  it("passe à 100 % seulement quand le programme est arrivé", () => {
    expect(generationPct(5, true)).toBe(100);
    expect(generationPct(5, false)).toBeLessThan(100);
  });

  it("encaisse un temps négatif (horloge qui recule)", () => {
    expect(generationPct(-10)).toBe(0);
  });
});

describe("generationStep", () => {
  it("avance d'une étape toutes les 40 secondes puis reste sur la dernière", () => {
    expect(generationStep(0, 6)).toBe(0);
    expect(generationStep(39, 6)).toBe(0);
    expect(generationStep(40, 6)).toBe(1);
    expect(generationStep(600, 6)).toBe(5);
  });

  it("saute à la dernière étape quand c'est fini", () => {
    expect(generationStep(3, 6, true)).toBe(5);
  });

  it("ne sort pas des bornes sur une liste vide", () => {
    expect(generationStep(100, 0)).toBe(0);
  });
});
