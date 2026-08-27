import { describe, it, expect } from "vitest";
import { computeAdherence, scheduledTrainingDays, missedDays, MILESTONES } from "./streak";
import { restPatternFromTrainDays } from "./schedule";

// Motif : entraînement LUN / MER / VEN, repos ailleurs. Départ un lundi
// (startWd = 0), donc jour 1 = LUN, jour 3 = MER, jour 5 = VEN, jour 8 = LUN...
const pattern = restPatternFromTrainDays(["LUN", "MER", "VEN"]);

describe("scheduledTrainingDays", () => {
  it("liste les jours d'entraînement planifiés jusqu'à upto", () => {
    expect(scheduledTrainingDays(pattern, 0, 7)).toEqual([1, 3, 5]);
    expect(scheduledTrainingDays(pattern, 0, 8)).toEqual([1, 3, 5, 8]);
  });
});

describe("computeAdherence", () => {
  it("aucune séance encore due au tout premier jour", () => {
    const s = computeAdherence({ pattern, startWd: 0, currentDay: 1, completedDays: [] });
    expect(s.due).toBe(0);
    expect(s.adherence).toBeNull();
    expect(s.todayPending).toBe(true);
    expect(s.streak).toBe(0);
  });

  it("aujourd'hui non fait ne casse pas la série ni l'adhérence", () => {
    // jour 8 (LUN) : dus = jours 1,3,5 ; tous faits. Aujourd'hui (8) en attente.
    const s = computeAdherence({ pattern, startWd: 0, currentDay: 8, completedDays: [1, 3, 5] });
    expect(s.due).toBe(3);
    expect(s.done).toBe(3);
    expect(s.missed).toBe(0);
    expect(s.adherence).toBe(100);
    expect(s.streak).toBe(3);
    expect(s.todayPending).toBe(true);
  });

  it("aujourd'hui validé compte dans la série et le total", () => {
    const s = computeAdherence({ pattern, startWd: 0, currentDay: 8, completedDays: [1, 3, 5, 8] });
    expect(s.streak).toBe(4);
    expect(s.completedTotal).toBe(4);
    expect(s.todayPending).toBe(false);
  });

  it("un jour passé manqué arrête la série et baisse l'adhérence", () => {
    // jour 8 : dus 1,3,5 ; le 3 manqué. Série repart de 5.
    const s = computeAdherence({ pattern, startWd: 0, currentDay: 8, completedDays: [1, 5] });
    expect(s.due).toBe(3);
    expect(s.done).toBe(2);
    expect(s.missed).toBe(1);
    expect(s.adherence).toBe(67);
    expect(s.streak).toBe(1); // seulement le 5
  });

  it("série cassée si le dernier jour passé est manqué", () => {
    // jour 6 (SAM, repos) : dus 1,3,5 ; 5 manqué → série 0.
    const s = computeAdherence({ pattern, startWd: 0, currentDay: 6, completedDays: [1, 3] });
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(2);
  });

  it("meilleure série retenue même après une cassure", () => {
    // jours dus jusqu'au 15 : 1,3,5,8,10,12 ; faits 1,3,5,8 puis trou puis 12
    const s = computeAdherence({ pattern, startWd: 0, currentDay: 15, completedDays: [1, 3, 5, 8, 12] });
    expect(s.bestStreak).toBe(4); // 1,3,5,8 consécutifs
    expect(s.streak).toBe(1); // 10 manqué, 12 fait, 15 = aujourd'hui en attente
  });

  it("prochain palier suit le total de séances", () => {
    const s = computeAdherence({ pattern, startWd: 0, currentDay: 8, completedDays: [1, 3, 5] });
    expect(s.nextMilestone).toBe(MILESTONES.find((m) => m > 3));
  });

  it("liste les séances manquées, aujourd'hui exclu", () => {
    // jour 8 (LUN) : planifiés passés 1,3,5 ; faits 1,5 → manqué = [3].
    // le 8 (aujourd'hui) n'est jamais compté comme manqué.
    expect(missedDays({ pattern, startWd: 0, currentDay: 8, completedDays: [1, 5] })).toEqual([3]);
    expect(missedDays({ pattern, startWd: 0, currentDay: 8, completedDays: [1, 3, 5] })).toEqual([]);
    expect(missedDays({ pattern, startWd: 0, currentDay: 6, completedDays: [] })).toEqual([1, 3, 5]);
  });

  it("respecte le décalage de départ (départ un mercredi)", () => {
    // départ MER (startWd=2) : jour 1 = MER (entraînement), jour 3 = VEN, jour 6 = LUN
    const s = computeAdherence({ pattern, startWd: 2, currentDay: 6, completedDays: [1, 3] });
    expect(scheduledTrainingDays(pattern, 2, 6)).toEqual([1, 3, 6]);
    expect(s.due).toBe(2); // 1 et 3 (6 = aujourd'hui, pas encore dû)
    expect(s.done).toBe(2);
    expect(s.adherence).toBe(100);
    expect(s.streak).toBe(2);
  });
});
