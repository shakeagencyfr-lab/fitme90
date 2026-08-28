import { describe, it, expect } from "vitest";
import { restPatternFromTrainDays } from "./schedule";
import { scheduledTrainingDays } from "./streak";

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
