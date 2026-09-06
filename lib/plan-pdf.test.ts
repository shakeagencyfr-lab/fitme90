import { describe, it, expect } from "vitest";
import { planPdf, PDF_OPTIONS_ALL } from "./plan-pdf";
import { karvonen, RPE, RPE_INTRO } from "./fitness";
import type { Plan } from "./program";

const plan: Plan = {
  summary: "Tu construis une base solide.",
  cycles: [
    {
      label: "Cycle 1", name: "Accumulation", weeks: "SEMAINES 1 à 4", body: "On installe la technique.",
      sessions: [{
        cycleLabel: "Cycle 1 · Séance A", title: "Bas du corps", meta: "", restSec: 90,
        warmup: [{ name: "Rameur léger", detail: "5 min" }, { name: "Mobilité hanches", detail: "6 mouvements" }],
        exercises: [{ name: "Squat", sets: 4, reps: "8", load: "", note: "", cardio: false, duration: "", zone: "" }],
      }],
    },
    {
      label: "Cycle 2", name: "Intensification", weeks: "SEMAINES 5 à 8", body: "On monte.",
      sessions: [{
        cycleLabel: "Cycle 2 · Séance A", title: "Haut du corps", meta: "", restSec: 120, warmup: [],
        exercises: [{ name: "Tractions", sets: 4, reps: "6", load: "", note: "", cardio: false, duration: "", zone: "" }],
      }],
    },
  ],
  weekPlan: [{ day: "LUN", name: "Bas du corps", dur: "55 min", rest: false }],
  nutrition: { kcal: "2 100", protein: "120", carbs: "220", fat: "70", tags: [], meals: [] },
  warning: "",
};

const latin = (u: Uint8Array) => Buffer.from(u).toString("latin1");

describe("PDF du plan", () => {
  it("porte toujours l'échelle RPE et les zones cardiaques, même sans rien d'optionnel", () => {
    const out = latin(planPdf({
      plan, clientName: "Laetitia", coachName: "Seb Coaching", locale: "fr",
      options: { cycles: [0], nutrition: false, sampleMeals: false },
      zones: karvonen(39, 60, "F").zones,
      rpe: { intro: RPE_INTRO, steps: RPE },
    }));
    expect(out).toContain("(Zones cardiaques)");
    expect(out).toContain("(RPE 7)");
    expect(out).toContain("Accumulation");
    expect(out).not.toContain("Intensification");
    expect(out).not.toContain("nutritionnels");
    // Le cardio d'échauffement porte sa zone et les pulsations.
    expect(out).toMatch(/Z1 R\S+cup\S+ration, \d+ \S+ \d+ bpm/);
  });

  it("inclut tout par défaut, et la journée type quand on la fournit", () => {
    const out = latin(planPdf({
      plan, clientName: "", coachName: "Forge Fit", locale: "fr", options: PDF_OPTIONS_ALL,
      sampleMeals: {
        training: [{ time: "7 h 30", slot: "petit-dej", name: "Porridge", kcal: 500, items: [{ food: "Avoine", qty: "60 g" }] }],
        rest: [{ time: "7 h 30", slot: "petit-dej", name: "Skyr", kcal: 400, items: [{ food: "Skyr", qty: "200 g" }] }],
      },
      rpe: { intro: RPE_INTRO, steps: RPE },
    }));
    expect(out).toContain("Intensification");
    expect(out).toContain("Porridge");
    expect(out).toContain("FORGE FIT");
  });
});
