import { describe, it, expect } from "vitest";
import { matchLibraryExercise, normalizeExerciseName } from "./exercise-library";

describe("normalizeExerciseName", () => {
  it("retire accents, mots-outils et ponctuation (garde le matériel)", () => {
    expect(normalizeExerciseName("Développé couché à la barre")).toBe("developpe couche barre");
    expect(normalizeExerciseName("Rowing haltère (un bras)")).toBe("rowing haltere bras");
    expect(normalizeExerciseName("Curl biceps aux haltères")).toBe("curl biceps halteres");
  });
});

describe("matchLibraryExercise", () => {
  const cases: [string, string][] = [
    ["Développé couché haltères", "developpe-couche-halteres"],
    ["Développé couché", "developpe-couche"],
    ["Développé incliné aux haltères", "developpe-incline"],
    ["Squat barre", "squat"],
    ["Fentes marchées", "fentes-marchees"],
    ["Soulevé de terre roumain", "souleve-de-terre-roumain"],
    ["Rowing barre buste penché", "rowing-barre"],
    ["Tirage vertical poulie haute", "tirage-vertical"],
    ["Tractions pronation", "tractions"],
    ["Élévations latérales", "elevations-laterales"],
    ["Curl marteau", "curl-marteau"],
    ["Extension triceps à la poulie (corde)", "extension-triceps-poulie"],
    ["Gainage (planche)", "gainage-planche"],
    ["Presse à cuisses", "presse-jambes"],
    ["Leg curl allongé", "leg-curl-allonge"],
  ];

  for (const [name, key] of cases) {
    it(`« ${name} » -> ${key}`, () => {
      expect(matchLibraryExercise(name)?.key).toBe(key);
    });
  }

  it("distingue couché / incliné / militaire", () => {
    expect(matchLibraryExercise("Développé militaire")?.key).toBe("developpe-militaire");
    expect(matchLibraryExercise("Développé couché")?.key).toBe("developpe-couche");
  });

  it("reconnaît les mouvements additionnels", () => {
    expect(matchLibraryExercise("Rameur")?.key).toBe("rameur");
    expect(matchLibraryExercise("Marche du fermier")?.key).toBe("marche-fermier");
    expect(matchLibraryExercise("Kettlebell swing")?.key).toBe("kettlebell-swing");
  });

  it("reconnaît le lot 2 (enrichissement visuels)", () => {
    expect(matchLibraryExercise("Squat avant")?.key).toBe("front-squat");
    expect(matchLibraryExercise("Écarté couché haltères")?.key).toBe("ecarte-halteres");
    expect(matchLibraryExercise("Écarté à la poulie vis-à-vis")?.key).toBe("ecarte-poulie");
    expect(matchLibraryExercise("Pull-over haltère")?.key).toBe("pull-over");
    expect(matchLibraryExercise("Tractions supination")?.key).toBe("traction-supination");
    expect(matchLibraryExercise("Développé Arnold")?.key).toBe("developpe-arnold");
    expect(matchLibraryExercise("Curl concentration")?.key).toBe("curl-concentration");
    expect(matchLibraryExercise("Extension triceps au-dessus de la tête (corde)")?.key).toBe(
      "extension-triceps-verticale",
    );
    expect(matchLibraryExercise("Dead bug")?.key).toBe("dead-bug");
    expect(matchLibraryExercise("Soulevé de terre sumo")?.key).toBe("souleve-de-terre-sumo");
    expect(matchLibraryExercise("Course sur tapis")?.key).toBe("tapis-course");
    expect(matchLibraryExercise("Box jump")?.key).toBe("box-jump");
  });

  it("ne régresse pas sur les mouvements proches du lot 2", () => {
    // « développé couché » ne doit pas basculer sur l'écarté ou le décliné.
    expect(matchLibraryExercise("Développé couché")?.key).toBe("developpe-couche");
    expect(matchLibraryExercise("Tractions pronation")?.key).toBe("tractions");
    expect(matchLibraryExercise("Extension triceps à la poulie")?.key).toBe("extension-triceps-poulie");
    expect(matchLibraryExercise("Squat barre")?.key).toBe("squat");
  });

  it("renvoie null pour un exercice inconnu", () => {
    expect(matchLibraryExercise("Yoga du matin")).toBeNull();
    expect(matchLibraryExercise("")).toBeNull();
  });
});
