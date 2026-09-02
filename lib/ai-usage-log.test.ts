import { describe, it, expect } from "vitest";
import { actionLabel, modelLabel, costDriver, driverLabel } from "./ai-usage-log";
import type { CostParts } from "./ai-cost";

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

describe("costDriver", () => {
  const parts = (o: Partial<CostParts>): CostParts => {
    const p = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, ...o };
    return { ...p, total: p.input + p.cacheRead + p.cacheWrite + p.output };
  };

  it("désigne la sortie quand la réponse est longue", () => {
    // 02/09 20:38:40 : 14343 entrée / 9412 sortie, 6826 lus + 6826 écrits.
    // La sortie seule pèse 0,047 $ sur 0,071 $.
    expect(costDriver(parts({ input: 0.014343, cacheRead: 0.00068, cacheWrite: 0.00853, output: 0.04706 }))).toBe("sortie");
  });

  it("désigne l'écriture de cache sur un premier message", () => {
    // 19:49:44 : 880 entrée / 137 sortie, 6384 ÉCRITS -> 0,0088 EUR.
    expect(costDriver(parts({ input: 0.00088, cacheWrite: 0.00798, output: 0.000685 }))).toBe("cache-ecrit");
  });

  it("ne confond pas ce cas avec la même ligne en lecture", () => {
    // 19:50:57 : 1106 entrée / 85 sortie, 6384 LUS -> 0,0020 EUR.
    // Mêmes tokens de cache affichés, 4,4x moins cher : le poste dominant change.
    expect(costDriver(parts({ input: 0.001106, cacheRead: 0.000638, output: 0.000425 }))).toBe("entree");
  });

  it("ne dépend pas de l'ordre des postes à égalité de valeur", () => {
    expect(costDriver(parts({ output: 1, cacheWrite: 1 }))).toBe("sortie");
  });
});

describe("driverLabel", () => {
  it("chiffre la part du poste dominant", () => {
    const p = { input: 0, cacheRead: 0, cacheWrite: 0, output: 3, total: 4 };
    expect(driverLabel("sortie", p)).toContain("75 %");
  });

  it("ne divise pas par zéro sur un appel sans coût", () => {
    const p = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, total: 0 };
    expect(driverLabel("entree", p)).toContain("0 %");
  });
});
