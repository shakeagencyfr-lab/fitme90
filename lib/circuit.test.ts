import { describe, it, expect } from "vitest";
import {
  blockSeconds,
  circuitLevel,
  circuitParams,
  circuitPrompt,
  circuitSeconds,
  flattenBlocks,
  isHomeEquipment,
  sanitizeBlock,
  sensationScale,
  sessionMinutes,
  targetSensation,
  timeline,
  timelineSeconds,
  trimToBudget,
  fillToBudget,
  type CircuitBlock,
} from "./circuit";

const bloc = (over: Partial<CircuitBlock> = {}): CircuitBlock => ({
  title: "Bloc 1",
  rounds: 3,
  work: 40,
  rest: 20,
  roundRest: 30,
  restAfter: 60,
  sensation: 2,
  exercises: [
    { name: "Pompes", note: "" },
    { name: "Squat au poids du corps", note: "" },
    { name: "Gainage planche", note: "" },
  ],
  ...over,
});

describe("isHomeEquipment", () => {
  it("sans matériel, ou avec du petit matériel, c'est la maison", () => {
    expect(isHomeEquipment([])).toBe(true);
    expect(isHomeEquipment(["poids du corps uniquement"])).toBe(true);
    expect(isHomeEquipment(["haltères", "élastiques", "kettlebell", "tapis de sol", "swiss ball"])).toBe(true);
  });
  it("une machine ou une poulie, c'est une salle", () => {
    expect(isHomeEquipment(["haltères", "presse à cuisses"])).toBe(false);
    expect(isHomeEquipment(["poulie haute"])).toBe(false);
    expect(isHomeEquipment(["barre olympique", "rack à squat"])).toBe(false);
    expect(isHomeEquipment(["machine à cuisses bizarre inconnue"])).toBe(false);
  });
});

describe("niveau, durée, paramètres", () => {
  it("lit le niveau dans la réponse du questionnaire", () => {
    expect(circuitLevel("Jamais")).toBe("debutant");
    expect(circuitLevel("Moins d'un an")).toBe("debutant");
    expect(circuitLevel("1 à 3 ans")).toBe("intermediaire");
    expect(circuitLevel("Plus de 3 ans")).toBe("avance");
    expect(circuitLevel(undefined)).toBe("intermediaire");
  });
  it("lit la durée de séance, avec un défaut sain", () => {
    expect(sessionMinutes("45 min")).toBe(45);
    expect(sessionMinutes("1 h")).toBe(45);
    expect(sessionMinutes("60 minutes")).toBe(60);
    expect(sessionMinutes(undefined)).toBe(45);
  });
  it("progresse d'un cycle à l'autre sans jamais parler de charge", () => {
    const c1 = circuitParams("debutant", 0);
    const c3 = circuitParams("debutant", 2);
    expect(c1.rounds).toBeLessThanOrEqual(c3.rounds);
    expect(c1.work / (c1.rest || 1)).toBeLessThanOrEqual(c3.work / (c3.rest || 1));
    expect(circuitParams("avance", 5)).toEqual(circuitParams("avance", 2));
  });
});

describe("sensations", () => {
  it("quatre niveaux dans les deux langues, cible 2 puis 3", () => {
    expect(sensationScale("fr").steps.map((s) => s.label)).toEqual(["Facile", "Ça travaille", "Dur", "À fond"]);
    expect(sensationScale("en").steps).toHaveLength(4);
    expect(targetSensation(1)).toBe(2);
    expect(targetSensation(31)).toBe(3);
  });
});

describe("sanitizeBlock", () => {
  it("ramène un bloc dans des bornes réalistes", () => {
    const b = sanitizeBlock({ rounds: 40, work: 5, rest: 500, restAfter: -3, sensation: 9, exercises: [{ name: " Pompes ", note: "x" }, { name: "" }] } as never);
    expect(b.rounds).toBe(8);
    expect(b.work).toBe(15);
    expect(b.rest).toBe(90);
    expect(b.restAfter).toBe(0);
    expect(b.sensation).toBe(4);
    expect(b.exercises).toEqual([{ name: "Pompes", note: "x" }]);
  });
  it("garde une clé posée et vide un bloc sans exercice nommé", () => {
    expect(sanitizeBlock({ exercises: [{ name: "Pompes", key: "pompes", note: "" }] }).exercises[0].key).toBe("pompes");
    expect(sanitizeBlock({ exercises: [] }).exercises).toEqual([]);
    expect(sanitizeBlock(null).exercises).toEqual([]);
  });
});

describe("durées", () => {
  it("calcule la durée d'un bloc avec ses repos", () => {
    // 3 tours × (3 × 40 + 2 × 20) + 2 × 30 + 60 = 3 × 160 + 60 + 60 = 600
    expect(blockSeconds(bloc())).toBe(600);
    expect(blockSeconds(bloc(), true)).toBe(540);
    expect(circuitSeconds([bloc(), bloc()])).toBe(600 + 540);
  });
  it("retire des tours aux blocs les plus longs pour tenir dans le budget", () => {
    const blocs = [bloc({ rounds: 4 }), bloc({ title: "Bloc 2", rounds: 4 })];
    const avant = circuitSeconds(blocs);
    const apres = trimToBudget(blocs, avant - 100);
    expect(circuitSeconds(apres)).toBeLessThan(avant);
    expect(apres.map((b) => b.rounds)).toEqual([3, 4]);
    expect(apres.every((b) => b.exercises.length === 3)).toBe(true);
    // Jamais sous deux tours : un budget impossible laisse les blocs entiers.
    expect(trimToBudget(blocs, 10).every((b) => b.rounds >= 2)).toBe(true);
  });

  it("ajoute des tours quand la séance est bien plus courte que le temps disponible", () => {
    const un = [bloc({ rounds: 2 })];
    const rempli = fillToBudget(un, 30 * 60);
    expect(rempli[0].rounds).toBeGreaterThan(2);
    expect(circuitSeconds(rempli)).toBeLessThanOrEqual(30 * 60);
    // Jamais au-delà du plafond de tours, ni au-delà du budget.
    expect(fillToBudget(un, 10 * 3600)[0].rounds).toBe(6);
    const serre = fillToBudget([bloc({ rounds: 3 })], 60);
    expect(serre[0].rounds).toBe(3);
    expect(fillToBudget([], 3600)).toEqual([]);
  });
});

describe("flattenBlocks", () => {
  it("miroir à plat : séries = tours, reps = secondes, sans cardio", () => {
    const flat = flattenBlocks([bloc({ exercises: [{ name: "Burpees", key: "burpees", note: "souple" }] })]);
    expect(flat).toEqual([
      { name: "Burpees", key: "burpees", sets: 3, reps: "40 s", load: "", note: "souple", rest: 20, cardio: false, duration: "", zone: "" },
    ]);
  });
});

describe("timeline", () => {
  it("déroule préparation, efforts, repos, tours et blocs, puis la fin", () => {
    const steps = timeline([bloc({ rounds: 2 }), bloc({ title: "Bloc 2", rounds: 1, exercises: [{ name: "Burpees", note: "" }] })], 10);
    const kinds = steps.map((s) => s.kind);
    expect(kinds[0]).toBe("prepare");
    expect(kinds.at(-1)).toBe("done");
    expect(kinds.filter((k) => k === "work")).toHaveLength(2 * 3 + 1);
    expect(kinds.filter((k) => k === "rest")).toHaveLength(2 * 2);
    expect(kinds.filter((k) => k === "roundRest")).toHaveLength(1);
    expect(kinds.filter((k) => k === "blockRest")).toHaveLength(1);
    // La durée du déroulé est celle des blocs, plus la préparation.
    expect(timelineSeconds(steps)).toBe(10 + blockSeconds(bloc({ rounds: 2 })) + 40);
  });
  it("annonce toujours ce qui vient ensuite", () => {
    const steps = timeline([bloc({ rounds: 1 }), bloc({ title: "Bloc 2", rounds: 1 })], 0);
    const premier = steps[0];
    expect(premier.kind).toBe("work");
    expect(premier.nextExercise).toBe(1);
    const dernierDuBloc1 = steps.find((s) => s.kind === "work" && s.block === 0 && s.exercise === 2)!;
    expect(dernierDuBloc1.nextBlock).toBe(1);
    expect(dernierDuBloc1.nextExercise).toBe(0);
    const dernier = steps.filter((s) => s.kind === "work").at(-1)!;
    expect(dernier.nextBlock).toBe(-1);
  });
  it("saute les repos à zéro : on enchaîne", () => {
    const steps = timeline([bloc({ rounds: 2, rest: 0, roundRest: 0, restAfter: 0 })], 0);
    expect(steps.every((s) => s.kind === "work" || s.kind === "done")).toBe(true);
  });
  it("sans exercice, il n'y a que la fin", () => {
    expect(timeline([bloc({ exercises: [] })]).map((s) => s.kind)).toEqual(["done"]);
  });
});

describe("circuitPrompt", () => {
  it("sans salle : circuit obligatoire, formule de durée, sensations, exemple", () => {
    const p = circuitPrompt({ home: true, level: "debutant", sessionMinutes: 45, cycleCount: 3, fatLoss: true });
    expect(p).toMatch(/RÈGLE ABSOLUE/);
    expect(p).toContain('"format":"circuit"');
    expect(p).toContain("38 min");
    expect(p).toMatch(/Cycle 1 : 30 s d'effort, 15 s de repos entre exercices, 2 tours/);
    expect(p).toMatch(/Tabata/);
    expect(p).toMatch(/RPE 6 à 7 = sensation 2/);
    expect(p).not.toMatch(/—/);
  });
  it("en salle : option laissée au modèle, un seul bloc en finisher", () => {
    const p = circuitPrompt({ home: false, level: "avance", sessionMinutes: 60, cycleCount: 3, fatLoss: false });
    expect(p).toMatch(/OPTION/);
    expect(p).toContain('"format":"sets"');
    expect(p).not.toMatch(/RÈGLE ABSOLUE/);
  });
});
