import { describe, it, expect } from "vitest";
import { coveredDays, blockPosition, nextBlockDue, blockProgressNote, BLOCK_LEAD_DAYS } from "./block-logic";

// Le produit 12 mois n'est jamais généré d'un coup : 4 blocs de 3 cycles,
// chacun construit une semaine avant la fin du précédent, à partir du vécu.

const plan = (cycles: number) => ({ cycles: Array.from({ length: cycles }, () => ({})) });

describe("coveredDays / blockPosition", () => {
  it("compte 30 jours par cycle généré", () => {
    expect(coveredDays(plan(3))).toBe(90);
    expect(coveredDays(plan(6))).toBe(180);
    expect(coveredDays(null)).toBe(0);
  });

  it("situe le client dans son bloc et son cycle", () => {
    expect(blockPosition(1, 360)).toMatchObject({ blockIndex: 0, cycleIndex: 0, totalBlocks: 4 });
    expect(blockPosition(90, 360)).toMatchObject({ blockIndex: 0, cycleIndex: 2 });
    expect(blockPosition(91, 360)).toMatchObject({ blockIndex: 1, cycleIndex: 3, label: "Bloc 2 · Construction" });
    expect(blockPosition(271, 360)).toMatchObject({ blockIndex: 3, label: "Bloc 4 · Réalisation" });
  });

  it("un produit 3 mois n'affiche pas de numéro de bloc", () => {
    expect(blockPosition(45, 90)).toMatchObject({ totalBlocks: 1, label: "Transformation" });
  });
});

describe("nextBlockDue", () => {
  const twelveMonths = { programDays: 360, subscribed: false };

  it("n'est pas dû tant que la fin des cycles générés est loin", () => {
    expect(nextBlockDue({ day: 30, covered: 90, ...twelveMonths })).toBe(false);
    expect(nextBlockDue({ day: 83, covered: 90, ...twelveMonths })).toBe(false);
  });

  it("devient dû une semaine avant la fin des cycles générés", () => {
    expect(nextBlockDue({ day: 90 - BLOCK_LEAD_DAYS + 1, covered: 90, ...twelveMonths })).toBe(true);
    expect(nextBlockDue({ day: 90, covered: 90, ...twelveMonths })).toBe(true);
    expect(nextBlockDue({ day: 95, covered: 90, ...twelveMonths })).toBe(true);
  });

  it("n'est jamais dû pour un 3 mois payé une fois : rien à couvrir après le bloc", () => {
    expect(nextBlockDue({ day: 89, covered: 90, programDays: 90, subscribed: false })).toBe(false);
    expect(nextBlockDue({ day: 120, covered: 90, programDays: 90, subscribed: false })).toBe(false);
  });

  it("un abonné en règle continue au-delà de la durée du produit", () => {
    expect(nextBlockDue({ day: 89, covered: 90, programDays: 90, subscribed: true })).toBe(true);
    expect(nextBlockDue({ day: 358, covered: 360, programDays: 360, subscribed: true })).toBe(true);
  });

  it("s'arrête quand tous les blocs du produit sont générés", () => {
    expect(nextBlockDue({ day: 358, covered: 360, ...twelveMonths })).toBe(false);
  });

  it("ne fait rien avant le départ ni sans plan", () => {
    expect(nextBlockDue({ day: 0, covered: 90, ...twelveMonths })).toBe(false);
    expect(nextBlockDue({ day: 100, covered: 0, ...twelveMonths })).toBe(false);
  });

  it("la demande explicite du client (avance nulle) ne contourne pas « rien à couvrir »", () => {
    expect(nextBlockDue({ day: 100, covered: 90, programDays: 90, subscribed: false, lead: 0 })).toBe(false);
    expect(nextBlockDue({ day: 91, covered: 90, ...twelveMonths, lead: 0 })).toBe(true);
    expect(nextBlockDue({ day: 90, covered: 90, ...twelveMonths, lead: 0 })).toBe(false);
  });
});

describe("blockProgressNote", () => {
  it("chiffre l'assiduité sur 12 semaines et oriente le bloc suivant", () => {
    const n = blockProgressNote({ blockIndex: 0, doneInBlock: 33, trainDaysPerWeek: 3, firstKg: 82, lastKg: 78.5 });
    expect(n).toContain("Bloc 1 terminé");
    expect(n).toContain("33 séance(s)");
    expect(n).toContain("~36 prévues");
    expect(n).toContain("très bonne");
    expect(n).toContain("82 à 78.5 kg (-3.5 kg)");
    expect(n).toMatch(/augmente le volume/);
  });

  it("simplifie quand l'assiduité est faible", () => {
    const n = blockProgressNote({ blockIndex: 1, doneInBlock: 8, trainDaysPerWeek: 4, firstKg: null, lastKg: 70 });
    expect(n).toContain("faible");
    expect(n).toMatch(/simplifie/);
    expect(n).toContain("Poids actuel 70 kg");
  });

  it("plafonne l'assiduité à 100 % si le client a fait plus que prévu", () => {
    expect(blockProgressNote({ blockIndex: 0, doneInBlock: 60, trainDaysPerWeek: 2, firstKg: null, lastKg: null })).toContain("(100 %)");
  });

  it("n'utilise jamais de tiret cadratin", () => {
    expect(blockProgressNote({ blockIndex: 2, doneInBlock: 20, trainDaysPerWeek: 3, firstKg: 70, lastKg: 72 })).not.toMatch(/[—–]/);
  });
});
