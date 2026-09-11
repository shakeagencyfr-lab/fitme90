import { describe, it, expect } from "vitest";
import { sanitizeCoachBlock, sanitizeCoachCircuit, templateFromCoachCircuit, type CoachCircuit } from "./coach-circuits";
import { bestCircuit, filterCircuits, maxFillableMinutes, renderCircuit, CIRCUIT_TEMPLATES } from "./circuit-library";
import { circuitBudgetSec, circuitSeconds } from "./circuit";

const bloc = (keys: string[]) => ({ title: "Bloc 1", keys, workBias: 0, restBias: 0 });

describe("sanitizeCoachBlock", () => {
  it("retire les mouvements qui ne sont pas dans la bibliothèque", () => {
    const b = sanitizeCoachBlock({ title: "Test", keys: ["pompes", "invente-moi-ca", "squat-poids-du-corps"] });
    expect(b?.keys).toEqual(["pompes", "squat-poids-du-corps"]);
  });

  it("refuse un bloc de moins de deux mouvements", () => {
    expect(sanitizeCoachBlock({ title: "Test", keys: ["pompes"] })).toBeNull();
    expect(sanitizeCoachBlock({ title: "Test", keys: [] })).toBeNull();
    expect(sanitizeCoachBlock(null)).toBeNull();
  });

  it("ramène les décalages dans des bornes tenables et dédoublonne", () => {
    const b = sanitizeCoachBlock({ title: "T", keys: ["pompes", "pompes", "squat-poids-du-corps"], workBias: 999, restBias: -999 });
    expect(b?.keys).toEqual(["pompes", "squat-poids-du-corps"]);
    expect(b?.workBias).toBe(20);
    expect(b?.restBias).toBe(-15);
  });

  it("donne un titre par défaut plutôt qu'un bloc sans nom", () => {
    expect(sanitizeCoachBlock({ keys: ["pompes", "crunch"] })?.title).toBe("Bloc");
  });
});

describe("sanitizeCoachCircuit", () => {
  const base = {
    title: "Le finisher du samedi",
    goal: "Court et intense",
    theme: "abdos",
    gear: "aucun",
    blocks: [bloc(["pompes", "crunch"]), bloc(["squat-poids-du-corps", "gainage-planche"])],
  };

  it("accepte un circuit complet et normalise ce qui manque", () => {
    const { circuit } = sanitizeCoachCircuit(base);
    expect(circuit?.title).toBe("Le finisher du samedi");
    expect(circuit?.theme).toBe("abdos");
    expect(circuit?.levels).toEqual(["debutant", "intermediaire", "avance"]);
    expect(circuit?.impact).toBe("faible");
    expect(circuit?.enabled).toBe(true);
  });

  it("refuse un circuit sans nom, ou sans deux blocs jouables", () => {
    expect(sanitizeCoachCircuit({ ...base, title: "  " }).error).toBeTruthy();
    expect(sanitizeCoachCircuit({ ...base, blocks: [bloc(["pompes", "crunch"])] }).error).toBeTruthy();
    expect(sanitizeCoachCircuit({ ...base, blocks: [bloc(["pompes"]), bloc(["crunch"])] }).error).toBeTruthy();
  });

  it("remplace un thème ou un matériel inconnu par une valeur sûre", () => {
    const { circuit } = sanitizeCoachCircuit({ ...base, theme: "pilates", gear: "piscine", impact: "enorme" });
    expect(circuit?.theme).toBe("corps-entier");
    expect(circuit?.gear).toBe("aucun");
    expect(circuit?.impact).toBe("faible");
  });

  it("ne laisse jamais une zone à la fois ménagée et sollicitée", () => {
    const { circuit } = sanitizeCoachCircuit({ ...base, avoid: ["genou"], safe_for: ["genou", "dos"] });
    expect(circuit?.avoid).toEqual(["genou"]);
    expect(circuit?.safe_for).toEqual(["dos"]);
  });

  it("ignore une sensation hors de l'échelle", () => {
    expect(sanitizeCoachCircuit({ ...base, sensation: 9 }).circuit?.sensation).toBeNull();
    expect(sanitizeCoachCircuit({ ...base, sensation: 3 }).circuit?.sensation).toBe(3);
  });
});

describe("templateFromCoachCircuit", () => {
  const c: CoachCircuit = {
    id: "abc-123",
    title: "Le finisher du samedi",
    goal: "Court et intense",
    theme: "abdos",
    gear: "aucun",
    levels: ["intermediaire", "avance"],
    impact: "faible",
    avoid: ["dos"],
    safe_for: [],
    sensation: 3,
    blocks: [
      { title: "Chauffe", keys: ["pompes", "crunch", "gainage-planche"], workBias: 5, restBias: 0, work: null, rest: null },
      { title: "Dur", keys: ["squat-poids-du-corps", "sit-up", "gainage-lateral"], workBias: 0, restBias: -5, work: null, rest: null },
    ],
    image_url: null,
    enabled: true,
  };

  it("rend un modèle du catalogue, marqué comme venant du coach", () => {
    const t = templateFromCoachCircuit(c);
    expect(t.id).toBe("coach:abc-123");
    expect(t.own).toBe(true);
    expect(t.title.fr).toBe("Le finisher du samedi");
    expect(t.blocks).toHaveLength(2);
    expect(t.blocks[0].workBias).toBe(5);
    expect(t.blocks[1].restBias).toBe(-5);
  });

  it("se rend à toutes les durées, sans jamais déborder", () => {
    const t = templateFromCoachCircuit(c);
    for (const minutes of [30, 45, 60, 90]) {
      const r = renderCircuit(t, { minutes, level: "avance", cycleIndex: 1, locale: "fr" });
      expect(circuitSeconds(r.blocks), `${minutes}`).toBeLessThanOrEqual(circuitBudgetSec(minutes));
      expect(r.blocks[0].sensation).toBe(3);
      // Les mouvements viennent de la bibliothèque : ils ont un vrai nom, donc
      // une fiche et une photo, et non la clé brute.
      for (const b of r.blocks) for (const e of b.exercises) expect(e.name).not.toBe(e.key);
    }
  });

  it("annonce la durée qu'il construit, et pas celle qu'on lui demande", () => {
    const t = templateFromCoachCircuit(c);
    // Deux blocs de trois mouvements ne remplissent pas 90 minutes : le rendu
    // le dit au lieu de faire semblant, et le configurateur prévient le coach
    // avec le même plafond.
    const plafond = maxFillableMinutes(c.blocks.map((b) => ({ exercises: b.keys.length, workBias: b.workBias })));
    expect(plafond).toBeLessThan(90);
    const r = renderCircuit(t, { minutes: 90, level: "avance", cycleIndex: 1, locale: "fr" });
    expect(r.minutes).toBeLessThan(90);
    expect(r.minutes).toBeLessThanOrEqual(plafond);
  });

  it("passe devant les circuits de la plateforme, à critères égaux", () => {
    const pool = [templateFromCoachCircuit(c), ...CIRCUIT_TEMPLATES];
    const choisi = bestCircuit({ theme: "abdos", gear: "aucun", level: "avance" }, pool);
    expect(choisi?.id).toBe("coach:abc-123");
  });

  it("reste soumis aux contre-indications : le coach ne passe pas devant la santé", () => {
    const pool = [templateFromCoachCircuit(c), ...CIRCUIT_TEMPLATES];
    const list = filterCircuits({ theme: "abdos", pathologies: ["dos"] }, pool);
    expect(list.map((t) => t.id)).not.toContain("coach:abc-123");
    expect(list.length).toBeGreaterThan(0);
  });
});

describe("effort et repos réglés à la main", () => {
  const bloc = (extra: Record<string, unknown>) =>
    sanitizeCoachBlock({ title: "Bloc", keys: ["pompes", "crunch"], ...extra });

  it("garde les secondes écrites par le coach", () => {
    const b = bloc({ work: 40, rest: 20 });
    expect(b?.work).toBe(40);
    expect(b?.rest).toBe(20);
  });

  it("distingue « vide » de zéro : vide veut dire suivre le niveau du client", () => {
    expect(bloc({ work: "", rest: null })?.work).toBeNull();
    expect(bloc({ work: "", rest: null })?.rest).toBeNull();
    // Zéro seconde de repos est un choix légitime, il doit survivre.
    expect(bloc({ rest: 0 })?.rest).toBe(0);
  });

  it("ramène une saisie aberrante dans les bornes", () => {
    expect(bloc({ work: 999 })?.work).toBe(120);
    expect(bloc({ work: 1 })?.work).toBe(15);
    expect(bloc({ work: "pas un nombre" })?.work).toBeNull();
  });

  it("transmet l'effort figé au modèle servi au client", () => {
    const t = templateFromCoachCircuit({
      id: "x",
      title: "T",
      goal: "",
      theme: "abdos",
      gear: "aucun",
      levels: ["debutant"],
      impact: "faible",
      avoid: [],
      safe_for: [],
      sensation: null,
      blocks: [
        { title: "A", keys: ["pompes", "crunch"], workBias: 0, restBias: 0, work: 45, rest: 10 },
        { title: "B", keys: ["pompes", "crunch"], workBias: 0, restBias: 0, work: null, rest: null },
      ],
      image_url: null,
      enabled: true,
    });
    expect(t.blocks[0].work).toBe(45);
    expect(t.blocks[0].rest).toBe(10);
    expect(t.blocks[1].work).toBeUndefined();
    expect(t.blocks[1].rest).toBeUndefined();
  });
});
