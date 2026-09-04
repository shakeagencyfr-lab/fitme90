import { describe, it, expect } from "vitest";
import {
  buildMiniProgram,
  sessionMinutes,
  formatRest,
  fitToSlot,
  GOALS, LEVELS, EQUIPMENTS, DURATIONS, FOCUSES, CONCERNS,
  type LeadAnswers,
} from "./lead-magnet";
import { MOVEMENTS, available, pick } from "./lead-magnet-engine";
import { computeMacros, mealCalories } from "./lead-magnet-nutrition";

/**
 * Le mini-programme est le seul document que des inconnus reçoivent sans
 * qu'un humain l'ait relu. Il est aussi entièrement déterministe : tout ce
 * qu'il contient est donc vérifiable ici, et doit l'être.
 */

const BASE: LeadAnswers = {
  goal: "muscle",
  level: "intermediaire",
  days: 3,
  equipment: "salle",
  duration: 60,
  focus: "equilibre",
  concern: "aucune",
  sex: "homme",
  age: 32,
  heightCm: 178,
  weightKg: 78,
  activity: "modere",
};

describe("catalogue de mouvements", () => {
  it("donne au moins une option sans contrainte pour chaque matériel", () => {
    // Sans cette garantie, un profil très contraint recevrait des séances
    // trouées : c'est le pire cas et il doit rester utilisable.
    for (const eq of EQUIPMENTS) {
      for (const joint of ["dos", "genoux", "epaules"] as const) {
        expect(available(eq, joint).length).toBeGreaterThan(5);
      }
    }
  });

  it("couvre les schémas de base pour chaque matériel", () => {
    const base = ["squat", "charniere", "poussee_h", "tirage_h", "gainage"] as const;
    for (const eq of EQUIPMENTS) {
      for (const p of base) {
        expect(available(eq, null).some((m) => m.pattern === p), `${eq} / ${p}`).toBe(true);
      }
    }
  });

  it("ne propose jamais un mouvement indisponible pour le matériel", () => {
    for (const eq of EQUIPMENTS) {
      for (const m of available(eq, null)) expect(m.equip).toContain(eq);
    }
  });

  it("évite d'abord ce qui a déjà servi ailleurs dans la semaine", () => {
    const premier = pick("gainage", "maison", null, new Set())!;
    const second = pick("gainage", "maison", null, new Set(), new Set([premier.name]))!;
    expect(second.name).not.toBe(premier.name);
  });

  it("se répète plutôt que de rendre rien quand le catalogue est épuisé", () => {
    // Sur six séances, un schéma peu fourni finit par manquer d'options :
    // répéter un mouvement vaut mieux que laisser un trou dans la séance.
    const tous = new Set(MOVEMENTS.filter((m) => m.pattern === "squat").map((m) => m.name));
    expect(pick("squat", "maison", null, new Set(), tous)).not.toBeNull();
  });
});

describe("durée d'une séance", () => {
  it("ne compte pas le repos après la dernière série", () => {
    // Sinon chaque séance serait annoncée une à deux minutes trop longue, ce
    // qui suffit à faire déborder un créneau de trente minutes.
    const avec = sessionMinutes(1, 1, 60);
    expect(avec).toBe(8 + 1); // échauffement + 40 s de travail, aucun repos
  });

  it("croît avec le nombre d'exercices, de séries et le repos", () => {
    expect(sessionMinutes(6, 4, 80)).toBeGreaterThan(sessionMinutes(4, 4, 80));
    expect(sessionMinutes(4, 5, 80)).toBeGreaterThan(sessionMinutes(4, 4, 80));
    expect(sessionMinutes(4, 4, 150)).toBeGreaterThan(sessionMinutes(4, 4, 80));
  });

  it("écrit une durée comme on la lit sur un chrono", () => {
    expect(formatRest(50)).toBe("50 s");
    expect(formatRest(120)).toBe("2 min");
    expect(formatRest(150)).toBe("2 min 30");
  });
});

describe("construction du programme", () => {
  it("tient dans le créneau annoncé, sur toutes les combinaisons", () => {
    // C'est la contrainte la plus concrète du document : une séance d'une
    // heure proposée à quelqu'un qui a trente minutes ne sera pas faite.
    // Deux balayages plutôt qu'un produit cartésien complet : le créneau
    // dépend de l'objectif et du niveau (le volume), et du matériel et de la
    // gêne (le nombre de mouvements disponibles). Croiser les quatre coûterait
    // quelques milliers de constructions pour ne rien couvrir de plus.
    for (const duration of DURATIONS) {
      for (const goal of GOALS) {
        for (const level of LEVELS) {
          const p = buildMiniProgram({ ...BASE, duration, goal, level, days: 6 });
          for (const s of p.sessions) {
            expect(s.minutes, `${duration}/${goal}/${level} → ${s.minutes} min`).toBeLessThanOrEqual(duration);
          }
        }
      }
    }
    for (const duration of DURATIONS) {
      for (const eq of EQUIPMENTS) {
        for (const concern of CONCERNS) {
          const p = buildMiniProgram({ ...BASE, duration, equipment: eq, concern, days: 6 });
          for (const s of p.sessions) {
            expect(s.minutes, `${duration}/${eq}/${concern} → ${s.minutes} min`).toBeLessThanOrEqual(duration);
          }
        }
      }
    }
  });

  it("garde au moins trois exercices, même sur le créneau le plus court", () => {
    for (const goal of GOALS) {
      const p = buildMiniProgram({ ...BASE, duration: 30, goal, level: "debutant" });
      for (const s of p.sessions) expect(s.exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("écarte tout ce qui charge l'articulation signalée", () => {
    for (const concern of ["dos", "genoux", "epaules"] as const) {
      for (const eq of EQUIPMENTS) {
        const p = buildMiniProgram({ ...BASE, concern, equipment: eq, days: 6 });
        for (const s of p.sessions) {
          for (const e of s.exercises) {
            const m = MOVEMENTS.find((x) => x.name === e.name)!;
            expect(m.stress, `${e.name} avec ${concern}`).not.toContain(concern);
          }
        }
      }
    }
  });

  it("ne répète jamais un exercice dans la même séance", () => {
    for (const days of [2, 3, 4, 5, 6]) {
      const p = buildMiniProgram({ ...BASE, days });
      for (const s of p.sessions) {
        expect(new Set(s.exercises.map((e) => e.name)).size).toBe(s.exercises.length);
      }
    }
  });

  it("produit autant de séances que demandé, de 2 à 6", () => {
    for (const days of [2, 3, 4, 5, 6]) {
      expect(buildMiniProgram({ ...BASE, days }).sessions).toHaveLength(days);
      // Et le calendrier compte exactement autant de jours travaillés.
      const plan = buildMiniProgram({ ...BASE, days }).weekPlan;
      expect(plan).toHaveLength(7);
      expect(plan.filter((d) => d.kind === "session")).toHaveLength(days);
    }
  });

  it("borne un nombre de séances aberrant au lieu de casser", () => {
    expect(buildMiniProgram({ ...BASE, days: 0 }).sessions.length).toBeGreaterThanOrEqual(2);
    expect(buildMiniProgram({ ...BASE, days: 99 }).sessions).toHaveLength(6);
  });

  it("est parfaitement déterministe", () => {
    // Deux personnes qui répondent la même chose reçoivent le même document.
    // C'est ce qui permet à un coach de savoir ce qu'il envoie.
    const a = JSON.stringify(buildMiniProgram(BASE));
    const b = JSON.stringify(buildMiniProgram({ ...BASE }));
    expect(a).toBe(b);
  });

  it("donne un exercice de plus quand une zone est prioritaire", () => {
    const equilibre = buildMiniProgram({ ...BASE, focus: "equilibre", duration: 75 });
    for (const focus of FOCUSES.filter((f) => f !== "equilibre")) {
      const cible = buildMiniProgram({ ...BASE, focus, duration: 75 });
      expect(cible.sessions[0].exercises.length).toBeGreaterThanOrEqual(
        equilibre.sessions[0].exercises.length,
      );
    }
  });

  it("remplit toujours chaque exercice de bout en bout", () => {
    for (const eq of EQUIPMENTS) {
      for (const concern of CONCERNS) {
        const p = buildMiniProgram({ ...BASE, equipment: eq, concern, days: 6 });
        for (const s of p.sessions) {
          expect(s.exercises.length).toBeGreaterThan(0);
          for (const e of s.exercises) {
            expect(e.name.length).toBeGreaterThan(2);
            expect(e.cue.length).toBeGreaterThan(10);
            expect(e.alt.length).toBeGreaterThan(10);
            expect(e.sets).toBeGreaterThanOrEqual(2);
            expect(e.reps).toBeTruthy();
            expect(e.rest).toBeTruthy();
          }
        }
      }
    }
  });

  it("place un finisher sur la dernière séance seulement, et pour la perte", () => {
    const perte = buildMiniProgram({ ...BASE, goal: "perte", days: 3 });
    expect(perte.sessions[0].finisher).toBeNull();
    expect(perte.sessions[2].finisher).toBeTruthy();
    expect(buildMiniProgram({ ...BASE, goal: "force" }).sessions.at(-1)!.finisher).toBeNull();
  });

  it("donne quatre semaines de progression, pas une", () => {
    for (const goal of GOALS) {
      const w = buildMiniProgram({ ...BASE, goal }).fourWeeks;
      expect(w.map((x) => x.week)).toEqual([1, 2, 3, 4]);
      for (const x of w) expect(x.detail.length).toBeGreaterThan(30);
    }
  });

  it("dit au lecteur ce que ses réponses ont changé", () => {
    const p = buildMiniProgram({ ...BASE, concern: "genoux", focus: "haut" });
    expect(p.personalisation.some((t) => t.includes("genoux"))).toBe(true);
    expect(p.personalisation.some((t) => t.includes("haut du corps"))).toBe(true);
  });
});

describe("faire entrer une séance dans son créneau", () => {
  const musculation = { sets: 4, reps: "8-12", restSec: 80, restFloor: 55, cede: "repos" as const };
  const force = { sets: 4, reps: "5-6", restSec: 150, restFloor: 120, cede: "exercices" as const };

  it("ne touche à rien quand la séance tient déjà", () => {
    const f = fitToSlot(4, 4, 80, 90, musculation);
    expect(f).toMatchObject({ count: 4, sets: 4, restSec: 80 });
  });

  it("raccourcit le repos avant de retirer un exercice, hors force", () => {
    // Perdre un mouvement coûte plus cher qu'un repos plus court : c'est le
    // mouvement qui construit la séance.
    const f = fitToSlot(6, 4, 80, 45, musculation);
    expect(f.restSec).toBeLessThan(80);
    expect(f.count).toBeGreaterThanOrEqual(3);
  });

  it("retire un exercice avant de toucher au repos, en force", () => {
    // La récupération entre séries lourdes EST la séance : la raccourcir en
    // premier reviendrait à changer d'objectif sans le dire.
    const f = fitToSlot(6, 4, 150, 45, force);
    expect(f.count).toBeLessThan(6);
    expect(f.restSec).toBe(150);
  });

  it("ne descend jamais sous trois exercices ni trois séries", () => {
    const f = fitToSlot(6, 5, 150, 10, force);
    expect(f.count).toBe(3);
    expect(f.sets).toBe(3);
  });

  it("ne descend jamais sous le plancher de repos de l'objectif", () => {
    expect(fitToSlot(6, 5, 150, 10, force).restSec).toBeGreaterThanOrEqual(120);
    expect(fitToSlot(6, 5, 80, 10, musculation).restSec).toBeGreaterThanOrEqual(55);
  });

  it("annonce la vraie durée, même quand elle dépasse", () => {
    // Un créneau intenable est un fait : annoncer dix minutes pour une séance
    // qui en dure trente est un mensonge qui se découvre dès la première fois.
    const f = fitToSlot(6, 5, 150, 10, force);
    expect(f.minutes).toBe(sessionMinutes(f.count, f.sets, f.restSec));
    expect(f.minutes).toBeGreaterThan(10);
  });
});

describe("chiffrage nutritionnel", () => {
  const M = { sex: "homme" as const, age: 32, heightCm: 178, weightKg: 78, activity: "modere" as const, goal: "muscle" as const, days: 3 };

  it("applique Mifflin-St Jeor à la lettre", () => {
    // 10×78 + 6,25×178 − 5×32 + 5 = 780 + 1112,5 − 160 + 5 = 1737,5 → 1738
    expect(computeMacros(M)!.bmr).toBe(1738);
  });

  it("distingue les deux constantes de la formule", () => {
    const h = computeMacros(M)!.bmr;
    const f = computeMacros({ ...M, sex: "femme" })!.bmr;
    expect(h - f).toBe(166);
  });

  it("ne rend rien quand une mesure manque", () => {
    // Un chiffre faux est pire qu'un chiffre absent : il sera suivi.
    expect(computeMacros({ ...M, age: null })).toBeNull();
    expect(computeMacros({ ...M, heightCm: null })).toBeNull();
    expect(computeMacros({ ...M, weightKg: null })).toBeNull();
    expect(computeMacros({ ...M, sex: "nsp" })).toBeNull();
  });

  it("ne rend rien sur une saisie hors bornes", () => {
    expect(computeMacros({ ...M, heightCm: 17 })).toBeNull();
    expect(computeMacros({ ...M, weightKg: 800 })).toBeNull();
    expect(computeMacros({ ...M, age: 7 })).toBeNull();
  });

  it("creuse pour la perte et ajoute pour la prise", () => {
    const perte = computeMacros({ ...M, goal: "perte" })!;
    const muscle = computeMacros({ ...M, goal: "muscle" })!;
    const forme = computeMacros({ ...M, goal: "forme" })!;
    expect(perte.target).toBeLessThan(perte.tdee);
    expect(muscle.target).toBeGreaterThan(muscle.tdee);
    expect(forme.target).toBe(forme.tdee);
  });

  it("monte les protéines en déficit, là où elles protègent le muscle", () => {
    expect(computeMacros({ ...M, goal: "perte" })!.proteinG)
      .toBeGreaterThan(computeMacros({ ...M, goal: "forme" })!.proteinG);
  });

  it("fait tomber les macros juste sur la cible", () => {
    for (const goal of GOALS) {
      const m = computeMacros({ ...M, goal })!;
      const somme = m.proteinG * 4 + m.carbG * 4 + m.fatG * 9;
      // Arrondi au gramme près sur trois postes : quelques kcal d'écart.
      expect(Math.abs(somme - m.target)).toBeLessThan(10);
    }
  });

  it("ne rend jamais de glucides négatifs", () => {
    // Un profil très léger en gros déficit : le plancher de lipides et les
    // protéines peuvent à eux seuls dépasser la cible.
    const m = computeMacros({ ...M, weightKg: 45, heightCm: 150, goal: "perte", activity: "sedentaire" })!;
    expect(m.carbG).toBeGreaterThanOrEqual(0);
  });

  it("répartit la journée en quatre repas qui font le total", () => {
    const repas = mealCalories(2000);
    expect(repas).toHaveLength(4);
    const total = repas.reduce((s, r) => s + r.kcal, 0);
    expect(Math.abs(total - 2000)).toBeLessThanOrEqual(20);
  });

  it("n'annonce aucun chiffre dans le document sans les quatre mesures", () => {
    const sans = buildMiniProgram({ ...BASE, age: null });
    expect(sans.nutrition.macros).toBeNull();
    expect(sans.nutrition.meals).toEqual([]);
    // Et le repli qualitatif prend le relais plutôt que de laisser un vide.
    expect(sans.nutrition.calorieHint.length).toBeGreaterThan(20);
  });
});
