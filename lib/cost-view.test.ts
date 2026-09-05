import { describe, expect, it } from "vitest";
import { costViewFor } from "./ai-supply";

describe("costViewFor : qui voit des dollars, qui voit des crédits", () => {
  it("la plateforme voit toujours ses dollars", () => {
    expect(costViewFor("platform", "byok", "own_key")).toBe("usd");
    expect(costViewFor("platform", "platform_credits", "credits")).toBe("usd");
  });

  it("un revendeur en clé perso voit ses dollars, un revendeur en crédits plateforme ne les voit jamais", () => {
    expect(costViewFor("reseller", "byok", "own_key")).toBe("usd");
    expect(costViewFor("reseller", "platform_credits", "own_key")).toBe("credits");
  });

  it("un coach suit ce que son revendeur lui fournit", () => {
    expect(costViewFor("coach", "byok", "own_key")).toBe("usd");
    expect(costViewFor("coach", "byok", "credits")).toBe("credits");
    expect(costViewFor("coach", "byok", "supplied")).toBe("included");
  });

  it("la source d'IA du revendeur ne change rien pour le coach : c'est la fourniture qui compte", () => {
    expect(costViewFor("coach", "platform_credits", "own_key")).toBe("usd");
    expect(costViewFor("coach", "platform_credits", "credits")).toBe("credits");
  });
});
