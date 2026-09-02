import { describe, it, expect } from "vitest";
import { supplySwitchPatch } from "./network-admin";

describe("supplySwitchPatch", () => {
  it("bascule en crédits plateforme et met le revendeur en fournisseur", () => {
    expect(supplySwitchPatch("platform_credits", false)).toEqual({
      ai_supply: "platform_credits",
      ai_mode: "provider",
    });
  });

  it("ignore la clé du revendeur pour aller vers les crédits", () => {
    expect(supplySwitchPatch("platform_credits", true)).toEqual(
      supplySwitchPatch("platform_credits", false),
    );
  });

  it("retour en BYOK avec sa clé : ne touche à rien d'autre", () => {
    expect(supplySwitchPatch("byok", true)).toEqual({ ai_supply: "byok" });
  });

  it("retour en BYOK sans clé : repasse ses coachs en autonomes", () => {
    // Sans clé et en mode provider, tenantAnthropicKey renverrait null pour
    // chaque coach : l'assistant serait muet sans qu'aucun écran ne l'explique.
    expect(supplySwitchPatch("byok", false)).toEqual({
      ai_supply: "byok",
      ai_mode: "byok",
      reseller_model: "subscription",
    });
  });

  it("n'écrit jamais ai_supply en dehors des deux valeurs autorisées", () => {
    for (const has of [true, false]) {
      for (const s of ["byok", "platform_credits"] as const) {
        expect(["byok", "platform_credits"]).toContain(supplySwitchPatch(s, has).ai_supply);
      }
    }
  });
});
