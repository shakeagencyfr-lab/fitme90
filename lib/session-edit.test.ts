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

describe("retouches d'une séance en circuit", () => {
  const circuit: Session = {
    cycleLabel: "Cycle 1",
    title: "Full body A",
    meta: "",
    restSec: 0,
    format: "circuit",
    warmup: [],
    exercises: [],
    blocks: [
      { title: "Bloc 1", rounds: 3, work: 40, rest: 20, roundRest: 30, restAfter: 60, exercises: [{ name: "Pompes", note: "" }, { name: "Squat au poids du corps", note: "" }] },
      { title: "Bloc 2", rounds: 2, work: 30, rest: 15, roundRest: 30, restAfter: 0, exercises: [{ name: "Burpees", note: "souple" }] },
    ],
  };

  it("ajoute dans le dernier bloc ou dans le bloc demandé, et recalcule le miroir", () => {
    const r = applySessionOps(circuit, [
      { action: "ajouter", nouveau: { nom: "Gainage planche" } },
      { action: "ajouter", nouveau: { nom: "Fentes arrière", note: "alterne" }, position: 1 },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.session.blocks![1].exercises.map((e) => e.name)).toEqual(["Burpees", "Gainage planche"]);
    expect(r.session.blocks![0].exercises.map((e) => e.name)).toEqual(["Pompes", "Squat au poids du corps", "Fentes arrière"]);
    expect(r.session.exercises.map((e) => e.name)).toEqual(["Pompes", "Squat au poids du corps", "Fentes arrière", "Burpees", "Gainage planche"]);
    expect(r.session.exercises[3].reps).toBe("30 s");
  });

  it("ne vide jamais un bloc, remplace sur place, ajuste tours et repos du bloc", () => {
    const r = applySessionOps(circuit, [
      { action: "retirer", exercice: "burpees" },
      { action: "remplacer", exercice: "pompes", nouveau: { nom: "Pompes inclinées" } },
      { action: "modifier", exercice: "squat", nouveau: { series: 4, repos_sec: 10, note: "profond" } },
    ]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/garde au moins un exercice/);
    expect(r.session.blocks![0].exercises[0].name).toBe("Pompes inclinées");
    expect(r.session.blocks![0].rounds).toBe(4);
    expect(r.session.blocks![0].rest).toBe(10);
    expect(r.session.blocks![0].exercises[1].note).toBe("profond");
    expect(r.changes).toHaveLength(2);
    // La séance d'origine n'est pas touchée.
    expect(circuit.blocks![0].rounds).toBe(3);
  });
});
