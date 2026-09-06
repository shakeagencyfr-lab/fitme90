import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { EQUIPMENT_FAMILIES } from "./equipment";
import {
  EQUIPMENT_CATALOG,
  MUSCLE_GROUPS,
  equipmentPhoto,
  matchEquipment,
  searchEquipment,
} from "./equipment-catalog";

describe("catalogue de matériel", () => {
  it("a des clés uniques", () => {
    const keys = EQUIPMENT_CATALOG.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ne référence que des familles comprises par le générateur", () => {
    const inconnues = EQUIPMENT_CATALOG.filter(
      (e) => !(EQUIPMENT_FAMILIES as readonly string[]).includes(e.famille),
    ).map((e) => e.key);
    expect(inconnues).toEqual([]);
  });

  it("ne référence que des groupes musculaires connus", () => {
    const mauvais = EQUIPMENT_CATALOG.flatMap((e) =>
      e.groupes.filter((g) => !MUSCLE_GROUPS.includes(g)).map((g) => `${e.key}: ${g}`),
    );
    expect(mauvais).toEqual([]);
  });

  it("pointe vers des photos qui existent vraiment", () => {
    // Une vignette cassée dans le sélecteur, et le client ne reconnaît plus sa
    // salle. Le test lit le disque plutôt que de faire confiance à la chaîne.
    const manquantes = EQUIPMENT_CATALOG.filter((e) => e.photo)
      .filter((e) => !existsSync(`public/exercises/${e.photo}/0.jpg`))
      .map((e) => `${e.key} -> ${e.photo}`);
    expect(manquantes).toEqual([]);
  });

  it("couvre chaque groupe musculaire par au moins trois machines", () => {
    const maigres = MUSCLE_GROUPS.filter(
      (g) => EQUIPMENT_CATALOG.filter((e) => e.groupes.includes(g)).length < 3,
    );
    expect(maigres).toEqual([]);
  });

  it("n'utilise pas de tiret cadratin", () => {
    const fautes = EQUIPMENT_CATALOG.filter((e) =>
      [e.nom, e.name].some((t) => t.includes("—") || t.includes("–")),
    ).map((e) => e.key);
    expect(fautes).toEqual([]);
  });
});

describe("matchEquipment", () => {
  it("rattache les façons dont les gens écrivent vraiment", () => {
    for (const [saisie, attendu] of [
      ["Leg press", "presse-cuisses"],
      ["presse à cuisses", "presse-cuisses"],
      ["PRESSE", "presse-cuisses"],
      ["presse à cuisses inclinée 45°", "presse-cuisses"],
      ["pec-deck", "pec-deck"],
      ["Butterfly", "pec-deck"],
      ["tapis roulant", "tapis-course"],
      ["assault bike", "velo-assault"],
      ["Smith machine", "smith-machine"],
      ["barre de traction", "barre-traction"],
      ["t-bar row", "rowing-t-bar"],
    ] as const) {
      expect(matchEquipment(saisie)?.key, saisie).toBe(attendu);
    }
  });

  it("ne rattache pas un mot trop court à une machine au hasard", () => {
    expect(matchEquipment("")).toBeNull();
    expect(matchEquipment("zzz")).toBeNull();
    expect(matchEquipment("machine à bidules")).toBeNull();
  });

  it("distingue les machines proches", () => {
    expect(matchEquipment("leg curl assis")?.key).toBe("leg-curl-assis");
    expect(matchEquipment("leg extension")?.key).toBe("leg-extension");
    expect(matchEquipment("mollets assis")?.key).toBe("mollets-assis");
    expect(matchEquipment("mollets debout")?.key).toBe("mollets-debout");
  });
});

describe("searchEquipment", () => {
  it("trouve par nom français et anglais", () => {
    expect(searchEquipment("presse").map((e) => e.key)).toContain("presse-cuisses");
    expect(searchEquipment("leg press").map((e) => e.key)).toContain("presse-cuisses");
  });

  it("filtre par groupe musculaire", () => {
    const jambes = searchEquipment("", "jambes");
    expect(jambes.length).toBeGreaterThan(5);
    expect(jambes.every((e) => e.groupes.includes("jambes"))).toBe(true);
  });

  it("croise texte et groupe", () => {
    expect(searchEquipment("machine", "fessiers").map((e) => e.key)).toContain("hip-thrust-machine");
    // « machine » au cardio ne doit pas ramener tout le rayon cardio.
    const cardio = searchEquipment("machine", "cardio").map((e) => e.key);
    expect(cardio).toContain("stairmaster");
    expect(cardio).not.toContain("tapis-course");
  });

  it("rend tout le catalogue sans critère", () => {
    expect(searchEquipment("")).toHaveLength(EQUIPMENT_CATALOG.length);
  });
});

describe("equipmentPhoto", () => {
  it("rend un chemin servable, ou null quand aucune photo ne convient", () => {
    const presse = EQUIPMENT_CATALOG.find((e) => e.key === "presse-cuisses")!;
    expect(equipmentPhoto(presse)).toBe("/exercises/presse-jambes/0.jpg");
    const assault = EQUIPMENT_CATALOG.find((e) => e.key === "velo-assault")!;
    expect(equipmentPhoto(assault)).toBeNull();
  });
});
