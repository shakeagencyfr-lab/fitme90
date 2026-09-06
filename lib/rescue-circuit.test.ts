import { describe, it, expect } from "vitest";
import {
  alterneZones,
  circuitFromSession,
  decoupeBlocs,
  isRescueKind,
  rescueExercises,
  rescueSession,
  RESCUE_EQUIPMENT,
  type RescueExercise,
} from "./rescue-circuit";
import { circuitSeconds, isCircuitSession } from "./circuit";
import { EXERCISE_TRAITS, equipmentSupports } from "./exercise-alternatives";
import type { PlanExercise, Session } from "./program";

const ex = (name: string, extra: Partial<PlanExercise> = {}): PlanExercise => ({
  name, sets: 4, reps: "8-10", load: "60 kg", note: "note d'origine", cardio: false, duration: "", zone: "", ...extra,
});

// Une séance de salle typique : barre, machines, poulie.
const salle: Session = {
  cycleLabel: "Cycle 1 · Séance A",
  title: "Haut du corps",
  meta: "",
  restSec: 90,
  format: "sets",
  warmup: [{ name: "Rameur", detail: "5 min" }],
  exercises: [
    ex("Développé couché", { key: "developpe-couche" }),
    ex("Tirage vertical", { key: "tirage-vertical" }),
    ex("Développé militaire", { key: "developpe-militaire" }),
    ex("Presse à cuisses", { key: "presse-jambes" }),
    ex("Extension triceps poulie", { key: "extension-triceps-poulie" }),
    ex("Gainage planche", { key: "gainage-planche", sets: 3, reps: "45 s", load: "" }),
  ],
};

describe("rescueExercises", () => {
  it("remplace tout ce qui demande du matériel, et garde ce qui passe déjà", () => {
    const { exercises: r } = rescueExercises(salle, "aucun");
    expect(r.length).toBeGreaterThanOrEqual(5);
    // Le gainage était déjà praticable : il reste, avec sa note d'origine.
    const gainage = r.find((x) => x.key === "gainage-planche");
    expect(gainage?.garde).toBe(true);
    expect(gainage?.note).toBe("note d'origine");
    // Tout le reste est praticable au poids du corps.
    for (const e of r) {
      expect(equipmentSupports(EXERCISE_TRAITS[e.key], RESCUE_EQUIPMENT.aucun)).toBe(true);
    }
    // Et rien ne demande plus de barre, de poulie ni de machine.
    expect(r.map((e) => e.key)).not.toContain("developpe-couche");
    expect(r.map((e) => e.key)).not.toContain("presse-jambes");
  });

  it("garde la famille de travail : une poussée reste une poussée", () => {
    const { exercises: r } = rescueExercises(salle, "aucun");
    const familles = r.map((e) => EXERCISE_TRAITS[e.key].familles[0]);
    expect(familles).toContain("pectoraux");
    expect(familles).toContain("quadriceps");
    expect(familles).toContain("triceps");
  });

  it("dit ce qu'il n'a pas su remplacer plutôt que de servir autre chose", () => {
    // Sans le moindre objet, un tirage vertical n'a pas d'équivalent honnête.
    const sansRien = rescueExercises(salle, "aucun");
    expect(sansRien.dropped).toContain("Tirage vertical (poulie haute)");
    expect(sansRien.exercises.map((e) => EXERCISE_TRAITS[e.key].familles[0])).not.toContain("dos_vertical");
    // Avec un élastique ou des haltères, le dos revient et rien ne manque.
    const hotel = rescueExercises(salle, "hotel");
    expect(hotel.dropped).toEqual([]);
    expect(hotel.exercises.map((e) => EXERCISE_TRAITS[e.key].familles[0])).toContain("dos_vertical");
  });

  it("profite des haltères quand il y en a", () => {
    const { exercises: r } = rescueExercises(salle, "halteres");
    const avecHalteres = r.filter((e) => EXERCISE_TRAITS[e.key].besoin.includes("halteres"));
    expect(avecHalteres.length).toBeGreaterThan(0);
    for (const e of r) {
      expect(equipmentSupports(EXERCISE_TRAITS[e.key], RESCUE_EQUIPMENT.halteres)).toBe(true);
    }
  });

  it("ne répète jamais deux fois le même mouvement", () => {
    const doublons: Session = { ...salle, exercises: [ex("Développé couché"), ex("Développé incliné"), ex("Développé couché haltères")] };
    const { exercises: r } = rescueExercises(doublons, "aucun");
    expect(new Set(r.map((e) => e.key)).size).toBe(r.length);
  });

  it("sait repartir d'une séance déjà en circuit", () => {
    const circuit: Session = {
      ...salle,
      format: "circuit",
      exercises: [],
      blocks: [
        { title: "Bloc 1", rounds: 3, work: 40, rest: 20, roundRest: 30, restAfter: 0, exercises: [{ name: "Kettlebell swing", note: "" }, { name: "Pompes", note: "" }] },
      ],
    };
    const { exercises: r } = rescueExercises(circuit, "aucun");
    expect(r.map((e) => e.name)).toContain("Pompes");
    expect(r.length).toBe(2);
  });
});

describe("alterneZones", () => {
  it("ne met pas deux fois la même zone à la suite quand une autre attend", () => {
    const e = (name: string, zone: RescueExercise["zone"]): RescueExercise => ({ name, key: name, note: "", zone, garde: false });
    const out = alterneZones([
      e("a", "jambes"), e("b", "jambes"), e("c", "jambes"),
      e("d", "haut"), e("e", "haut"),
      e("f", "tronc"),
    ]);
    expect(out).toHaveLength(6);
    let colles = 0;
    for (let i = 1; i < out.length; i++) if (out[i].zone === out[i - 1].zone) colles++;
    // Trois jambes pour six exercices : au plus un accolement en fin de liste.
    expect(colles).toBeLessThanOrEqual(1);
  });
});

describe("decoupeBlocs", () => {
  it("fait des blocs de taille voisine, trois au maximum", () => {
    const e = (n: number): RescueExercise => ({ name: `e${n}`, key: `e${n}`, note: "", zone: "jambes", garde: false });
    expect(decoupeBlocs([]).length).toBe(0);
    expect(decoupeBlocs([e(1), e(2), e(3)]).map((b) => b.length)).toEqual([3]);
    expect(decoupeBlocs(Array.from({ length: 6 }, (_, i) => e(i))).map((b) => b.length)).toEqual([3, 3]);
    expect(decoupeBlocs(Array.from({ length: 12 }, (_, i) => e(i))).map((b) => b.length)).toEqual([4, 4, 4]);
    expect(decoupeBlocs(Array.from({ length: 20 }, (_, i) => e(i))).length).toBeLessThanOrEqual(3);
  });
});

describe("rescueSession", () => {
  it("rend des blocs jouables, titrés, et qui tiennent dans la durée", () => {
    const s = rescueSession({ session: salle, kind: "aucun", level: "intermediaire", minutes: 45, cycleIndex: 0, locale: "fr" });
    expect(s.blocks.length).toBeGreaterThan(0);
    expect(s.blocks[0].title).toMatch(/^Bloc 1 · /);
    expect(s.blocks.at(-1)!.restAfter).toBe(0);
    expect(s.warmup).toHaveLength(3);
    expect(s.dropped).toContain("Tirage vertical (poulie haute)");
    expect(circuitSeconds(s.blocks)).toBeLessThanOrEqual(38 * 60);
    // Les paramètres suivent le cycle en cours.
    expect(s.blocks[0].work).toBe(40);
    expect(s.blocks[0].sensation).toBe(2);
    const c3 = rescueSession({ session: salle, kind: "aucun", level: "intermediaire", minutes: 45, cycleIndex: 2, locale: "fr" });
    expect(c3.blocks[0].work).toBe(50);
    expect(c3.blocks[0].sensation).toBe(3);
  });

  it("tient dans une durée courte en retirant des tours", () => {
    const court = rescueSession({ session: salle, kind: "aucun", level: "avance", minutes: 25, cycleIndex: 1, locale: "fr" });
    expect(circuitSeconds(court.blocks)).toBeLessThanOrEqual(18 * 60);
    expect(court.blocks.every((b) => b.exercises.length >= 2)).toBe(true);
  });

  it("écrit ses blocs et son échauffement en anglais quand le client l'est", () => {
    const en = rescueSession({ session: salle, kind: "hotel", level: "debutant", minutes: 45, cycleIndex: 0, locale: "en" });
    expect(en.blocks[0].title).toMatch(/^Block 1 · /);
    expect(en.warmup[0].name).toBe("Warm up");
  });

  it("produit bien une séance en circuit au sens de lib/circuit", () => {
    const s = rescueSession({ session: salle, kind: "aucun", level: "intermediaire", minutes: 45, cycleIndex: 0, locale: "fr" });
    expect(isCircuitSession({ format: "circuit", blocks: s.blocks })).toBe(true);
  });
});

describe("isRescueKind", () => {
  it("n'accepte que les trois situations connues", () => {
    expect(isRescueKind("aucun")).toBe(true);
    expect(isRescueKind("hotel")).toBe(true);
    expect(isRescueKind("halteres")).toBe(true);
    expect(isRescueKind("machine")).toBe(false);
    expect(isRescueKind(null)).toBe(false);
  });
});

describe("durée d'une séance de dépannage", () => {
  it("remplit le temps dont le client dispose, sans le dépasser", () => {
    const s = rescueSession({ session: salle, kind: "aucun", level: "intermediaire", minutes: 45, cycleIndex: 0, locale: "fr" });
    const total = circuitSeconds(s.blocks);
    // Entre les deux tiers et la totalité des 38 minutes disponibles.
    expect(total).toBeGreaterThan(24 * 60);
    expect(total).toBeLessThanOrEqual(38 * 60);
    expect(s.blocks.every((b) => b.rounds <= 6)).toBe(true);
  });
});

describe("circuitFromSession avec le matériel du client", () => {
  const SALLE = ["Barre olympique et disques", "Haltères", "Poulie haute (tirage vertical)", "Presse à cuisses", "Banc plat", "Barre de traction", "Kettlebells"];

  it("garde les mouvements de salle et les met au chrono", () => {
    const s = circuitFromSession({ session: salle, equipment: SALLE, level: "intermediaire", minutes: 45, cycleIndex: 0, locale: "fr" });
    expect(s.blocks.length).toBeGreaterThan(0);
    const noms = s.blocks.flatMap((b) => b.exercises.map((e) => e.name));
    // Rien n'a été remplacé : le client a tout ce qu'il faut.
    expect(noms).toContain("Développé couché");
    expect(noms).toContain("Tirage vertical (poulie haute)");
    expect(s.dropped).toEqual([]);
    // Et c'est bien un circuit : des tours, un effort en secondes, pas de charge.
    for (const b of s.blocks) {
      expect(b.rounds).toBeGreaterThanOrEqual(2);
      expect(b.work).toBeGreaterThanOrEqual(15);
    }
  });

  it("le dépannage n'est que ce même moteur avec un matériel restreint", () => {
    const a = circuitFromSession({ session: salle, equipment: RESCUE_EQUIPMENT.aucun, level: "debutant", minutes: 45, cycleIndex: 1, locale: "fr" });
    const b = rescueSession({ session: salle, kind: "aucun", level: "debutant", minutes: 45, cycleIndex: 1, locale: "fr" });
    expect(a).toEqual(b);
  });
});
