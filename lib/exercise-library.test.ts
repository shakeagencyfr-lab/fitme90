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

  it("leg curl machine tombe sur la fiche allongée (avec photo)", () => {
    expect(matchLibraryExercise("Leg curl machine")?.key).toBe("leg-curl-allonge");
    expect(matchLibraryExercise("Leg curl à la machine")?.key).toBe("leg-curl-allonge");
    expect(matchLibraryExercise("Leg curl léger avec sangles de suspension")?.key).toBe("leg-curl-suspension");
  });

  it("renvoie null pour un exercice inconnu", () => {
    expect(matchLibraryExercise("Yoga du matin")).toBeNull();
    expect(matchLibraryExercise("")).toBeNull();
  });

  it("lot 3 : hanches, machines et variantes ne se confondent plus", () => {
    // Le bug d'origine : « abduction » tombait sur le kickback (« extension
    // hanche poulie »), et la fiche décrivait un autre exercice.
    expect(matchLibraryExercise("Abduction de hanche à la poulie")?.key).toBe("abduction-hanche-debout");
    expect(matchLibraryExercise("Abduction hanche machine")?.key).toBe("abduction-hanche-machine");
    expect(matchLibraryExercise("Extension fessier poulie")?.key).toBe("kickback-fessier-poulie");
    expect(matchLibraryExercise("Kickback fessier")?.key).toBe("extension-fessier-poulie");
    expect(matchLibraryExercise("Machine à marches")?.key).toBe("machine-a-marches");
    expect(matchLibraryExercise("Rowing machine tirage horizontal lourd")?.key).toBe("rowing-machine");
    expect(matchLibraryExercise("Rameur HIIT")?.key).toBe("rameur");
    expect(matchLibraryExercise("Poussée inclinée machine à pectoraux")?.key).toBe("developpe-incline-machine");
    expect(matchLibraryExercise("Développé militaire haltères assis (banc réglable)")?.key).toBe("developpe-epaules-halteres-assis");
    expect(matchLibraryExercise("Développé militaire haltères debout")?.key).toBe("developpe-epaules-halteres");
    expect(matchLibraryExercise("Fentes statiques courtes")?.key).toBe("fentes-statiques");
    expect(matchLibraryExercise("Leg curl élastique (secondaire)")?.key).toBe("leg-curl-elastique");
    expect(matchLibraryExercise("Tractions assistées aux sangles de suspension")?.key).toBe("tractions-assistees");
    expect(matchLibraryExercise("Tirage vertical poulie haute prise neutre")?.key).toBe("tirage-vertical-prise-serree");
    expect(matchLibraryExercise("Vélo")?.key).toBe("velo-stationnaire");
    expect(matchLibraryExercise("Vélo Assault intervalles")?.key).toBe("air-bike");
    expect(matchLibraryExercise("Squat gobelet")?.key).toBe("squat-gobelet");
    expect(matchLibraryExercise("Soulevé roumain haltères léger")?.key).toBe("souleve-de-terre-roumain");
    expect(matchLibraryExercise("Extension triceps haltère")?.key).toBe("extension-triceps-verticale");
  });

  it("un seul mot de matériel en commun ne fait pas une correspondance", () => {
    // « machine » ou « poulie » seuls ne disent rien du mouvement.
    expect(matchLibraryExercise("Adducteurs à la poulie")?.key).not.toBe("extension-fessier-poulie");
    expect(matchLibraryExercise("Abduction de hanche")?.key).not.toBe("extension-fessier-poulie");
  });
});
