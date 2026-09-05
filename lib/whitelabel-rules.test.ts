import { describe, expect, it } from "vitest";
import { poweredByHiddenFor, resolveWhitelabel, whitelabelSubActive, type WhitelabelFacts } from "./whitelabel-rules";

const coach = (over: Partial<WhitelabelFacts> = {}): WhitelabelFacts => ({
  kind: "coach",
  parentId: "reseller-1",
  addonEnabled: false,
  planIncluded: false,
  priceCents: null,
  subStatus: null,
  hidePoweredBy: false,
  ...over,
});

describe("resolveWhitelabel : qui a le pack", () => {
  it("la plateforme et les revendeurs l'ont d'office", () => {
    expect(resolveWhitelabel(coach({ kind: "platform", parentId: null })).source).toBe("own");
    expect(resolveWhitelabel(coach({ kind: "reseller" })).source).toBe("own");
    expect(resolveWhitelabel(coach({ kind: "reseller" })).allowed).toBe(true);
  });

  it("un coach sans revendeur au-dessus l'a aussi", () => {
    expect(resolveWhitelabel(coach({ parentId: null })).source).toBe("own");
  });

  it("un coach sous revendeur, sans palier ni abonnement ni prix, ne l'a PAS (faille fermée)", () => {
    const a = resolveWhitelabel(coach());
    expect(a.allowed).toBe(false);
    expect(a.source).toBe("closed");
    expect(a.priceCents).toBeNull();
  });

  it("le pack vendu à part mais non souscrit : proposé, pas ouvert", () => {
    const a = resolveWhitelabel(coach({ priceCents: 1900 }));
    expect(a.allowed).toBe(false);
    expect(a.source).toBe("offered");
    expect(a.priceCents).toBe(1900);
  });

  it("un prix à zéro ne vaut pas offre", () => {
    expect(resolveWhitelabel(coach({ priceCents: 0 })).source).toBe("closed");
  });

  it("le palier courant qui l'inclut ouvre le pack", () => {
    const a = resolveWhitelabel(coach({ planIncluded: true, priceCents: 1900 }));
    expect(a.allowed).toBe(true);
    expect(a.source).toBe("plan");
    expect(a.priceCents).toBeNull();
  });

  it("l'abonnement souscrit passe avant le palier", () => {
    expect(resolveWhitelabel(coach({ addonEnabled: true, planIncluded: true })).source).toBe("addon");
  });
});

describe("le badge « Propulsé par »", () => {
  it("ne disparaît qu'avec le pack ET la case cochée", () => {
    expect(poweredByHiddenFor(resolveWhitelabel(coach({ hidePoweredBy: true })))).toBe(false);
    expect(poweredByHiddenFor(resolveWhitelabel(coach({ planIncluded: true })))).toBe(false);
    expect(poweredByHiddenFor(resolveWhitelabel(coach({ planIncluded: true, hidePoweredBy: true })))).toBe(true);
  });

  it("revient de lui-même quand le pack tombe, la case restant cochée", () => {
    const before = resolveWhitelabel(coach({ addonEnabled: true, hidePoweredBy: true }));
    const after = resolveWhitelabel(coach({ addonEnabled: false, hidePoweredBy: true }));
    expect(poweredByHiddenFor(before)).toBe(true);
    expect(poweredByHiddenFor(after)).toBe(false);
  });
});

describe("whitelabelSubActive : l'abonnement couvre-t-il encore le pack ?", () => {
  const now = Date.UTC(2026, 8, 5);
  it("actif ou en essai : oui", () => {
    expect(whitelabelSubActive("active", null, now)).toBe(true);
    expect(whitelabelSubActive("trialing", null, now)).toBe(true);
  });
  it("résilié en fin de période, période encore en cours : oui", () => {
    const inTenDays = Math.floor((now + 10 * 86_400_000) / 1000);
    expect(whitelabelSubActive("canceled", inTenDays, now)).toBe(true);
  });
  it("résilié dans le passé, impayé, incomplet : non", () => {
    const yesterday = Math.floor((now - 86_400_000) / 1000);
    expect(whitelabelSubActive("canceled", yesterday, now)).toBe(false);
    expect(whitelabelSubActive("canceled", null, now)).toBe(false);
    expect(whitelabelSubActive("past_due", null, now)).toBe(false);
    expect(whitelabelSubActive("unpaid", null, now)).toBe(false);
    expect(whitelabelSubActive("incomplete_expired", null, now)).toBe(false);
  });
});
