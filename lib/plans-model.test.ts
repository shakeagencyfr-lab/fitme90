import { describe, it, expect } from "vitest";
import { planIsSellable, type Plan } from "./plans";

function plan(over: Partial<Plan>): Plan {
  return {
    id: "p",
    tenant_id: "t",
    name: "Palier",
    price_month_cents: 4900,
    price_year_cents: null,
    client_limit: 10,
    setup_fee_cents: 0,
    whitelabel_included: false,
    booking_included: false,
    ai_supply: "byok",
    coach_byok_allowed: true,
    coach_credits_allowed: false,
    is_free: false,
    starter_credits: 0,
    is_active: true,
    position: 0,
    created_at: "2026-01-01",
    ...over,
  };
}

// Le palier gratuit est une ligne comme les autres dans la table : ces tests
// verrouillent qu'il ne se retrouve jamais dans une grille de vente comme un
// palier à acheter, et qu'un palier sans prix n'y figure pas non plus.
describe("un palier se vend", () => {
  it("quand il est actif et qu'il a un prix", () => {
    expect(planIsSellable(plan({}))).toBe(true);
    expect(planIsSellable(plan({ price_month_cents: null, price_year_cents: 49000 }))).toBe(true);
  });

  it("jamais quand c'est le palier gratuit, même actif", () => {
    expect(planIsSellable(plan({ is_free: true, price_month_cents: null }))).toBe(false);
    // Un prix posé par erreur sur le gratuit ne le rend pas vendable.
    expect(planIsSellable(plan({ is_free: true }))).toBe(false);
  });

  it("jamais sans prix ni quand il est désactivé", () => {
    expect(planIsSellable(plan({ price_month_cents: null }))).toBe(false);
    expect(planIsSellable(plan({ is_active: false }))).toBe(false);
  });
});
