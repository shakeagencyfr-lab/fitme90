import { describe, it, expect } from "vitest";
import { coachUsageToCharge } from "./credits";

// Trois outils du coach modifient le programme, mais un seul rappelle le
// modèle. Confondre les trois faisait débiter 10 crédits de génération pour un
// recalcul déterministe, soit 4 € au tarif par défaut contre 0,0044 € de conso
// réelle. Ces tests verrouillent la distinction.
describe("coachUsageToCharge", () => {
  it("débite une génération quand le modèle a vraiment régénéré le programme", () => {
    expect(coachUsageToCharge(true)).toEqual(["action", "program"]);
  });

  it("ne débite que le message pour un changement de jours ou de nutrition", () => {
    // Ces deux outils recalculent le plan sans aucun appel IA.
    expect(coachUsageToCharge(false)).toEqual(["action"]);
  });

  it("débite toujours le message, quoi qu'il arrive", () => {
    expect(coachUsageToCharge(true)).toContain("action");
    expect(coachUsageToCharge(false)).toContain("action");
  });

  it("ne débite jamais une génération sans régénération réelle", () => {
    expect(coachUsageToCharge(false)).not.toContain("program");
  });
});
