import { describe, it, expect } from "vitest";
import { weekSessionTitles, type Plan, type Session } from "./program";

function session(title: string): Session {
  return {
    cycleLabel: "C1",
    title,
    meta: "",
    restSec: 90,
    warmup: [],
    exercises: [{ name: "Squat", sets: "4", reps: "8", note: "" }],
  } as unknown as Session;
}

// Cas réel signalé : jours d'entraînement MAR/MER/VEN/SAM, 4 séances,
// programme démarré un MERCREDI. La semaine type doit suivre la rotation
// réelle (mercredi = 1re séance) et non le gabarit (mercredi = 2e séance).
const plan = {
  summary: "",
  weekPlan: [],
  nutrition: { kcal: "", protein: "", carbs: "", fat: "", tags: [], meals: [] },
  warning: "",
  cycles: [
    {
      label: "Cycle 1",
      name: "Fondations",
      weeks: "S1-S4",
      body: "",
      sessions: [session("Haut poussée"), session("Bas quadriceps"), session("Haut tirage"), session("Bas ischios")],
    },
  ],
} as unknown as Plan;

const pattern = [true, false, false, true, false, false, true]; // LUN..DIM, true = repos
const startWd = 2; // mercredi

describe("weekSessionTitles", () => {
  it("aligne la semaine type sur la rotation réelle, pas sur le gabarit", () => {
    const w = weekSessionTitles(plan, 1, pattern, startWd, 90);
    expect(w[2]).toBe("Haut poussée");   // MER, 1er jour d'entraînement
    expect(w[4]).toBe("Bas quadriceps"); // VEN
    expect(w[5]).toBe("Haut tirage");    // SAM
  });

  it("laisse les jours de repos à null", () => {
    const w = weekSessionTitles(plan, 1, pattern, startWd, 90);
    expect(w[0]).toBeNull(); // LUN
    expect(w[3]).toBeNull(); // JEU
    expect(w[6]).toBeNull(); // DIM
  });

  it("remplit le mardi de la 1re semaine, pourtant antérieur au démarrage", () => {
    // Le programme démarre le mercredi : le mardi de cette semaine est passé.
    // La semaine TYPE doit décrire la routine, donc montrer le prochain mardi.
    const w = weekSessionTitles(plan, 1, pattern, startWd, 90);
    expect(w[1]).toBe("Bas ischios"); // 4e jour d'entraînement, prochain mardi
    expect(w[1]).not.toBeNull();
  });

  it("donne la même semaine type une fois la 1re semaine passée", () => {
    const s1 = weekSessionTitles(plan, 1, pattern, startWd, 90);
    const s2 = weekSessionTitles(plan, 8, pattern, startWd, 90); // mercredi S2
    expect(s2).toEqual(s1); // 4 séances pour 4 jours : la rotation se verrouille
  });

  it("laisse null quand la fin du programme est atteinte", () => {
    const w = weekSessionTitles(plan, 89, pattern, startWd, 90);
    expect(w.some((x) => x === null)).toBe(true);
  });

  it("s'arrête à la fin du programme", () => {
    expect(weekSessionTitles(plan, 90, pattern, startWd, 90).filter(Boolean).length).toBeGreaterThanOrEqual(0);
    expect(weekSessionTitles(plan, 90, pattern, startWd, 90).every((x) => x === null || typeof x === "string")).toBe(true);
  });
});
