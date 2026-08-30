import { describe, it, expect } from "vitest";
import { sanitizeExercise, sanitizePlan } from "./program-sanitize";
import type { PlanExercise, Plan } from "./program";

function ex(partial: Partial<PlanExercise>): PlanExercise {
  return { name: "", sets: 0, reps: "", load: "", note: "", cardio: false, duration: "", zone: "", ...partial };
}

describe("sanitizeExercise — faux cardio", () => {
  it("reclasse la marche du fermier (40 min de cardio) en musculation", () => {
    const out = sanitizeExercise(ex({ name: "Marche du fermier kettlebells", cardio: true, duration: "40 m", zone: "Z1" }));
    expect(out.cardio).toBe(false);
    expect(out.duration).toBe("");
    expect(out.sets).toBeGreaterThanOrEqual(3);
    expect(out.reps).toMatch(/m|s/); // distance ou temps
  });

  it("reclasse le rowing poulie (étiqueté cardio) en musculation", () => {
    const out = sanitizeExercise(ex({ name: "Rowing poulie basse à la corde", cardio: true, duration: "12 min", zone: "Z2" }));
    expect(out.cardio).toBe(false);
    expect(out.sets).toBeGreaterThanOrEqual(3);
    expect(out.reps).not.toBe("");
  });

  it("reclasse un développé haltères marqué cardio par erreur", () => {
    const out = sanitizeExercise(ex({ name: "Développé militaire haltères", cardio: true, duration: "10 min" }));
    expect(out.cardio).toBe(false);
  });
});

describe("sanitizeExercise — vrai cardio borné", () => {
  it("garde le rameur en cardio mais borne la durée à 20 min", () => {
    const out = sanitizeExercise(ex({ name: "Rameur ergomètre", cardio: true, duration: "40 min", zone: "Z2" }));
    expect(out.cardio).toBe(true);
    expect(out.duration).toBe("20 min");
    expect(out.sets).toBe(0);
    expect(out.reps).toBe("");
  });

  it("donne une durée par défaut au cardio sans durée", () => {
    const out = sanitizeExercise(ex({ name: "Vélo d'appartement", cardio: true, duration: "" }));
    expect(out.cardio).toBe(true);
    expect(out.duration).toBe("12 min");
  });

  it("remonte une durée cardio trop courte au minimum", () => {
    const out = sanitizeExercise(ex({ name: "Corde à sauter", cardio: true, duration: "2 min" }));
    expect(out.duration).toBe("8 min");
  });
});

describe("sanitizeExercise — musculation intacte", () => {
  it("laisse un exercice de force inchangé", () => {
    const src = ex({ name: "Développé couché barre", cardio: false, sets: 4, reps: "8-10", rest: 120 });
    expect(sanitizeExercise(src)).toEqual(src);
  });
});

describe("sanitizePlan — parcourt les cycles", () => {
  it("nettoie les séances de tous les cycles", () => {
    const plan = {
      summary: "",
      cycles: [
        {
          label: "Cycle 1",
          name: "Accumulation",
          weeks: "1 → 4",
          body: "",
          sessions: [
            {
              cycleLabel: "Cycle 1 · A",
              title: "Bas du corps",
              meta: "",
              restSec: 90,
              warmup: [],
              exercises: [ex({ name: "Marche du fermier", cardio: true, duration: "40 min" })],
            },
          ],
        },
      ],
      weekPlan: [{ day: "LUN", name: "Bas du corps", dur: "", rest: false }],
      nutrition: { kcal: "", protein: "", carbs: "", fat: "", tags: [], meals: [] },
      warning: "",
    } as unknown as Plan;

    const out = sanitizePlan(plan);
    expect(out.cycles[0].sessions![0].exercises[0].cardio).toBe(false);
  });
});
