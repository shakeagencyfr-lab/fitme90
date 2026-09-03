import { describe, it, expect } from "vitest";
import { confidenceLabel, equipmentKey, EQUIPMENT_FAMILIES } from "./equipment";

describe("confidenceLabel", () => {
  it("traduit les trois clés techniques", () => {
    expect(confidenceLabel("high", "fr")).toBe("sûr");
    expect(confidenceLabel("medium", "fr")).toBe("probable");
    expect(confidenceLabel("low", "en")).toBe("unsure");
  });

  it("ne perd plus la confiance des réponses anglaises", () => {
    // L'ancien enum était français : `z.enum(["élevée",...]).catch("moyenne")`
    // écrasait silencieusement « high » en « moyenne » pour tout client anglais.
    expect(confidenceLabel("high", "en")).toBe("confident");
    expect(confidenceLabel("high", "en")).not.toBe(confidenceLabel("medium", "en"));
  });

  it("lit encore les lignes déjà enregistrées en français", () => {
    expect(confidenceLabel("élevée", "fr")).toBe("sûr");
    expect(confidenceLabel("moyenne", "fr")).toBe("probable");
    expect(confidenceLabel("faible", "fr")).toBe("incertain");
  });

  it("ne rend rien pour une valeur inconnue ou absente", () => {
    expect(confidenceLabel(null, "fr")).toBeNull();
    expect(confidenceLabel("", "fr")).toBeNull();
    expect(confidenceLabel("peut-être", "fr")).toBeNull();
  });
});

describe("equipmentKey", () => {
  it("fusionne les mêmes machines vues sur deux photos", () => {
    expect(equipmentKey("Presse à cuisses")).toBe(equipmentKey("presse a cuisses"));
    expect(equipmentKey("Leg press ")).toBe(equipmentKey("LEG  PRESS"));
  });

  it("ne fusionne pas deux machines différentes", () => {
    expect(equipmentKey("leg press")).not.toBe(equipmentKey("leg curl"));
  });

  it("renvoie une clé vide pour un nom vide, que l'appelant écarte", () => {
    expect(equipmentKey("   ")).toBe("");
    expect(equipmentKey("!!!")).toBe("");
  });
});

describe("EQUIPMENT_FAMILIES", () => {
  it("n'a pas de doublon (le prompt les liste au modèle)", () => {
    expect(new Set(EQUIPMENT_FAMILIES).size).toBe(EQUIPMENT_FAMILIES.length);
  });

  it("reste assez court pour tenir dans le prompt système", () => {
    expect(EQUIPMENT_FAMILIES.join(" | ").length).toBeLessThan(1200);
  });
});
