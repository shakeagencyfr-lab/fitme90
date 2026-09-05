import { describe, it, expect } from "vitest";
import {
  ALL_RIGHTS,
  allowedSupplies,
  supplyAllowed,
  supplyIsChoice,
  resolveSupply,
  planRefusal,
  rightsPatch,
  forcedSupply,
} from "./supply-rights";

const BYOK_ONLY = { byok: true, credits: false };
const CREDITS_ONLY = { byok: false, credits: true };

describe("les fournitures qu'un revendeur peut poser sur ses paliers", () => {
  it("les deux quand la plateforme a coché les deux cases : il choisit", () => {
    expect(allowedSupplies(ALL_RIGHTS)).toEqual(["byok", "credits"]);
    expect(supplyIsChoice(ALL_RIGHTS)).toBe(true);
    expect(forcedSupply(ALL_RIGHTS)).toBeNull();
  });

  it("la clé personnelle seule pour un revendeur BYOK : pas de crédits chez lui", () => {
    expect(allowedSupplies(BYOK_ONLY)).toEqual(["byok"]);
    expect(supplyAllowed(BYOK_ONLY, "credits")).toBe(false);
    expect(supplyIsChoice(BYOK_ONLY)).toBe(false);
    expect(forcedSupply(BYOK_ONLY)).toBe("byok");
  });

  it("les crédits seuls pour un revendeur qui n'a que la revente : pas de clé perso", () => {
    expect(allowedSupplies(CREDITS_ONLY)).toEqual(["credits"]);
    expect(supplyAllowed(CREDITS_ONLY, "byok")).toBe(false);
    expect(forcedSupply(CREDITS_ONLY)).toBe("credits");
  });

  it("sans aucun droit, la clé personnelle plutôt qu'une liste vide", () => {
    expect(allowedSupplies({ byok: false, credits: false })).toEqual(["byok"]);
  });

  it("résout la fourniture voulue vers la seule permise", () => {
    expect(resolveSupply(BYOK_ONLY, "credits")).toBe("byok");
    expect(resolveSupply(CREDITS_ONLY, "byok")).toBe("credits");
    expect(resolveSupply(ALL_RIGHTS, "credits")).toBe("credits");
    expect(resolveSupply(ALL_RIGHTS, "byok")).toBe("byok");
  });
});

describe("refus d'un palier", () => {
  const plan = (aiSupply: "byok" | "credits", byok = true, credits = false) => ({
    aiSupply,
    coachByokAllowed: byok,
    coachCreditsAllowed: credits,
  });

  it("un revendeur BYOK ne peut pas ouvrir un palier en crédits, même gratuit", () => {
    const refus = planRefusal({ kind: "reseller", rights: BYOK_ONLY }, plan("credits"));
    expect(refus).toMatch(/revente de crédits/);
    expect(planRefusal({ kind: "reseller", rights: BYOK_ONLY }, plan("byok"))).toBeNull();
  });

  it("un revendeur en crédits seuls ne peut pas ouvrir un palier en clé personnelle", () => {
    expect(planRefusal({ kind: "reseller", rights: CREDITS_ONLY }, plan("byok"))).toMatch(/clé personnelle/);
    expect(planRefusal({ kind: "reseller", rights: CREDITS_ONLY }, plan("credits"))).toBeNull();
  });

  it("un revendeur avec les deux droits pose ce qu'il veut", () => {
    expect(planRefusal({ kind: "reseller", rights: ALL_RIGHTS }, plan("byok"))).toBeNull();
    expect(planRefusal({ kind: "reseller", rights: ALL_RIGHTS }, plan("credits"))).toBeNull();
  });

  it("la plateforme ouvre au moins un droit", () => {
    expect(planRefusal({ kind: "platform", rights: ALL_RIGHTS }, plan("byok", false, false))).toMatch(/au moins un mode/);
  });

  it("la plateforme ne vend pas de crédits plateforme sans la revente de crédits", () => {
    expect(planRefusal({ kind: "platform", rights: ALL_RIGHTS }, plan("credits", true, false))).toMatch(/crédits plateforme/);
    expect(planRefusal({ kind: "platform", rights: ALL_RIGHTS }, plan("credits", true, true))).toBeNull();
    expect(planRefusal({ kind: "platform", rights: ALL_RIGHTS }, plan("byok", true, false))).toBeNull();
  });

  it("un coach n'a pas de paliers à vendre : rien à refuser", () => {
    expect(planRefusal({ kind: "coach", rights: ALL_RIGHTS }, plan("credits"))).toBeNull();
  });
});

describe("ce que le compte du revendeur devient quand ses droits sont posés", () => {
  it("BYOK seul : il ne fournit plus, chacun sa clé, modèle abonnement", () => {
    expect(rightsPatch(BYOK_ONLY, { buysPlatformCredits: false, resellerModel: "credits" })).toEqual({
      reseller_model: "subscription",
      ai_mode: "byok",
    });
    expect(rightsPatch(BYOK_ONLY, { buysPlatformCredits: false, resellerModel: "subscription" })).toEqual({ ai_mode: "byok" });
  });

  it("BYOK seul mais en crédits plateforme (compte d'avant) : il reste fournisseur, sans revente", () => {
    expect(rightsPatch(BYOK_ONLY, { buysPlatformCredits: true, resellerModel: "credits" })).toEqual({
      reseller_model: "subscription",
    });
  });

  it("crédits seuls : il fournit, point", () => {
    expect(rightsPatch(CREDITS_ONLY, { buysPlatformCredits: false, resellerModel: "subscription" })).toEqual({ ai_mode: "provider" });
  });

  it("les deux droits : rien n'est imposé", () => {
    expect(rightsPatch(ALL_RIGHTS, { buysPlatformCredits: false, resellerModel: "credits" })).toEqual({});
  });
});
