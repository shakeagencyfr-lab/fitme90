import { describe, it, expect } from "vitest";
import { canSell, readinessMessage, type SellReadiness } from "./ai-readiness";

/**
 * Vendre ce qu'on ne peut pas livrer.
 *
 * En clé perso, un coach sans clé Anthropic encaissait puis échouait à générer
 * le programme. Ces tests portent sur la règle « peut-il vendre » et sur le
 * message : dire au coach qu'il manque quelque chose sans dire QUOI ni où le
 * régler ne l'aide pas.
 */

const etat = (o: Partial<SellReadiness> = {}): SellReadiness => ({
  aiReady: true,
  chargesEnabled: true,
  ...o,
});

describe("canSell", () => {
  it("autorise la vente quand l'IA et l'encaissement sont prêts", () => {
    expect(canSell(etat())).toBe(true);
  });

  it("refuse la vente sans IA disponible", () => {
    // Le cas qui motive tout : le client paierait pour un programme que
    // l'application ne saurait pas produire.
    expect(canSell(etat({ aiReady: false }))).toBe(false);
  });

  it("refuse la vente sans encaissement", () => {
    expect(canSell(etat({ chargesEnabled: false }))).toBe(false);
  });

  it("exige les deux, jamais l'un ou l'autre", () => {
    for (const aiReady of [true, false]) {
      for (const chargesEnabled of [true, false]) {
        expect(canSell({ aiReady, chargesEnabled })).toBe(aiReady && chargesEnabled);
      }
    }
  });
});

describe("readinessMessage", () => {
  it("ne dit rien quand tout est en place", () => {
    expect(readinessMessage(etat())).toBeNull();
  });

  it("nomme la clé manquante et l'écran où la régler", () => {
    const m = readinessMessage(etat({ aiReady: false }))!;
    expect(m).toMatch(/Anthropic/);
    expect(m).toMatch(/Intégrations/);
  });

  it("explique la conséquence, pas seulement le manque", () => {
    // « Clé absente » n'a jamais fait agir personne ; « ton client paierait
    // pour rien » si.
    expect(readinessMessage(etat({ aiReady: false }))!).toMatch(/après son paiement/);
  });

  it("distingue les trois situations", () => {
    const sansIa = readinessMessage(etat({ aiReady: false }))!;
    const sansStripe = readinessMessage(etat({ chargesEnabled: false }))!;
    const sansRien = readinessMessage(etat({ aiReady: false, chargesEnabled: false }))!;
    expect(new Set([sansIa, sansStripe, sansRien]).size).toBe(3);
    expect(sansRien).toMatch(/Anthropic/);
    expect(sansRien).toMatch(/Stripe/);
  });

  it("ne parle jamais de Stripe quand seul Stripe est prêt", () => {
    expect(readinessMessage(etat({ aiReady: false }))).not.toMatch(/Stripe/);
  });
});
