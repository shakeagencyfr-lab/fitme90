import { describe, it, expect } from "vitest";
import { applySessionOps, findExercise, buildExercise } from "./session-edit";
import type { Session } from "./program";

const seance: Session = {
  cycleLabel: "Cycle 1",
  title: "Bas du corps",
  meta: "",
  restSec: 90,
  warmup: [],
  exercises: [
    { name: "Squat barre", sets: 4, reps: "8", load: "40 kg", note: "profond", cardio: false, duration: "", zone: "" },
    { name: "Soulevé de terre roumain", sets: 3, reps: "10", load: "", note: "", cardio: false, duration: "", zone: "" },
    { name: "Abduction machine", sets: 3, reps: "15", load: "", note: "", cardio: false, duration: "", zone: "" },
  ],
};

describe("retouches d'une séance décidées dans le chat", () => {
  it("retrouve un exercice sans se soucier des accents ni de la casse", () => {
    expect(findExercise(seance.exercises, "souleve de terre")).toBe(1);
    expect(findExercise(seance.exercises, "SQUAT")).toBe(0);
    expect(findExercise(seance.exercises, "hip thrust")).toBe(-1);
  });

  it("ajoute un exercice et un finisher cardio, sans toucher au reste", () => {
    const r = applySessionOps(seance, [
      { action: "ajouter", nouveau: { nom: "Hip thrust machine", series: 4, reps: "12" }, position: 2 },
      { action: "ajouter", nouveau: { nom: "Rameur", cardio: true, duree: "18 min", zone: "zone 2" } },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.session.exercises.map((e) => e.name)).toEqual([
      "Squat barre", "Hip thrust machine", "Soulevé de terre roumain", "Abduction machine", "Rameur",
    ]);
    // La charge et la note du squat sont intactes.
    expect(r.session.exercises[0].load).toBe("40 kg");
    expect(r.session.exercises[4]).toMatchObject({ cardio: true, sets: 1, duration: "18 min", zone: "zone 2" });
    expect(r.changes).toHaveLength(2);
  });

  it("remplace, ajuste et retire", () => {
    const r = applySessionOps(seance, [
      { action: "remplacer", exercice: "abduction", nouveau: { nom: "Fentes marchées", series: 3, reps: "12" } },
      { action: "modifier", exercice: "squat", nouveau: { series: 5, charge: "45 kg" } },
      { action: "retirer", exercice: "roumain" },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.session.exercises.map((e) => e.name)).toEqual(["Squat barre", "Fentes marchées"]);
    expect(r.session.exercises[0]).toMatchObject({ sets: 5, load: "45 kg", note: "profond" });
  });

  it("refuse ce qui n'a pas de sens sans annuler le reste", () => {
    const r = applySessionOps(seance, [
      { action: "retirer", exercice: "développé couché" },
      { action: "ajouter", nouveau: { nom: "Squat barre" } },
      { action: "modifier", exercice: "abduction", nouveau: { reps: "20" } },
    ]);
    expect(r.errors).toHaveLength(2);
    expect(r.changes).toHaveLength(1);
    expect(r.session.exercises[2].reps).toBe("20");
  });

  it("ne vide jamais une séance", () => {
    const une: Session = { ...seance, exercises: [seance.exercises[0]] };
    const r = applySessionOps(une, [{ action: "retirer", exercice: "squat" }]);
    expect(r.session.exercises).toHaveLength(1);
    expect(r.errors[0]).toMatch(/au moins un exercice/);
  });

  it("borne les valeurs", () => {
    const ex = buildExercise({ nom: "Test", series: 99, repos_sec: 5 });
    expect(ex).toMatchObject({ sets: 12, rest: 15, reps: "10" });
    expect(buildExercise({ nom: "" })).toBeNull();
  });

  it("ne modifie pas la séance d'origine", () => {
    applySessionOps(seance, [{ action: "retirer", exercice: "squat" }]);
    expect(seance.exercises).toHaveLength(3);
  });
});
