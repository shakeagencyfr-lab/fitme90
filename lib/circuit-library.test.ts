import { describe, it, expect } from "vitest";
import {
  CIRCUIT_TEMPLATES,
  CIRCUIT_THEMES,
  CIRCUIT_GEARS,
  GEAR_EQUIPMENT,
  PATHOLOGIES,
  bestCircuit,
  circuitSummaries,
  circuitTemplate,
  detectPathologies,
  filterCircuits,
  gearCovers,
  renderCircuit,
  type CircuitTemplate,
} from "./circuit-library";
import { circuitBudgetSec, circuitSeconds, isCircuitSession, WARMUP_MINUTES } from "./circuit";
import { libraryEntry } from "./exercise-library";
import { equipmentSupports, traitsOf } from "./exercise-alternatives";

/** Les durées de séance réellement proposées dans l'application. */
const DUREES = [30, 45, 60, 90];

const clesDe = (t: CircuitTemplate): string[] =>
  [...t.blocks, ...(t.finisher ? [t.finisher] : [])].flatMap((b) => b.exercises.map((e) => (typeof e === "string" ? e : e.key)));

describe("catalogue", () => {
  it("a un identifiant unique par circuit", () => {
    const ids = CIRCUIT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(circuitTemplate("full-aucun")?.theme).toBe("corps-entier");
    expect(circuitTemplate("inconnu")).toBeNull();
  });

  it("couvre tous les thèmes, et tous les paliers de matériel", () => {
    for (const theme of CIRCUIT_THEMES) {
      expect(CIRCUIT_TEMPLATES.some((t) => t.theme === theme)).toBe(true);
    }
    for (const gear of CIRCUIT_GEARS) {
      expect(CIRCUIT_TEMPLATES.some((t) => t.gear === gear)).toBe(true);
    }
  });

  it("propose un circuit écrit pour chaque zone à ménager", () => {
    for (const p of PATHOLOGIES) {
      expect(CIRCUIT_TEMPLATES.some((t) => t.safeFor?.includes(p))).toBe(true);
    }
  });

  it("n'utilise que des mouvements de la bibliothèque", () => {
    const manquants: string[] = [];
    for (const t of CIRCUIT_TEMPLATES) {
      for (const k of clesDe(t)) {
        const entry = libraryEntry(k, k);
        if (!entry || entry.key !== k) manquants.push(`${t.id} : ${k}`);
      }
    }
    expect(manquants).toEqual([]);
  });

  it("ne demande jamais un matériel que le palier n'a pas", () => {
    const fautes: string[] = [];
    for (const t of CIRCUIT_TEMPLATES) {
      const dispo = GEAR_EQUIPMENT[t.gear];
      for (const k of clesDe(t)) {
        const entry = libraryEntry(k, k);
        const traits = entry ? (entry.traits ?? traitsOf(entry)) : null;
        if (!traits) continue;
        if (!equipmentSupports(traits, dispo)) fautes.push(`${t.id} (${t.gear}) : ${k} [${traits.besoin.join(", ")}]`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("a des blocs jouables : deux blocs, trois mouvements, pas de doublon dans un bloc", () => {
    for (const t of CIRCUIT_TEMPLATES) {
      expect(t.blocks.length, t.id).toBeGreaterThanOrEqual(2);
      for (const b of [...t.blocks, ...(t.finisher ? [t.finisher] : [])]) {
        expect(b.exercises.length, `${t.id} / ${b.title.fr}`).toBeGreaterThanOrEqual(2);
        const keys = b.exercises.map((e) => (typeof e === "string" ? e : e.key));
        expect(new Set(keys).size, `${t.id} / ${b.title.fr}`).toBe(keys.length);
      }
    }
  });

  it("écrit chaque texte en français et en anglais", () => {
    for (const t of CIRCUIT_TEMPLATES) {
      expect(t.title.en, t.id).toBeTruthy();
      expect(t.goal.en, t.id).toBeTruthy();
      for (const b of [...t.blocks, ...(t.finisher ? [t.finisher] : [])]) {
        expect(b.title.en, `${t.id} / ${b.title.fr}`).toBeTruthy();
        for (const e of b.exercises) if (typeof e !== "string") expect(e.note.en, t.id).toBeTruthy();
      }
    }
  });

  it("ne contient aucun tiret cadratin", () => {
    for (const t of CIRCUIT_TEMPLATES) {
      expect(`${t.title.fr} ${t.title.en} ${t.goal.fr} ${t.goal.en}`).not.toMatch(/—/);
    }
  });

  it("marque un circuit à sauts comme contre-indiqué pour les articulations portantes", () => {
    for (const t of CIRCUIT_TEMPLATES.filter((x) => x.impact === "fort")) {
      expect(t.avoid, t.id).toContain("genou");
      expect(t.avoid, t.id).toContain("cheville");
    }
  });

  it("ne se contredit jamais : un circuit écrit pour une zone ne l'évite pas", () => {
    for (const t of CIRCUIT_TEMPLATES) {
      for (const p of t.safeFor ?? []) expect(t.avoid, t.id).not.toContain(p);
    }
  });
});

describe("paliers de matériel", () => {
  it("la salle couvre tout le reste, le poids du corps ne couvre que lui", () => {
    for (const g of CIRCUIT_GEARS) expect(gearCovers("salle", g)).toBe(true);
    expect(gearCovers("aucun", "halteres")).toBe(false);
    expect(gearCovers("hotel", "halteres")).toBe(true);
    expect(gearCovers("hotel", "kettlebell")).toBe(false);
    expect(gearCovers("elastiques", "aucun")).toBe(true);
  });
});

describe("detectPathologies", () => {
  it("lit les zones sensibles dans un texte libre, dans les deux langues", () => {
    expect(detectPathologies("j'ai mal au genou droit depuis un an")).toEqual(["genou"]);
    expect(detectPathologies("hernie discale L5")).toEqual(["dos"]);
    expect(detectPathologies("tendinite de la coiffe des rotateurs")).toEqual(["epaule"]);
    expect(detectPathologies("I am pregnant")).toEqual(["grossesse"]);
    expect(detectPathologies("hypertension traitée", "entorse de cheville")).toEqual(["cheville", "hypertension"]);
  });
  it("ne devine rien : sans mot, aucune zone", () => {
    expect(detectPathologies("", null, undefined)).toEqual([]);
    expect(detectPathologies("je veux perdre du gras")).toEqual([]);
  });
});

describe("filterCircuits", () => {
  it("écarte tout circuit qui sollicite une zone déclarée sensible", () => {
    for (const p of PATHOLOGIES) {
      const list = filterCircuits({ pathologies: [p] });
      expect(list.length, p).toBeGreaterThan(0);
      for (const t of list) expect(t.avoid, `${p} / ${t.id}`).not.toContain(p);
    }
  });

  it("met en tête le circuit écrit pour la contrainte", () => {
    expect(filterCircuits({ pathologies: ["genou"] })[0].safeFor).toContain("genou");
    expect(filterCircuits({ pathologies: ["grossesse"] })[0].safeFor).toContain("grossesse");
  });

  it("ne propose jamais un mouvement que le matériel ne permet pas", () => {
    for (const t of filterCircuits({ gear: "aucun" })) expect(t.gear).toBe("aucun");
    for (const t of filterCircuits({ gear: "halteres" })) expect(["aucun", "halteres"]).toContain(t.gear);
  });

  it("retire les sauts quand on les refuse", () => {
    expect(filterCircuits({ theme: "cardio", noImpact: true }).every((t) => t.impact !== "fort")).toBe(true);
  });
});

describe("bestCircuit", () => {
  it("rend un circuit pour chaque thème, sans matériel", () => {
    for (const theme of CIRCUIT_THEMES) {
      const t = bestCircuit({ theme, gear: "aucun" });
      expect(t, theme).not.toBeNull();
    }
  });

  it("abandonne le thème plutôt que de servir un circuit contre-indiqué", () => {
    const t = bestCircuit({ theme: "cardio", gear: "aucun", pathologies: ["genou", "cheville", "poignet"] });
    expect(t).not.toBeNull();
    expect(t!.avoid).not.toContain("genou");
    expect(t!.avoid).not.toContain("poignet");
  });

  it("trouve toujours quelque chose, même sans rien", () => {
    expect(bestCircuit()).not.toBeNull();
    expect(bestCircuit({ gear: "aucun", level: "debutant" })).not.toBeNull();
  });
});

describe("renderCircuit", () => {
  it("remplit la durée demandée, quelle qu'elle soit", () => {
    for (const t of CIRCUIT_TEMPLATES) {
      for (const minutes of DUREES) {
        const c = renderCircuit(t, { minutes, level: "intermediaire", cycleIndex: 1, locale: "fr" });
        const budget = circuitBudgetSec(minutes);
        const total = circuitSeconds(c.blocks);
        expect(total, `${t.id} / ${minutes}`).toBeLessThanOrEqual(budget);
        expect(total, `${t.id} / ${minutes}`).toBeGreaterThan(budget * 0.85);
        expect(c.blocks.length, `${t.id} / ${minutes}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("annonce la durée qu'il a vraiment construite", () => {
    const t = circuitTemplate("full-aucun")!;
    const c = renderCircuit(t, { minutes: 45, level: "intermediaire", cycleIndex: 0, locale: "fr" });
    expect(c.minutes).toBe(Math.round(circuitSeconds(c.blocks) / 60) + WARMUP_MINUTES);
    expect(Math.abs(c.minutes - 45)).toBeLessThanOrEqual(3);
  });

  it("sert plus de blocs quand la séance est plus longue", () => {
    const t = circuitTemplate("full-aucun")!;
    const court = renderCircuit(t, { minutes: 30, level: "intermediaire", cycleIndex: 0, locale: "fr" });
    const long = renderCircuit(t, { minutes: 90, level: "intermediaire", cycleIndex: 0, locale: "fr" });
    expect(long.blocks.length).toBeGreaterThan(court.blocks.length);
  });

  it("produit un circuit au sens de lib/circuit, avec fiches et consignes", () => {
    const t = circuitTemplate("abs-killer")!;
    const c = renderCircuit(t, { minutes: 45, level: "avance", cycleIndex: 2, locale: "fr" });
    expect(isCircuitSession({ format: "circuit", blocks: c.blocks })).toBe(true);
    expect(c.blocks.at(-1)!.restAfter).toBe(0);
    for (const b of c.blocks) {
      for (const e of b.exercises) {
        expect(e.key, e.name).toBeTruthy();
        expect(libraryEntry(e.name, e.key)?.key).toBe(e.key);
        expect(e.note.length, e.name).toBeGreaterThan(0);
      }
    }
  });

  it("suit le cycle pour l'effort, sauf quand le circuit impose sa sensation", () => {
    const dur = circuitTemplate("full-aucun")!;
    expect(renderCircuit(dur, { minutes: 45, level: "intermediaire", cycleIndex: 0, locale: "fr" }).blocks[0].sensation).toBe(2);
    expect(renderCircuit(dur, { minutes: 45, level: "intermediaire", cycleIndex: 2, locale: "fr" }).blocks[0].sensation).toBe(3);
    const doux = circuitTemplate("mobilite-aucun")!;
    expect(renderCircuit(doux, { minutes: 45, level: "avance", cycleIndex: 2, locale: "fr" }).blocks[0].sensation).toBe(1);
  });

  it("écrit ses titres et son échauffement dans la langue du client", () => {
    const t = circuitTemplate("full-aucun")!;
    const en = renderCircuit(t, { minutes: 45, level: "debutant", cycleIndex: 0, locale: "en" });
    expect(en.title).toBe("Full body, nothing needed");
    expect(en.blocks[0].title).toMatch(/^Block 1 · Foundations$/);
    expect(en.warmup[0].name).toBe("Warm up");
  });
});

describe("circuitSummaries", () => {
  it("résume chaque circuit en une ligne lisible", () => {
    const rows = circuitSummaries("fr");
    expect(rows).toHaveLength(CIRCUIT_TEMPLATES.length);
    const genou = rows.find((r) => r.id === "menage-genou")!;
    expect(genou.safeFor).toEqual(["Genou sensible"]);
    expect(genou.gear).toBe("Sans matériel");
  });
});
