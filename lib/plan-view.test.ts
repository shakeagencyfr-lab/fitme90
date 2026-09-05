import { describe, it, expect } from "vitest";
import type { Plan } from "@/lib/plans";
import {
  priceFor,
  availableIn,
  monthlyEquivalentCents,
  annualSaving,
  perClientMonthlyCents,
  capacityLabel,
  capacityView,
  suggestedPlanId,
  sortByCapacity,
} from "@/lib/plan-view";

function plan(over: Partial<Plan> & { id: string }): Plan {
  return {
    tenant_id: "t",
    name: over.id,
    price_month_cents: null,
    price_year_cents: null,
    client_limit: null,
    setup_fee_cents: 0,
    whitelabel_included: false,
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

// L'offre réelle du compte de test : Coaching Pro, 50 clients, 49 €/mois,
// 490 €/an, 150 € de mise en place.
const pro = plan({ id: "pro", name: "Coaching Pro", client_limit: 50, price_month_cents: 4900, price_year_cents: 49000, setup_fee_cents: 15000 });

describe("prix et disponibilité", () => {
  it("lit le prix de l'intervalle demandé", () => {
    expect(priceFor(pro, "month")).toBe(4900);
    expect(priceFor(pro, "year")).toBe(49000);
  });

  it("un palier sans prix annuel n'est pas souscriptible à l'année", () => {
    const p = plan({ id: "m", price_month_cents: 1900 });
    expect(availableIn(p, "month")).toBe(true);
    expect(availableIn(p, "year")).toBe(false);
  });
});

describe("équivalent mensuel", () => {
  it("ramène l'annuel au mois, seule base de comparaison honnête", () => {
    expect(monthlyEquivalentCents(pro, "year")).toBe(4083); // 490 / 12
    expect(monthlyEquivalentCents(pro, "month")).toBe(4900);
  });

  it("null quand l'intervalle n'est pas proposé", () => {
    expect(monthlyEquivalentCents(plan({ id: "m", price_month_cents: 1900 }), "year")).toBeNull();
  });
});

describe("économie annuelle", () => {
  it("chiffre le gain face à douze mensualités", () => {
    const s = annualSaving(pro)!;
    expect(s.cents).toBe(4900 * 12 - 49000); // 98 €
    expect(s.percent).toBe(17);
    expect(s.freeMonths).toBe(2);
  });

  it("rien à annoncer si l'annuel n'est pas moins cher", () => {
    expect(annualSaving(plan({ id: "x", price_month_cents: 1000, price_year_cents: 12000 }))).toBeNull();
    expect(annualSaving(plan({ id: "y", price_month_cents: 1000, price_year_cents: 13000 }))).toBeNull();
  });

  it("rien à annoncer si un des deux prix manque", () => {
    expect(annualSaving(plan({ id: "m", price_month_cents: 1900 }))).toBeNull();
    expect(annualSaving(plan({ id: "a", price_year_cents: 19000 }))).toBeNull();
  });
});

describe("coût par place", () => {
  it("ramène le prix à une place et par mois", () => {
    expect(perClientMonthlyCents(pro, "month")).toBe(98); // 49 € / 50
    expect(perClientMonthlyCents(pro, "year")).toBe(82); // 40,83 € / 50
  });

  it("pas de coût par place sur un palier illimité", () => {
    expect(perClientMonthlyCents(plan({ id: "u", price_month_cents: 9900 }), "month")).toBeNull();
  });
});

describe("capacité", () => {
  it("dit clairement combien de places, au singulier comme au pluriel", () => {
    expect(capacityLabel(1)).toBe("1 client");
    expect(capacityLabel(50)).toBe("50 clients");
    expect(capacityLabel(null)).toBe("Clients illimités");
  });

  it("le palier gratuit rempli est signalé comme complet", () => {
    const v = capacityView({ used: 1, limit: 1, unlimited: false });
    expect(v.tone).toBe("full");
    expect(v.remaining).toBe(0);
    expect(v.ratio).toBe(1);
  });

  it("prévient dès 80 % au lieu d'attendre la limite", () => {
    expect(capacityView({ used: 40, limit: 50, unlimited: false }).tone).toBe("tight");
    expect(capacityView({ used: 39, limit: 50, unlimited: false }).tone).toBe("ok");
  });

  it("illimité : pas de jauge, pas d'alerte", () => {
    const v = capacityView({ used: 120, limit: null, unlimited: true });
    expect(v.unlimited).toBe(true);
    expect(v.ratio).toBe(0);
    expect(v.tone).toBe("ok");
    expect(v.remaining).toBeNull();
  });

  it("un dépassement ne fait pas déborder la jauge", () => {
    const v = capacityView({ used: 7, limit: 5, unlimited: false });
    expect(v.ratio).toBe(1);
    expect(v.remaining).toBe(0);
  });
});

describe("palier suggéré", () => {
  const petit = plan({ id: "petit", client_limit: 10, price_month_cents: 1900, price_year_cents: 19000 });
  const moyen = plan({ id: "moyen", client_limit: 50, price_month_cents: 4900, price_year_cents: 49000 });
  const illimite = plan({ id: "illimite", client_limit: null, price_month_cents: 9900 });
  const plans = [moyen, illimite, petit];

  it("propose le plus petit pas qui débloque, pas le plus gros", () => {
    expect(suggestedPlanId(plans, 1, null, "month")).toBe("petit");
  });

  it("ignore les paliers qui n'offrent pas plus de places", () => {
    expect(suggestedPlanId(plans, 10, "petit", "month")).toBe("moyen");
  });

  it("ne se propose jamais le palier déjà souscrit", () => {
    expect(suggestedPlanId([petit], 1, "petit", "month")).toBeNull();
  });

  it("ne propose rien quand la capacité est déjà illimitée", () => {
    expect(suggestedPlanId(plans, null, null, "month")).toBeNull();
  });

  it("ne propose que des paliers souscriptibles dans l'intervalle affiché", () => {
    // illimite n'a pas de prix annuel : à l'année il sort du choix.
    expect(suggestedPlanId([illimite], 1, null, "year")).toBeNull();
    expect(suggestedPlanId([illimite], 1, null, "month")).toBe("illimite");
  });
});

describe("tri", () => {
  it("classe par capacité croissante, illimité en dernier", () => {
    const plans = [
      plan({ id: "illimite", client_limit: null }),
      plan({ id: "grand", client_limit: 50 }),
      plan({ id: "petit", client_limit: 10 }),
    ];
    expect(sortByCapacity(plans).map((p) => p.id)).toEqual(["petit", "grand", "illimite"]);
  });
});
