import { describe, it, expect } from "vitest";
import { EXERCISE_LIBRARY, matchLibraryExercise } from "./exercise-library";
import {
  EXERCISE_TRAITS,
  alternativeExercise,
  equipmentSupports,
  isCardioKey,
  pickAlternative,
  type Famille,
} from "./exercise-alternatives";

const SALLE = [
  "barre olympique", "rack à squat", "banc plat", "haltères", "poulie haute",
  "barre de traction", "barres parallèles", "presse à cuisses", "leg curl",
  "machine à mollets", "tapis de course", "rameur", "vélo", "corde à sauter",
];
const MAISON: string[] = ["poids du corps uniquement"];

describe("table des familles", () => {
  it("couvre chaque entrée de la bibliothèque", () => {
    const manquants = EXERCISE_LIBRARY.filter((e) => !EXERCISE_TRAITS[e.key]).map((e) => e.key);
    expect(manquants).toEqual([]);
  });

  it("ne décrit aucune entrée inexistante", () => {
    const cles = new Set(EXERCISE_LIBRARY.map((e) => e.key));
    expect(Object.keys(EXERCISE_TRAITS).filter((k) => !cles.has(k))).toEqual([]);
  });

  it("donne au moins une famille à chaque entrée", () => {
    for (const [k, t] of Object.entries(EXERCISE_TRAITS)) {
      expect(t.familles.length, k).toBeGreaterThan(0);
    }
  });
});

describe("equipmentSupports", () => {
  it("laisse passer un mouvement sans besoin, même sans matériel", () => {
    expect(equipmentSupports([], [])).toBe(true);
    expect(equipmentSupports([], MAISON)).toBe(true);
  });

  it("« poids du corps uniquement » ne couvre aucun besoin", () => {
    expect(equipmentSupports(["halteres"], MAISON)).toBe(false);
    expect(equipmentSupports(["poulie"], MAISON)).toBe(false);
  });

  it("exige TOUS les besoins, pas un seul", () => {
    expect(equipmentSupports(["barre", "banc"], ["barre olympique"])).toBe(false);
    expect(equipmentSupports(["barre", "banc"], ["barre olympique", "banc plat"])).toBe(true);
  });

  it("accepte un kettlebell là où un haltère suffit", () => {
    expect(equipmentSupports(["halteres"], ["kettlebells"])).toBe(true);
  });
});

describe("pickAlternative", () => {
  it("remplace un mouvement de salle par un mouvement au poids du corps à la maison", () => {
    const alt = pickAlternative({ name: "Développé couché", equipment: MAISON });
    expect(alt?.key).toBe("pompes");
  });

  it("ne rend jamais l'exercice d'origine", () => {
    for (const entry of EXERCISE_LIBRARY) {
      const alt = pickAlternative({ name: entry.name, equipment: SALLE });
      expect(alt?.key, entry.key).not.toBe(entry.key);
    }
  });

  it("chaque nom de la bibliothèque se reconnaît lui-même", () => {
    // Sans cette garantie, une alternative partirait de la mauvaise famille :
    // deux alias trop proches font résoudre « Gainage latéral » en « planche ».
    const confondus = EXERCISE_LIBRARY
      .filter((e) => matchLibraryExercise(e.name)?.key !== e.key)
      .map((e) => `${e.key} → ${matchLibraryExercise(e.name)?.key}`);
    expect(confondus).toEqual([]);
  });

  it("écarte tout ce qui est déjà dans la séance", () => {
    const seance = ["Développé couché", "Pompes", "Dips"];
    const alt = pickAlternative({ name: "Développé couché", equipment: MAISON, avoid: seance });
    // Rien d'autre en pectoraux au poids du corps : mieux vaut rien qu'un doublon.
    expect(alt).toBeNull();
  });

  it("ne propose que du matériel réellement disponible", () => {
    for (const entry of EXERCISE_LIBRARY) {
      const alt = pickAlternative({ name: entry.name, equipment: MAISON });
      if (!alt) continue;
      expect(EXERCISE_TRAITS[alt.key].besoin, alt.key).toEqual([]);
    }
  });

  it("garde la famille principale", () => {
    for (const entry of EXERCISE_LIBRARY) {
      const alt = pickAlternative({ name: entry.name, equipment: SALLE });
      if (!alt) continue;
      const principale = EXERCISE_TRAITS[entry.key].familles[0] as Famille;
      expect(EXERCISE_TRAITS[alt.key].familles, `${entry.key} → ${alt.key}`).toContain(principale);
    }
  });

  it("ne mélange jamais cardio et musculation", () => {
    for (const entry of EXERCISE_LIBRARY) {
      const alt = pickAlternative({ name: entry.name, equipment: SALLE });
      if (!alt) continue;
      expect(isCardioKey(alt.key), `${entry.key} → ${alt.key}`).toBe(isCardioKey(entry.key));
    }
  });

  it("trouve une alternative en salle pour chaque exercice de la bibliothèque", () => {
    const orphelins = EXERCISE_LIBRARY
      .filter((e) => !pickAlternative({ name: e.name, equipment: SALLE }))
      .map((e) => e.key);
    expect(orphelins).toEqual([]);
  });

  it("couvre le haut du corps même sans aucun matériel", () => {
    // Un client sans rien doit pouvoir remplacer un tirage : c'est la raison
    // d'être des deux entrées à l'élastique.
    const alt = pickAlternative({ name: "Tirage vertical", equipment: ["élastiques"] });
    expect(alt?.key).toBe("tirage-elastique");
  });

  it("rend null sur un nom inconnu plutôt qu'un mouvement au hasard", () => {
    expect(pickAlternative({ name: "Zorglub press", equipment: SALLE })).toBeNull();
  });

  it("est déterministe", () => {
    const a = pickAlternative({ name: "Squat", equipment: SALLE });
    const b = pickAlternative({ name: "Squat", equipment: SALLE });
    expect(a?.key).toBe(b?.key);
  });
});

describe("alternativeExercise", () => {
  it("conserve le volume et vide la charge", () => {
    const ex = alternativeExercise({
      name: "Développé couché", equipment: MAISON, sets: 4, reps: "6-8", rest: 120,
    });
    expect(ex).toMatchObject({ name: "Pompes", sets: 4, reps: "6-8", rest: 120, load: "", cardio: false });
    expect(ex?.note).toBeTruthy();
  });

  it("garde le format cardio quand l'origine est du cardio", () => {
    const ex = alternativeExercise({
      name: "Course sur tapis", equipment: SALLE, cardio: true, duration: "25 min", zone: "Z2",
    });
    expect(ex?.cardio).toBe(true);
    expect(ex?.sets).toBe(0);
    expect(ex?.reps).toBe("");
    expect(ex?.duration).toBe("25 min");
    expect(ex?.zone).toBe("Z2");
  });

  it("rend un nom que la bibliothèque connaît (fiche et photos garanties)", () => {
    const ex = alternativeExercise({ name: "Presse à cuisses", equipment: MAISON });
    expect(ex).not.toBeNull();
    expect(matchLibraryExercise(ex!.name)).not.toBeNull();
  });
});
