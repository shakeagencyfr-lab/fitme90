import { describe, it, expect } from "vitest";
import { upgradeEligible, pickUpgradeOffer, upgradePriceCents, UPSELL_FROM_DAY } from "./upgrade-logic";
import type { Offer } from "./offers";

const offer = (o: Partial<Offer>): Offer => ({
  id: "x",
  tenant_id: "t",
  name: "Offre",
  duration_months: 12,
  price_cents: 49000,
  currency: "eur",
  position: 0,
  is_active: true,
  is_listed: true,
  vip_chat: false,
  coach_ai: true,
  coach_ai_daily_limit: null,
    recipe_ai_daily_limit: null,
  billing_type: "one_time",
  price_month_cents: null,
  price_year_cents: null,
  created_at: "",
  ...o,
});

describe("upgradeEligible", () => {
  const base = { phase: "active", durationMonths: 3, subscribed: false };

  it("se déclenche à la semaine 10 d'un 3 mois payé une fois", () => {
    expect(upgradeEligible({ ...base, day: UPSELL_FROM_DAY - 1 })).toBe(false);
    expect(upgradeEligible({ ...base, day: UPSELL_FROM_DAY })).toBe(true);
    expect(upgradeEligible({ ...base, day: 90 })).toBe(true);
  });

  it("reste proposée pendant la période de consultation, plus après", () => {
    expect(upgradeEligible({ ...base, day: 95, phase: "grace" })).toBe(true);
    expect(upgradeEligible({ ...base, day: 130, phase: "ended" })).toBe(false);
  });

  it("ne concerne ni les abonnés, ni les clients déjà en 12 mois, ni les durées héritées", () => {
    expect(upgradeEligible({ ...base, day: 70, subscribed: true })).toBe(false);
    expect(upgradeEligible({ ...base, day: 70, durationMonths: 12 })).toBe(false);
    expect(upgradeEligible({ ...base, day: 70, durationMonths: 6 })).toBe(false);
    expect(upgradeEligible({ ...base, day: 70, durationMonths: null })).toBe(false);
  });
});

describe("pickUpgradeOffer", () => {
  it("choisit une offre 12 mois active en paiement unique, la moins chère", () => {
    const offers = [
      offer({ id: "a", duration_months: 3, price_cents: 19000 }),
      offer({ id: "b", price_cents: 59000 }),
      offer({ id: "c", price_cents: 49000 }),
      offer({ id: "d", price_cents: 39000, is_active: false }),
      offer({ id: "e", price_cents: null, billing_type: "subscription", price_month_cents: 4900 }),
    ];
    expect(pickUpgradeOffer(offers, "a")?.id).toBe("c");
  });

  it("renvoie null sans offre 12 mois vendable", () => {
    expect(pickUpgradeOffer([offer({ id: "a", duration_months: 3 })], "a")).toBeNull();
    expect(pickUpgradeOffer([], null)).toBeNull();
  });
});

describe("upgradePriceCents", () => {
  it("déduit ce qui a déjà été payé", () => {
    expect(upgradePriceCents(49000, 19000)).toBe(30000);
  });

  it("ne descend jamais sous zéro", () => {
    expect(upgradePriceCents(15000, 19000)).toBe(0);
    expect(upgradePriceCents(NaN, 19000)).toBe(0);
  });
});
