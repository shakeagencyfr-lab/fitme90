import { describe, it, expect } from "vitest";
import { coachUsageToCharge } from "./credits";

// Une réponse du coach coûte UN crédit, quoi qu'elle ait fait. Y compris quand
// le client signale une blessure et que le chat reconstruit un bloc entier :
// une adaptation est subie, pas achetée, et la facturer comme une génération
// (50 crédits, 20 € au tarif par défaut) dissuaderait de signaler la douleur.
// Le fournisseur absorbe, le journal d'utilisation garde la trace du coût.
describe("coachUsageToCharge", () => {
  it("ne débite qu'une action, jamais une génération", () => {
    expect(coachUsageToCharge()).toEqual(["action"]);
  });

  it("ne débite jamais de génération depuis le chat", () => {
    // La régression à éviter : réintroduire "program" ici referait payer 50
    // crédits une adaptation que le produit doit encourager.
    expect(coachUsageToCharge()).not.toContain("program");
  });

  it("débite toujours le message", () => {
    expect(coachUsageToCharge()).toContain("action");
  });
});
