import { describe, it, expect } from "vitest";
import { isCardioExercise, cardioZone, karvonen } from "./fitness";

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
