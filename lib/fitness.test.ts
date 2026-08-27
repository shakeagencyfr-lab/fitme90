import { describe, it, expect } from "vitest";
import { isCardioExercise, cardioZone, karvonen, parseRestSeconds, resolveRestSeconds, formatRest } from "./fitness";

describe("parseRestSeconds — seulement précédé d'un mot de repos", () => {
  it("lit un vrai temps de repos", () => {
    expect(parseRestSeconds("Repos 75s")).toBe(75);
    expect(parseRestSeconds("récup 90 s")).toBe(90);
    expect(parseRestSeconds("repos 1mn30 entre les séries")).toBe(90);
    expect(parseRestSeconds("récupération 2 min")).toBe(120);
  });
  it("ignore les durées qui ne sont PAS du repos (bug 5 min)", () => {
    expect(parseRestSeconds("Rameur 5 min allure conversationnelle")).toBeNull();
    expect(parseRestSeconds("Séance 45 min")).toBeNull();
    expect(parseRestSeconds("20 min de cardio")).toBeNull();
  });
});

describe("resolveRestSeconds — champ structuré prioritaire", () => {
  it("préfère restSec quand il est valide", () => {
    expect(resolveRestSeconds(75, "repos 120s")).toBe(75);
  });
  it("retombe sur le texte de repos, sinon 90", () => {
    expect(resolveRestSeconds(undefined, "Repos 75s")).toBe(75);
    expect(resolveRestSeconds(undefined, "Rameur 5 min")).toBe(90);
    expect(resolveRestSeconds(0)).toBe(90);
  });
});

describe("formatRest", () => {
  it("formate en 1mn15 / 45s / 2mn", () => {
    expect(formatRest(75)).toBe("1mn15");
    expect(formatRest(45)).toBe("45s");
    expect(formatRest(120)).toBe("2mn");
    expect(formatRest(90)).toBe("1mn30");
  });
});

describe("isCardioExercise — détection par mots entiers (nom seul)", () => {
  it("reconnaît les vrais exercices cardio", () => {
    expect(isCardioExercise("Vélo elliptique (échauffement)")).toBe(true);
    expect(isCardioExercise("Rameur")).toBe(true);
    expect(isCardioExercise("Course sur tapis")).toBe(true);
    expect(isCardioExercise("Corde à sauter")).toBe(true);
    expect(isCardioExercise("Fractionné HIIT")).toBe(true);
  });

  it("ne se déclenche PAS sur la musculation (pas de sous-chaîne)", () => {
    expect(isCardioExercise("Développé couché au banc")).toBe(false); // contient "velo"
    expect(isCardioExercise("Tirage vertical à la poulie")).toBe(false);
    expect(isCardioExercise("Développé militaire")).toBe(false);
    expect(isCardioExercise("Squat")).toBe(false);
  });

  it("ne se laisse pas contaminer par la note", () => {
    // La note mentionne « développé » mais l'exercice n'est pas cardio.
    expect(isCardioExercise("Tirage horizontal", "Enchaîné avec le développé")).toBe(false);
  });

  it("respecte le flag explicite du plan", () => {
    expect(isCardioExercise("Circuit métabolique", "", true)).toBe(true);
  });
});

describe("cardioZone — choix de la zone", () => {
  const { zones } = karvonen(34, 62);
  it("utilise l'indice explicite Z2/Z4", () => {
    expect(cardioZone(zones, "Z2", "Vélo").id).toBe("Z2");
    expect(cardioZone(zones, "Z4", "Rameur").id).toBe("Z4");
  });
  it("déduit des mots-clés, défaut endurance Z2", () => {
    expect(cardioZone(zones, "", "Fractionné", "intervalles courts").id).toBe("Z4");
    expect(cardioZone(zones, "", "Marche de récupération").id).toBe("Z1");
    expect(cardioZone(zones, "", "Vélo").id).toBe("Z2");
  });
});
