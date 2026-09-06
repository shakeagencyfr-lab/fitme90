import { describe, it, expect } from "vitest";
import { allowedExercises, allowedListPrompt, canonicalExercise, enforceIssues, enforceLibrary } from "./allowed-exercises";
import { EXERCISE_LIBRARY } from "./exercise-library";
import type { Plan, PlanExercise } from "./program";

const SALLE = ["barre olympique", "rack à squat", "banc plat", "haltères", "poulie haute", "barre de traction", "presse à cuisses", "tapis de course"];
const MAISON = ["poids du corps uniquement"];
const COACH = [{ exercise_key: "coach-tirage-buste", name: "Tirage buste Sébastien", muscle: "Dos" }];

const ex = (name: string, extra: Partial<PlanExercise> = {}): PlanExercise => ({
  name, sets: 3, reps: "10", load: "", note: "", cardio: false, duration: "", zone: "", ...extra,
});

function plan(names: string[]): Plan {
  const session = { cycleLabel: "Cycle 1 · Séance A", title: "A", meta: "", restSec: 90, warmup: [], exercises: names.map((n) => ex(n)) };
  return {
    summary: "",
    cycles: [{ label: "Cycle 1", name: "", weeks: "", body: "", sessions: [session] }],
    weekPlan: [{ day: "LUN", name: "A", dur: "", rest: false }],
    sessions: [session],
    session,
  } as unknown as Plan;
}

describe("allowedExercises", () => {
  it("ne garde que ce que le matériel permet", () => {
    const maison = allowedExercises(MAISON).map((a) => a.key);
    expect(maison).toContain("pompes");
    expect(maison).toContain("squat-saute");
    expect(maison).not.toContain("developpe-couche");
    expect(maison).not.toContain("presse-jambes");
    const salle = allowedExercises(SALLE).map((a) => a.key);
    expect(salle).toContain("developpe-couche");
    expect(salle).toContain("presse-jambes");
    expect(salle).not.toContain("leg-extension");
  });

  it("garde une vraie bibliothèque même sans matériel", () => {
    expect(allowedExercises(MAISON).length).toBeGreaterThan(50);
  });

  it("ajoute les fiches du coach à la fin, sans doublon", () => {
    const list = allowedExercises(MAISON, [...COACH, { exercise_key: "x", name: "Pompes", muscle: null }]);
    expect(list.filter((a) => a.coach).map((a) => a.name)).toEqual(["Tirage buste Sébastien"]);
  });

  it("écrit la liste par groupe, un nom exact par entrée", () => {
    const texte = allowedListPrompt(allowedExercises(SALLE, COACH));
    expect(texte).toContain("Pectoraux : ");
    expect(texte).toContain("Développé couché");
    expect(texte).toContain("Dos : Tirage buste Sébastien");
    expect(texte).toMatch(/RÈGLE ABSOLUE/);
  });
});

describe("enforceLibrary", () => {
  it("pose la clé sur un nom exact et ne signale rien", () => {
    const r = enforceLibrary(plan(["Développé couché", "Squat"]), SALLE);
    expect(enforceIssues(r)).toBe(0);
    expect(r.plan.cycles![0].sessions![0].exercises.map((e) => e.key)).toEqual(["developpe-couche", "squat"]);
  });

  it("réécrit un nom approché en nom canonique, même mouvement", () => {
    const r = enforceLibrary(plan(["Développé couché barre prise moyenne"]), SALLE);
    const e = r.plan.cycles![0].sessions![0].exercises[0];
    expect(e.name).toBe("Développé couché");
    expect(e.key).toBe("developpe-couche");
    expect(r.repaired).toHaveLength(1);
    expect(r.removed).toEqual([]);
  });

  it("remplace un mouvement que le matériel interdit par un autre de la même famille", () => {
    const r = enforceLibrary(plan(["Développé couché", "Pompes"]), MAISON);
    const noms = r.plan.cycles![0].sessions![0].exercises.map((e) => e.name);
    expect(noms).not.toContain("Développé couché");
    expect(r.replaced).toHaveLength(1);
    expect(r.replaced[0].from).toBe("Développé couché");
    // Pas de doublon avec ce qui est déjà dans la séance.
    expect(new Set(noms).size).toBe(noms.length);
    // La charge notée pour l'ancien mouvement ne vaut plus rien.
    expect(r.plan.cycles![0].sessions![0].exercises[0].load).toBe("");
  });

  it("retire un nom inconnu, et le dit", () => {
    const r = enforceLibrary(plan(["Squat", "Mouvement inventé de toutes pièces"]), SALLE);
    expect(r.removed).toEqual(["Mouvement inventé de toutes pièces"]);
    expect(r.plan.cycles![0].sessions![0].exercises.map((e) => e.name)).toEqual(["Squat"]);
  });

  it("ne vide jamais une séance", () => {
    const r = enforceLibrary(plan(["Mouvement inventé de toutes pièces"]), SALLE);
    expect(r.plan.cycles![0].sessions![0].exercises).toHaveLength(1);
    expect(r.removed).toHaveLength(1);
  });

  it("accepte une fiche du coach telle quelle", () => {
    const r = enforceLibrary(plan(["tirage buste sébastien"]), MAISON, COACH);
    const e = r.plan.cycles![0].sessions![0].exercises[0];
    expect(e.name).toBe("Tirage buste Sébastien");
    expect(e.key).toBe("coach-tirage-buste");
    expect(enforceIssues(r)).toBe(0);
  });

  it("traite aussi les séances à plat et la séance unique des anciens plans", () => {
    const r = enforceLibrary(plan(["Pompes larges"]), MAISON);
    expect(r.plan.sessions![0].exercises[0].key).toBe("pompes-larges");
    expect(r.plan.session!.exercises[0].key).toBe("pompes-larges");
  });

  it("garde un cardio en cardio quand il faut le remplacer", () => {
    const r = enforceLibrary(plan(["Squat", "Rameur"]).cycles ? { ...plan(["Squat"]), cycles: [{ label: "Cycle 1", name: "", weeks: "", body: "", sessions: [{ cycleLabel: "", title: "A", meta: "", restSec: 90, warmup: [], exercises: [ex("Squat"), ex("Rameur", { cardio: true, duration: "15 min" })] }] }] } as unknown as Plan : plan([]), MAISON);
    const noms = r.plan.cycles![0].sessions![0].exercises;
    const cardio = noms.find((e) => e.cardio);
    expect(cardio).toBeDefined();
    expect(cardio!.name).not.toBe("Rameur");
  });

  it("chaque nom de la bibliothèque passe le verrou sans réparation", () => {
    const tout = EXERCISE_LIBRARY.map((e) => e.name);
    const r = enforceLibrary(plan(tout), [...SALLE, "kettlebells", "élastiques", "ballon de gym", "medecine ball", "rameur", "vélo", "elliptique", "corde à sauter", "roue abdominale", "box", "TRX", "leg extension", "leg curl", "machine à mollets assis", "hack squat", "pec deck", "poulie basse", "poulie vis-à-vis", "machine à abducteurs", "machine à adducteurs", "développé couché machine", "développé incliné machine", "rowing machine", "développé épaules machine", "machine à deltoïdes postérieurs", "pupitre à biceps", "machine à dips", "machine à abdominaux", "banc à lombaires", "machine à tractions assistées", "stairmaster", "sled", "smith machine", "barres parallèles", "vélo assault", "machine à hip thrust", "machine à kickback", "banc inclinable", "banc décliné", "machine à mollets debout", "T-bar row", "barre EZ", "tapis de sol"]);
    expect(r.repaired).toEqual([]);
    expect(r.removed).toEqual([]);
    expect(r.replaced).toEqual([]);
  });
});

describe("canonicalExercise", () => {
  it("ramène ce que tape le coach IA au nom de la fiche", () => {
    expect(canonicalExercise("hip thrust", SALLE)).toEqual({ name: "Hip thrust", key: "hip-thrust" });
    expect(canonicalExercise("pompes pieds surélevés", MAISON)?.key).toBe("pompes-pieds-sureleves");
  });

  it("refuse ce que le matériel ne permet pas, ou l'inconnu", () => {
    expect(canonicalExercise("Presse à cuisses", MAISON)).toBeNull();
    expect(canonicalExercise("exercice imaginaire", SALLE)).toBeNull();
  });

  it("accepte une fiche du coach", () => {
    expect(canonicalExercise("Tirage buste Sébastien", MAISON, COACH)?.key).toBe("coach-tirage-buste");
  });
});
