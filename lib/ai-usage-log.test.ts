import { describe, it, expect } from "vitest";
import { COLS, costDriver, driverLabel } from "./ai-usage-log";
import { costParts } from "./ai-cost";

// Les colonnes que `costParts` facture. Une seule oubliée dans un SELECT et la
// ligne coûte moins cher à l'écran qu'en vrai, sans que rien ne le signale.
const FACTURÉES = [
  "input_tokens",
  "output_tokens",
  "cache_read_tokens",
  "cache_write_tokens",
  "cache_write_1h_tokens",
];

describe("colonnes lues par le journal de consommation", () => {
  it("demande toutes les colonnes qui entrent dans le coût", () => {
    const demandées = COLS.split(",").map((c) => c.trim());
    expect(FACTURÉES.filter((c) => !demandées.includes(c))).toEqual([]);
  });

  it("lit aussi le modèle, sans quoi le tarif serait celui d'Opus par défaut", () => {
    expect(COLS.split(",").map((c) => c.trim())).toContain("model");
  });
});

describe("poste dominant d'un appel", () => {
  // Cas réel mesuré : un message au Coach IA dont 87 % du coût part en
  // écriture de cache longue durée. Tant que la colonne manquait au SELECT,
  // cette ligne s'affichait comme dominée par la sortie.
  const messageCoach = {
    user_id: "u1",
    route: "coach",
    model: "claude-haiku-4-5",
    input_tokens: 846,
    output_tokens: 286,
    cache_read_tokens: 7148,
    cache_write_tokens: 0,
    cache_write_1h_tokens: 7148,
  };

  it("désigne l'écriture de cache quand c'est elle qui paie", () => {
    const parts = costParts(messageCoach);
    expect(costDriver(parts)).toBe("cache-ecrit");
    expect(driverLabel("cache-ecrit", parts)).toContain("%");
  });

  it("chiffre l'écriture longue durée à 200 % d'une entrée", () => {
    const parts = costParts(messageCoach);
    // 7148 jetons à 1 $/M, doublés : 0,0142960 $.
    expect(parts.cacheWrite).toBeCloseTo(0.014296, 6);
    expect(parts.total).toBeCloseTo(0.0172868, 6);
  });

  it("compterait dix fois moins sans la colonne longue durée", () => {
    // C'est exactement ce que le journal affichait : 0,0019 $ au lieu de 0,0173.
    const sansColonne = costParts({ ...messageCoach, cache_write_1h_tokens: undefined });
    expect(sansColonne.total).toBeLessThan(parseFloat((costParts(messageCoach).total / 5).toFixed(6)));
  });
});
