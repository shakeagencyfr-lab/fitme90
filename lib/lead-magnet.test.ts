import { describe, it, expect } from "vitest";
import { buildMiniProgram, GOALS, LEVELS, EQUIPMENTS, type LeadAnswers } from "./lead-magnet";

describe("buildMiniProgram", () => {
  it("génère le bon nombre de séances (borné 2..4)", () => {
    const base: LeadAnswers = { goal: "muscle", level: "intermediaire", days: 3, equipment: "salle" };
    expect(buildMiniProgram({ ...base, days: 3 }).sessions).toHaveLength(3);
    expect(buildMiniProgram({ ...base, days: 1 }).sessions).toHaveLength(2);
    expect(buildMiniProgram({ ...base, days: 9 }).sessions).toHaveLength(4);
  });

  it("adapte le volume au niveau", () => {
    const base: LeadAnswers = { goal: "muscle", level: "intermediaire", days: 2, equipment: "salle" };
    const inter = buildMiniProgram(base).sessions[0].exercises[0].sets;
    const deb = buildMiniProgram({ ...base, level: "debutant" }).sessions[0].exercises[0].sets;
    const adv = buildMiniProgram({ ...base, level: "avance" }).sessions[0].exercises[0].sets;
    expect(deb).toBeLessThan(inter);
    expect(adv).toBeGreaterThan(inter);
  });

  it("produit un programme complet pour toutes les combinaisons", () => {
    for (const goal of GOALS) for (const level of LEVELS) for (const equipment of EQUIPMENTS) {
      const prog = buildMiniProgram({ goal, level, days: 3, equipment });
      expect(prog.sessions.length).toBe(3);
      expect(prog.nutrition.length).toBeGreaterThan(0);
      expect(prog.tips.length).toBeGreaterThan(0);
      for (const s of prog.sessions) expect(s.exercises.length).toBeGreaterThan(0);
    }
  });
});
