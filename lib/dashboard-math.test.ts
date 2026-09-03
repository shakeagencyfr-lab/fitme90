import { describe, it, expect } from "vitest";
import {
  monthKey,
  lastMonths,
  mrrCents,
  oneTimeCents,
  salesSeries,
  offerTally,
  conversionRate,
  networkMrrCents,
  planTally,
  attentionList,
  trendPct,
  type SaleRow,
  type AccountRow,
} from "./dashboard-math";

function sale(p: Partial<SaleRow>): SaleRow {
  return {
    createdAt: "2026-09-10T12:00:00.000Z",
    paid: true,
    offerName: "Transformation 3 mois",
    billingType: "one_time",
    priceCents: 14900,
    priceMonthCents: null,
    priceYearCents: null,
    interval: null,
    subStatus: null,
    ...p,
  };
}

function account(p: Partial<AccountRow>): AccountRow {
  return {
    createdAt: "2026-09-01T00:00:00.000Z",
    subStatus: "active",
    planMonthCents: 3900,
    planYearCents: 39000,
    planName: "Starter",
    suspendedAt: null,
    clientCount: 4,
    clientLimit: 10,
    ...p,
  };
}

describe("découpage des mois", () => {
  it("nomme le mois en UTC", () => {
    // Le 1er à 00 h 30 en France est encore le mois précédent en UTC : c'est
    // voulu, sinon deux coachs de fuseaux différents lisent deux chiffres.
    expect(monthKey(new Date("2026-03-01T00:30:00.000Z"))).toBe("2026-03");
    expect(monthKey(new Date("2026-12-31T23:00:00.000Z"))).toBe("2026-12");
  });

  it("remonte les mois sans trou et passe l'année", () => {
    expect(lastMonths(new Date("2026-02-15T00:00:00.000Z"), 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("revenu récurrent", () => {
  it("ne compte que les abonnements qui encaissent", () => {
    const rows = [
      sale({ billingType: "subscription", subStatus: "active", priceMonthCents: 4900, interval: "month" }),
      sale({ billingType: "subscription", subStatus: "past_due", priceMonthCents: 4900, interval: "month" }),
      sale({ billingType: "subscription", subStatus: "canceled", priceMonthCents: 4900, interval: "month" }),
    ];
    expect(mrrCents(rows)).toBe(4900);
  });

  it("lisse un paiement annuel sur douze mois", () => {
    const rows = [sale({ billingType: "subscription", subStatus: "active", priceYearCents: 60000, interval: "year" })];
    expect(mrrCents(rows)).toBe(5000);
  });

  it("ignore les ventes uniques", () => {
    expect(mrrCents([sale({})])).toBe(0);
  });
});

describe("ventes uniques", () => {
  it("ignore un client qui n'a pas payé", () => {
    expect(oneTimeCents([sale({ paid: false })])).toBe(0);
  });

  it("filtre sur le mois d'achat", () => {
    const rows = [
      sale({ createdAt: "2026-08-04T00:00:00.000Z", priceCents: 10000 }),
      sale({ createdAt: "2026-09-04T00:00:00.000Z", priceCents: 20000 }),
    ];
    expect(oneTimeCents(rows, "2026-09")).toBe(20000);
    expect(oneTimeCents(rows)).toBe(30000);
  });

  it("n'encaisse pas deux fois un abonnement", () => {
    const rows = [sale({ billingType: "subscription", subStatus: "active", priceCents: 14900, priceMonthCents: 4900, interval: "month" })];
    expect(oneTimeCents(rows)).toBe(0);
  });
});

describe("série mensuelle", () => {
  it("laisse un mois vide à zéro plutôt que de l'omettre", () => {
    const rows = [sale({ createdAt: "2026-09-04T00:00:00.000Z", priceCents: 15000 })];
    const s = salesSeries(rows, ["2026-07", "2026-08", "2026-09"]);
    expect(s.map((p) => p.clients)).toEqual([0, 0, 1]);
    expect(s.map((p) => p.oneTimeCents)).toEqual([0, 0, 15000]);
  });
});

describe("classement des offres", () => {
  it("range la plus rentable en tête", () => {
    const rows = [
      sale({ offerName: "Petit", priceCents: 5000 }),
      sale({ offerName: "Gros", priceCents: 30000 }),
      sale({ offerName: "Petit", priceCents: 5000 }),
    ];
    const t = offerTally(rows);
    expect(t[0]).toEqual({ name: "Gros", sales: 1, cents: 30000 });
    expect(t[1]).toEqual({ name: "Petit", sales: 2, cents: 10000 });
  });

  it("compte un abonnement pour son loyer mensuel, et zéro s'il est mort", () => {
    const rows = [
      sale({ offerName: "Suivi", billingType: "subscription", subStatus: "active", priceMonthCents: 4900, interval: "month" }),
      sale({ offerName: "Suivi", billingType: "subscription", subStatus: "canceled", priceMonthCents: 4900, interval: "month" }),
    ];
    expect(offerTally(rows)[0]).toEqual({ name: "Suivi", sales: 2, cents: 4900 });
  });
});

describe("conversion", () => {
  it("rend un pourcentage entier, et zéro sans prospect", () => {
    expect(conversionRate(40, 10)).toBe(25);
    expect(conversionRate(0, 5)).toBe(0);
  });
});

describe("réseau du revendeur", () => {
  it("ne facture pas un compte suspendu, même resté actif chez Stripe", () => {
    const rows = [account({}), account({ suspendedAt: "2026-08-01T00:00:00.000Z" })];
    expect(networkMrrCents(rows)).toBe(3900);
  });

  it("répartit par palier et somme le revenu vivant", () => {
    const rows = [
      account({ planName: "Pro", planMonthCents: 6900 }),
      account({ planName: "Pro", planMonthCents: 6900, subStatus: "past_due" }),
      account({ planName: "Starter" }),
    ];
    const t = planTally(rows);
    expect(t[0]).toEqual({ name: "Pro", count: 2, mrrCents: 6900 });
    expect(t[1]).toEqual({ name: "Starter", count: 1, mrrCents: 3900 });
  });

  it("groupe les comptes sans palier sous un libellé plutôt que de les perdre", () => {
    expect(planTally([account({ planName: null, planMonthCents: null })])[0].name).toBe("Sans palier");
  });
});

describe("comptes à traiter", () => {
  it("remonte une seule raison par compte, la plus grave", () => {
    const rows = [{ ...account({ suspendedAt: "2026-08-01T00:00:00.000Z", clientCount: 0 }), name: "Gelé" }];
    expect(attentionList(rows)).toEqual([{ name: "Gelé", reason: "suspended" }]);
  });

  it("classe l'urgent avant l'anodin", () => {
    const rows = [
      { ...account({ clientCount: 0 }), name: "Vide" },
      { ...account({ subStatus: "past_due" }), name: "Impayé" },
      { ...account({ suspendedAt: "2026-08-01T00:00:00.000Z" }), name: "Gelé" },
    ];
    expect(attentionList(rows).map((a) => a.name)).toEqual(["Gelé", "Impayé", "Vide"]);
  });

  it("laisse tranquille un compte sain", () => {
    expect(attentionList([{ ...account({}), name: "OK" }])).toEqual([]);
  });

  it("signale un compte saturé, qui ne peut plus prendre de client", () => {
    const rows = [{ ...account({ clientCount: 10, clientLimit: 10 }), name: "Plein" }];
    expect(attentionList(rows)).toEqual([{ name: "Plein", reason: "full" }]);
  });
});

describe("tendance", () => {
  it("refuse de calculer une variation depuis zéro", () => {
    expect(trendPct(10, 0)).toBeNull();
  });

  it("chiffre la hausse et la baisse", () => {
    expect(trendPct(150, 100)).toBe(50);
    expect(trendPct(50, 100)).toBe(-50);
  });
});
