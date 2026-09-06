import { describe, it, expect } from "vitest";
import { EXERCISE_LIBRARY, matchLibraryExercise } from "./exercise-library";
import { EQUIPMENT_CATALOG } from "./equipment-catalog";
import {
  EXERCISE_TRAITS,
  alternativeExercise,
  equipmentSupports,
  exercisesForEquipment,
  isCardioKey,
  pickAlternative,
  type Famille,
} from "./exercise-alternatives";

/**
 * Une salle correctement équipée, nommée dans le vocabulaire du catalogue.
 *
 * La liste était écrite à la main et disait « machine à mollets » sans préciser
 * laquelle : depuis que le moteur compare des identifiants, une salle qui ne
 * possède QUE la machine debout ne peut effectivement pas proposer des mollets
 * assis. Le correctif est du côté de la liste, pas du moteur : une vraie salle
 * a les deux.
 */
const SALLE = [
  "barre olympique", "rack à squat", "banc plat", "banc inclinable", "haltères",
  "poulie haute", "barre de traction", "barres parallèles", "presse à cuisses",
  "leg curl allongé", "machine à mollets debout", "machine à mollets assis",
  "tapis de course", "rameur", "vélo d'appartement", "corde à sauter",
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
    expect(equipmentSupports({ besoin: [] }, [])).toBe(true);
    expect(equipmentSupports({ besoin: [] }, MAISON)).toBe(true);
  });

  it("« poids du corps uniquement » ne couvre aucun besoin", () => {
    expect(equipmentSupports({ besoin: ["halteres"] }, MAISON)).toBe(false);
    expect(equipmentSupports({ besoin: ["poulie"] }, MAISON)).toBe(false);
  });

  it("exige TOUS les besoins, pas un seul", () => {
    expect(equipmentSupports({ besoin: ["barre", "banc"] }, ["barre olympique"])).toBe(false);
    expect(equipmentSupports({ besoin: ["barre", "banc"] }, ["barre olympique", "banc plat"])).toBe(true);
  });

  it("accepte un kettlebell là où un haltère suffit", () => {
    expect(equipmentSupports({ besoin: ["halteres"] }, ["kettlebells"])).toBe(true);
  });

  it("reconnaît le matériel écrit autrement, via le catalogue", () => {
    expect(equipmentSupports({ besoin: ["barre"] }, ["Barbell"])).toBe(true);
    expect(equipmentSupports({ besoin: ["machine"] }, ["Leg press"])).toBe(true);
    expect(equipmentSupports({ besoin: ["machine"] }, ["presse à cuisses inclinée 45°"])).toBe(true);
  });

  it("ne prend pas la machine à tirage horizontal pour un rameur", () => {
    // « Rowing machine » désigne les deux en salle : le catalogue tranche.
    expect(equipmentSupports({ besoin: ["rameur"] }, ["Rowing machine (assis)"])).toBe(false);
    expect(equipmentSupports({ besoin: ["rameur"] }, ["Rameur"])).toBe(true);
  });

  it("exige LA machine nommée, pas n'importe laquelle", () => {
    const legCurl = { besoin: ["machine"] as const, machine: ["leg-curl-allonge", "leg-curl-assis"] };
    expect(equipmentSupports({ ...legCurl, besoin: ["machine"] }, ["Pec deck"])).toBe(false);
    expect(equipmentSupports({ ...legCurl, besoin: ["machine"] }, ["Leg curl allongé"])).toBe(true);
  });

  it("accorde le bénéfice du doute à une salle décrite en texte libre", () => {
    // Rien à rattacher au catalogue, mais le mot « machine » est là : mieux
    // vaut proposer le mouvement que vider la séance.
    expect(
      equipmentSupports(
        { besoin: ["machine"], machine: ["leg-curl-allonge"] },
        ["machine multifonction de la salle"],
      ),
    ).toBe(true);
  });

  it("nomme une machine du catalogue pour chaque mouvement guidé", () => {
    const sans = Object.entries(EXERCISE_TRAITS)
      .filter(([, t]) => t.besoin.includes("machine") && !t.machine?.length)
      .map(([k]) => k);
    expect(sans).toEqual([]);
  });

  it("ne cite que des clés qui existent au catalogue", () => {
    const cles = new Set(EQUIPMENT_CATALOG.map((i) => i.key));
    const inconnues = Object.entries(EXERCISE_TRAITS)
      .flatMap(([k, t]) => (t.machine ?? []).map((m) => `${k}:${m}`))
      .filter((pair) => !cles.has(pair.split(":")[1]));
    expect(inconnues).toEqual([]);
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
    // Toute la poussée horizontale au poids du corps est déjà dans la séance :
    // mieux vaut rien qu'un doublon.
    const seance = EXERCISE_LIBRARY.filter((e) => {
      const t = EXERCISE_TRAITS[e.key];
      return t.familles.includes("pectoraux") && t.besoin.length === 0;
    }).map((e) => e.name);
    expect(seance.length).toBeGreaterThan(3);
    const alt = pickAlternative({ name: "Développé couché", equipment: MAISON, avoid: ["Développé couché", ...seance] });
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

  it("une variante reste dans la famille musculaire du mouvement d'origine", () => {
    const equip = ["Haltères", "Barre olympique", "Poulie", "Machine", "Banc", "Élastique"];
    const bas = ["Abduction de hanche à la poulie", "Hip thrust barre", "Presse à cuisses légère", "Leg curl élastique", "Machine à marches"];
    for (const n of bas) {
      const alt = pickAlternative({ name: n, equipment: equip });
      expect(alt, n).not.toBeNull();
      const f = EXERCISE_TRAITS[alt!.key].familles;
      expect(["quadriceps", "fessiers", "ischios", "adducteurs", "mollets", "cardio"], n).toContain(f[0]);
    }
    const haut = ["Rowing machine tirage horizontal", "Poussée inclinée machine", "Développé militaire haltères assis"];
    for (const n of haut) {
      const alt = pickAlternative({ name: n, equipment: equip });
      expect(alt, n).not.toBeNull();
      const f = EXERCISE_TRAITS[alt!.key].familles;
      expect(["pectoraux", "epaules", "epaules_arriere", "dos_horizontal", "dos_vertical", "triceps", "biceps", "trapezes"], n).toContain(f[0]);
    }
  });
});

describe("exercisesForEquipment", () => {
  /**
   * Accessoires dont le rôle n'est PAS de débloquer un mouvement. Chacun a sa
   * raison, écrite ici pour qu'on ne rallonge pas la liste par facilité.
   */
  const SANS_EXERCICE: Record<string, string> = {
    "poids-du-corps": "c'est l'absence de matériel, par définition",
    "tapis-sol": "il rend le sol supportable, il n'ouvre aucun mouvement",
  };

  it("chaque machine du catalogue débloque au moins un exercice", () => {
    const vides = EQUIPMENT_CATALOG.filter(
      (m) => !(m.key in SANS_EXERCICE) && exercisesForEquipment(m.key).length === 0,
    ).map((m) => m.key);
    expect(vides).toEqual([]);
  });

  it("les exceptions déclarées sont bien vides (sinon la liste ment)", () => {
    const fausses = Object.keys(SANS_EXERCICE).filter((k) => exercisesForEquipment(k).length > 0);
    expect(fausses).toEqual([]);
  });

  it("rend les exercices de la machine, pas ceux du voisin", () => {
    const cles = (k: string) => exercisesForEquipment(k).map((e) => e.key);
    expect(cles("presse-cuisses")).toEqual(["presse-jambes"]);
    // Une machine à développé couché ne fait pas d'incliné.
    expect(cles("developpe-couche-machine")).toEqual(["developpe-couche-machine"]);
    // Une machine à mollets debout ne fait pas de mollets assis.
    expect(cles("mollets-assis")).toEqual(["mollets-assis"]);
    expect(cles("hip-thrust-machine")).toEqual(["hip-thrust-machine"]);
  });

  it("ignore une clé qui n'est pas au catalogue", () => {
    expect(exercisesForEquipment("machine-imaginaire")).toEqual([]);
  });
});
