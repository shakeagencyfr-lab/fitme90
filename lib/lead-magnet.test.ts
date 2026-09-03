import { describe, it, expect } from "vitest";
import { buildMiniProgram, GOALS, LEVELS, EQUIPMENTS, type LeadAnswers } from "./lead-magnet";

const base: LeadAnswers = { goal: "muscle", level: "intermediaire", days: 3, equipment: "salle" };

describe("buildMiniProgram", () => {
  it("génère le bon nombre de séances (borné 2..4)", () => {
    expect(buildMiniProgram({ ...base, days: 3 }).sessions).toHaveLength(3);
    expect(buildMiniProgram({ ...base, days: 1 }).sessions).toHaveLength(2);
    expect(buildMiniProgram({ ...base, days: 9 }).sessions).toHaveLength(4);
  });

  it("adapte le volume au niveau", () => {
    const two = { ...base, days: 2 };
    const inter = buildMiniProgram(two).sessions[0].exercises[0].sets;
    const deb = buildMiniProgram({ ...two, level: "debutant" }).sessions[0].exercises[0].sets;
    const adv = buildMiniProgram({ ...two, level: "avance" }).sessions[0].exercises[0].sets;
    expect(deb).toBeLessThan(inter);
    expect(adv).toBeGreaterThan(inter);
  });

  it("produit un document complet pour toutes les combinaisons", () => {
    for (const goal of GOALS) for (const level of LEVELS) for (const equipment of EQUIPMENTS) {
      const p = buildMiniProgram({ goal, level, days: 3, equipment });
      const id = `${goal}/${level}/${equipment}`;
      expect(p.sessions.length, id).toBe(3);
      expect(p.weekPlan.length, id).toBe(7);
      expect(p.loadGuide.length, id).toBeGreaterThan(0);
      expect(p.progression.length, id).toBeGreaterThan(0);
      expect(p.nutrition.rules.length, id).toBeGreaterThan(0);
      expect(p.nutrition.sampleDay.length, id).toBeGreaterThan(0);
      expect(p.nutrition.shopping.length, id).toBeGreaterThan(0);
      expect(p.tips.length, id).toBeGreaterThan(0);
      expect(p.next.length, id).toBeGreaterThan(0);
      for (const s of p.sessions) {
        expect(s.exercises.length, id).toBeGreaterThan(0);
        expect(s.warmup.length, id).toBeGreaterThan(0);
      }
    }
  });
});

describe("la semaine est un vrai calendrier", () => {
  it("sept jours, aucun trou", () => {
    const p = buildMiniProgram(base);
    expect(p.weekPlan).toHaveLength(7);
    for (const d of p.weekPlan) {
      expect(d.label).not.toBe("");
      expect(d.title).not.toBe("");
      expect(d.note).not.toBe("");
      // Un jour de repos SANS CONSIGNE se transforme vite en semaine vide :
      // c'est là qu'il faut une phrase, pas sur les jours de séance où la
      // note est simplement le groupe travaillé (« Full-body »).
      if (d.kind === "rest") expect(d.note.length).toBeGreaterThan(25);
    }
  });

  it("autant de jours de séance que de séances", () => {
    for (const days of [2, 3, 4]) {
      const p = buildMiniProgram({ ...base, days });
      expect(p.weekPlan.filter((d) => d.kind === "session")).toHaveLength(days);
    }
  });

  it("chaque séance apparaît une fois et une seule dans la semaine", () => {
    const p = buildMiniProgram({ ...base, days: 4 });
    const titles = p.weekPlan.filter((d) => d.kind === "session").map((d) => d.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(titles).toEqual(p.sessions.map((s) => s.title));
  });

  it("deux séances ne s'enchaînent pas sur trois jours par semaine", () => {
    const kinds = buildMiniProgram({ ...base, days: 3 }).weekPlan.map((d) => d.kind);
    for (let i = 1; i < kinds.length; i++) {
      expect(kinds[i] === "session" && kinds[i - 1] === "session").toBe(false);
    }
  });
});

describe("chaque exercice est exploitable seul", () => {
  it("porte une consigne technique et un remplacement", () => {
    for (const equipment of EQUIPMENTS) {
      const p = buildMiniProgram({ ...base, equipment });
      for (const s of p.sessions) {
        for (const e of s.exercises) {
          expect(e.cue.length, `${equipment}/${e.name}`).toBeGreaterThan(15);
          expect(e.alt.length, `${equipment}/${e.name}`).toBeGreaterThan(10);
        }
      }
    }
  });

  it("le finisher ne tombe que sur la dernière séance", () => {
    // Un finisher sur chaque séance allonge la semaine sans rien apporter.
    const p = buildMiniProgram({ ...base, goal: "perte", days: 3 });
    expect(p.sessions.slice(0, -1).every((s) => s.finisher === null)).toBe(true);
    expect(p.sessions.at(-1)!.finisher).toBeTruthy();
  });
});

describe("cible protéines", () => {
  it("chiffrée quand le poids est connu", () => {
    const p = buildMiniProgram({ ...base, weightKg: 80 });
    expect(p.nutrition.proteinTarget).toContain("128"); // 80 × 1,6
    expect(p.nutrition.proteinTarget).toContain("160"); // 80 × 2,0
  });

  it("la perte de gras vise plus haut, pour la satiété", () => {
    const perte = buildMiniProgram({ ...base, goal: "perte", weightKg: 80 }).nutrition.proteinTarget!;
    expect(perte).toContain("144"); // 80 × 1,8
    expect(perte).toContain("176"); // 80 × 2,2
  });

  it("rien d'annoncé sans poids, ou avec un poids absurde", () => {
    expect(buildMiniProgram(base).nutrition.proteinTarget).toBeNull();
    for (const w of [0, -5, 12, 400, NaN]) {
      expect(buildMiniProgram({ ...base, weightKg: w }).nutrition.proteinTarget, String(w)).toBeNull();
    }
  });
});
