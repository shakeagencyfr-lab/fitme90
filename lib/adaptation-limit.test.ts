import { describe, it, expect } from "vitest";
import { LIMIT_ADAPT_PER_WEEK, LIMIT_COACH_PER_DAY, usdToEur } from "./config";

// L'adaptation du programme est le seul geste du chat qui ne se facture pas ce
// qu'il coûte : un client blessé le déclenche pour 1 crédit, et il rappelle le
// modèle de génération. C'est voulu (personne ne doit hésiter à signaler une
// douleur), mais ce qui n'est pas facturé doit être borné, sinon la perte l'est
// par le plafond de messages, c'est à dire par rien du tout.
const COUT_ADAPTATION_USD = 0.14; // mesuré : régénération d'un bloc sur Sonnet 5

describe("plafond d'adaptations du programme", () => {
  it("borne la perte hebdomadaire absorbée par client", () => {
    const perte = usdToEur(LIMIT_ADAPT_PER_WEEK * COUT_ADAPTATION_USD);
    expect(perte).toBeLessThan(0.4);
  });

  it("coupe très en dessous de ce que le plafond de messages autoriserait", () => {
    // Sans plafond dédié, seul le quota du Coach IA borne les adaptations : un
    // client pourrait en déclencher une par message, tous les jours.
    const sansPlafond = LIMIT_COACH_PER_DAY * 7;
    expect(LIMIT_ADAPT_PER_WEEK).toBeLessThan(sansPlafond / 100);
  });

  it("laisse au moins une adaptation possible, sinon le produit ment", () => {
    // La landing promet un programme qui s'adapte aux blessures : un plafond à
    // zéro ferait de cette promesse un mensonge.
    expect(LIMIT_ADAPT_PER_WEEK).toBeGreaterThanOrEqual(1);
  });
});
