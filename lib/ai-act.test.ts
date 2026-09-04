import { describe, it, expect } from "vitest";
import {
  contentMark,
  contentMarkString,
  isAiMarked,
  chatDisclosure,
  contentDisclosure,
  AI_LITERACY_POINTS,
  AI_DISCLOSURE_VERSION,
} from "./ai-act";

/**
 * Article 50 de l'AI Act. Deux obligations se testent vraiment : la marque
 * doit être relisible par une machine, et l'information doit dire qu'il s'agit
 * d'une IA sans supposer que le lecteur connaisse notre nom.
 */

const origine = {
  vendor: "Anthropic",
  purpose: "Programme d'entraînement",
  generatedAt: "2026-09-04T10:00:00.000Z",
};

describe("marque lisible par machine", () => {
  it("porte le discriminant, le régime invoqué et la version", () => {
    const m = contentMark(origine);
    expect(m["ai-generated"]).toBe(true);
    expect(m.standard).toBe("EU-AI-Act-Art-50");
    expect(m.version).toBe(AI_DISCLOSURE_VERSION);
  });

  it("se relit depuis sa forme sérialisée", () => {
    // Marquer sans savoir relire ne servirait à rien : c'est la détection qui
    // est l'objet de l'obligation.
    expect(isAiMarked(contentMarkString(origine))).toBe(true);
  });

  it("se relit aussi depuis l'objet", () => {
    expect(isAiMarked(contentMark(origine))).toBe(true);
  });

  it("ne reconnaît pas un contenu non marqué", () => {
    for (const x of [null, undefined, "", "texte libre", "{}", '{"a":1}', 42, { autre: true }]) {
      expect(isAiMarked(x)).toBe(false);
    }
  });

  it("ne jette jamais sur une valeur illisible", () => {
    expect(() => isAiMarked("{ pas du json")).not.toThrow();
    expect(isAiMarked("{ pas du json")).toBe(false);
  });

  it("conserve la date de génération telle quelle", () => {
    expect(contentMark(origine).generatedAt).toBe(origine.generatedAt);
  });
});

describe("information de première interaction", () => {
  it("dit explicitement que ce n'est pas une personne", () => {
    const t = chatDisclosure("Studio Nord", "Sébastien");
    expect(t).toContain("Sébastien");
    expect(t).toMatch(/intelligence artificielle/i);
    expect(t).toMatch(/pas avec une personne/i);
  });

  it("parle de la marque que le client connaît, pas de la nôtre", () => {
    // En marque blanche, le client n'a jamais entendu parler de My Fitness App.
    const t = chatDisclosure("Studio Nord", "Sébastien");
    expect(t).toContain("Studio Nord");
    expect(t).not.toMatch(/My Fitness App/);
  });

  it("reste compréhensible sans marque renseignée", () => {
    const t = chatDisclosure("", "Sébastien");
    expect(t).toMatch(/intelligence artificielle/i);
    expect(t).not.toContain("undefined");
    expect(t).not.toMatch(/\s{2,}/);
  });

  it("rappelle que ce n'est pas un avis médical", () => {
    expect(chatDisclosure("Studio Nord", "Sébastien")).toMatch(/médical/i);
    expect(contentDisclosure("Programme")).toMatch(/médical|santé/i);
  });
});

describe("littératie IA (article 4)", () => {
  it("couvre les limites, pas seulement les capacités", () => {
    const tout = AI_LITERACY_POINTS.map((p) => `${p.titre} ${p.texte}`).join(" ").toLowerCase();
    expect(tout).toMatch(/tromper|fausse/);
    expect(tout).toMatch(/responsable/);
    expect(tout).toMatch(/dispositif médical/);
  });

  it("dit qu'aucun humain ne relit avant affichage", () => {
    const tout = AI_LITERACY_POINTS.map((p) => p.texte).join(" ");
    expect(tout).toMatch(/relu par un humain/i);
  });

  it("n'a ni titre ni texte vide", () => {
    for (const p of AI_LITERACY_POINTS) {
      expect(p.titre.trim().length).toBeGreaterThan(0);
      expect(p.texte.trim().length).toBeGreaterThan(20);
    }
  });
});
