import { describe, it, expect } from "vitest";
import { restPatternFromTrainDays } from "./schedule";
import { scheduledTrainingDays } from "./streak";
import { sessionForDay, setDayOverride, clearDayOverride, hasDayOverride, type Plan, type Session } from "./program";

// Rotation des séances distinctes (bug #7 : la séance était identique partout).
// Le créneau de séance d'un jour d'entraînement = (rang du jour parmi les jours
// travaillés − 1) modulo le nombre de séances. On vérifie que des jours
// d'entraînement successifs tournent bien sur A, B, C… et que le même jour de
// semaine, d'une semaine à l'autre, retombe sur la même séance.
function slotForDay(pattern: boolean[], startWd: number, day: number, count: number): number {
  const ordinal = scheduledTrainingDays(pattern, startWd, day).length; // 1-based
  return (((ordinal - 1) % count) + count) % count;
}

describe("rotation des séances par jour d'entraînement", () => {
  const pattern = restPatternFromTrainDays(["LUN", "MER", "VEN"]); // 3 séances
  const startWd = 0; // jour 1 = lundi

  it("assigne des séances DIFFÉRENTES aux jours d'entraînement d'une semaine", () => {
    // Jours d'entraînement de la semaine 1 : 1 (lun), 3 (mer), 5 (ven).
    expect(slotForDay(pattern, startWd, 1, 3)).toBe(0); // Séance A
    expect(slotForDay(pattern, startWd, 3, 3)).toBe(1); // Séance B
    expect(slotForDay(pattern, startWd, 5, 3)).toBe(2); // Séance C
  });

  it("retombe sur la même séance au même jour de semaine, semaine suivante", () => {
    expect(slotForDay(pattern, startWd, 8, 3)).toBe(0); // lundi S2 → A
    expect(slotForDay(pattern, startWd, 10, 3)).toBe(1); // mercredi S2 → B
    expect(slotForDay(pattern, startWd, 12, 3)).toBe(2); // vendredi S2 → C
  });

  it("gère un démarrage un vendredi (décalage calendaire)", () => {
    const startFri = 4; // vendredi
    // Jour 1 = vendredi (1er entraînement de la semaine) → A.
    expect(slotForDay(pattern, startFri, 1, 3)).toBe(0);
  });
});

describe("dérogation d'un jour", () => {
  const seance = (titre: string): Session => ({
    cycleLabel: "Cycle 1", title: titre, meta: "", restSec: 90, format: "sets", warmup: [],
    exercises: [{ name: "Pompes", sets: 3, reps: "10", load: "", note: "", cardio: false, duration: "", zone: "" }],
  } as unknown as Session);

  const base = {
    summary: "", weekPlan: [], nutrition: { kcal: "", protein: "", carbs: "", fat: "", tags: [], meals: [] },
    cycles: [{ label: "Cycle 1", name: "", weeks: "", body: "", sessions: [seance("Haut du corps"), seance("Bas du corps")] }],
  } as unknown as Plan;

  // Lundi et jeudi travaillés : la séance A revient tous les lundis.
  const pattern = [false, true, true, false, true, true, true];
  const startWd = 0;

  it("ne change que son jour, et laisse les autres occurrences intactes", () => {
    const jour = 1;
    const avant = sessionForDay(base, jour, pattern, startWd)!.title;
    const plan = setDayOverride(base, jour, seance("Circuit hôtel"));
    expect(sessionForDay(plan, jour, pattern, startWd)!.title).toBe("Circuit hôtel");
    // La même séance, la semaine suivante : inchangée.
    expect(sessionForDay(plan, jour + 7, pattern, startWd)!.title).toBe(avant);
    // Et le programme lui-même n'a pas bougé.
    expect(plan.cycles![0].sessions!.map((s) => s.title)).toEqual(["Haut du corps", "Bas du corps"]);
  });

  it("s'annule et rend la séance du programme", () => {
    const plan = setDayOverride(base, 1, seance("Circuit hôtel"));
    expect(hasDayOverride(plan, 1)).toBe(true);
    const rendu = clearDayOverride(plan, 1);
    expect(hasDayOverride(rendu, 1)).toBe(false);
    expect(sessionForDay(rendu, 1, pattern, startWd)!.title).toBe(sessionForDay(base, 1, pattern, startWd)!.title);
    expect(rendu.dayOverrides).toBeUndefined();
  });

  it("plusieurs jours peuvent avoir chacun la leur", () => {
    let plan = setDayOverride(base, 1, seance("Circuit A"));
    plan = setDayOverride(plan, 2, seance("Circuit B"));
    expect(sessionForDay(plan, 1, pattern, startWd)!.title).toBe("Circuit A");
    expect(sessionForDay(plan, 2, pattern, startWd)!.title).toBe("Circuit B");
    plan = clearDayOverride(plan, 1);
    expect(hasDayOverride(plan, 2)).toBe(true);
  });
});
