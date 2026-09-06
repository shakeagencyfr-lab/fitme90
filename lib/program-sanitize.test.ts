import { describe, it, expect } from "vitest";
import { sanitizeExercise, sanitizePlan, sanitizeSession } from "./program-sanitize";
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

describe("séances en circuit", () => {
  const base = { cycleLabel: "Cycle 1 · Séance A", title: "Full body A", meta: "", restSec: 90, warmup: [] };
  const bloc = { title: "Bloc 1", rounds: 3, work: 40, rest: 20, roundRest: 30, restAfter: 60, sensation: 2, exercises: [{ name: "Pompes", note: "" }, { name: "Squat au poids du corps", note: "" }] };

  it("un circuit tient son miroir à plat des blocs, sans repos de séries", () => {
    const s = sanitizeSession({ ...base, format: "circuit", exercises: [], blocks: [bloc] } as never);
    expect(s.format).toBe("circuit");
    expect(s.restSec).toBe(0);
    expect(s.exercises.map((e) => [e.name, e.sets, e.reps])).toEqual([["Pompes", 3, "40 s"], ["Squat au poids du corps", 3, "40 s"]]);
  });

  it("une séance qui n'a que des blocs est un circuit, quoi qu'en dise son format", () => {
    const s = sanitizeSession({ ...base, exercises: [], blocks: [bloc] } as never);
    expect(s.format).toBe("circuit");
    expect(s.exercises).toHaveLength(2);
  });

  it("une séance en séries garde ses exercices et son bloc en finisher", () => {
    const ex = { name: "Développé couché", sets: 4, reps: "8", load: "", note: "", cardio: false, duration: "", zone: "" };
    const s = sanitizeSession({ ...base, format: "sets", exercises: [ex], blocks: [bloc] } as never);
    expect(s.format).toBe("sets");
    expect(s.exercises).toEqual([ex]);
    expect(s.blocks).toHaveLength(1);
  });

  it("un bloc vide disparaît, et sans bloc valable le circuit redevient des séries", () => {
    const ex = { name: "Développé couché", sets: 4, reps: "8", load: "", note: "", cardio: false, duration: "", zone: "" };
    const s = sanitizeSession({ ...base, format: "circuit", exercises: [ex], blocks: [{ ...bloc, exercises: [] }] } as never);
    expect(s.format).toBe("sets");
    expect(s.blocks).toBeUndefined();
    expect(s.exercises).toEqual([ex]);
  });
});
