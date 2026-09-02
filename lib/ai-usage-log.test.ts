import { describe, it, expect } from "vitest";
import { actionLabel, modelLabel } from "./ai-usage-log";

describe("actionLabel", () => {
  it("nomme chaque action métier", () => {
    expect(actionLabel("message", "coach")).toBe("Message coach IA");
    expect(actionLabel("fiche-exercice", "coach")).toBe("Fiche exercice");
    expect(actionLabel("memoire", "coach")).toBe("Résumé de mémoire (nuit)");
  });

  it("distingue la fiche et le résumé du message, tous trois sur le route coach", () => {
    // Le route reste le seau de quota : sans `action`, ces trois lignes se
    // confondaient dans l'historique et gonflaient le poste « message ».
    const labels = new Set(["message", "fiche-exercice", "memoire"].map((a) => actionLabel(a, "coach")));
    expect(labels.size).toBe(3);
  });

  it("retombe sur le route pour les lignes antérieures à la colonne action", () => {
    expect(actionLabel(null, "generate")).toBe("Génération de programme");
    expect(actionLabel(null, "exercise")).toBe("Alternative d'exercice");
    expect(actionLabel(null, "coach")).toBe("Message coach IA");
  });

  it("n'invente rien pour un route inconnu", () => {
    expect(actionLabel(null, "route-futur")).toBe("route-futur");
  });
});

describe("modelLabel", () => {
  it("abrège les identifiants Anthropic", () => {
    expect(modelLabel("claude-haiku-4-5")).toBe("Haiku 4.5");
    expect(modelLabel("claude-opus-5")).toBe("Opus 5");
    expect(modelLabel("claude-sonnet-4-6")).toBe("Sonnet 4.6");
  });

  it("laisse tel quel ce qu'il ne reconnaît pas", () => {
    expect(modelLabel("modele-maison")).toBe("modele-maison");
    expect(modelLabel("")).toBe("");
  });
});
