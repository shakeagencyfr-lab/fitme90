import { describe, expect, it } from "vitest";
import {
  addMonthsUnix,
  cancelAtFor,
  installmentCount,
  installmentsTotalCents,
  paidInFull,
  paymentModes,
  resolvePaymentMode,
  scheduleFor,
} from "./installments";

const unix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("paymentModes : ce qu'une offre propose", () => {
  it("en une fois seulement, en mensualités seulement, ou les deux", () => {
    expect(paymentModes({ price_cents: 19000, price_month_cents: null, duration_months: 3 })).toEqual(["once"]);
    expect(paymentModes({ price_cents: null, price_month_cents: 6900, duration_months: 3 })).toEqual(["installments"]);
    expect(paymentModes({ price_cents: 19000, price_month_cents: 6900, duration_months: 3 })).toEqual(["once", "installments"]);
  });
  it("un prix à zéro n'est pas une façon de payer", () => {
    expect(paymentModes({ price_cents: 0, price_month_cents: 0, duration_months: 3 })).toEqual([]);
  });
});

describe("mensualités : autant que de mois", () => {
  it("3 mois = 3 mensualités, 12 mois = 12, et le total suit", () => {
    expect(installmentCount({ price_cents: null, price_month_cents: 6900, duration_months: 3 })).toBe(3);
    expect(installmentCount({ price_cents: null, price_month_cents: 4900, duration_months: 12 })).toBe(12);
    expect(installmentsTotalCents({ price_cents: null, price_month_cents: 4900, duration_months: 12 })).toBe(58800);
    expect(installmentsTotalCents({ price_cents: 19000, price_month_cents: null, duration_months: 3 })).toBeNull();
  });
});

describe("resolvePaymentMode : la préférence du client, si l'offre la propose", () => {
  const both = ["once", "installments"] as const;
  it("suit la préférence quand elle existe", () => {
    expect(resolvePaymentMode("once", [...both])).toBe("once");
    expect(resolvePaymentMode("month", [...both])).toBe("installments");
  });
  it("retombe sur ce qui existe", () => {
    expect(resolvePaymentMode("once", ["installments"])).toBe("installments");
    expect(resolvePaymentMode(null, [...both])).toBe("once");
    expect(resolvePaymentMode("year", [])).toBeNull();
  });
});

describe("cancelAtFor : exactement N factures", () => {
  it("3 mensualités depuis le 15 janvier s'arrêtent le 15 avril", () => {
    expect(cancelAtFor(unix("2026-01-15T10:00:00Z"), 3)).toBe(unix("2026-04-15T10:00:00Z"));
  });
  it("le 31 janvier + 1 mois tombe fin février, pas début mars", () => {
    expect(addMonthsUnix(unix("2026-01-31T00:00:00Z"), 1)).toBe(unix("2026-02-28T00:00:00Z"));
  });
  it("12 mensualités font le tour de l'année", () => {
    expect(cancelAtFor(unix("2026-03-01T00:00:00Z"), 12)).toBe(unix("2027-03-01T00:00:00Z"));
  });
});

describe("paidInFull : soldé seulement si arrêté À la date prévue", () => {
  const at = unix("2026-04-15T10:00:00Z");
  it("arrêté par Stripe à la date prévue : soldé", () => {
    expect(paidInFull("canceled", at, at)).toBe(true);
    expect(paidInFull("canceled", at, at + 3600)).toBe(true);
  });
  it("arrêté avant par le client, impayé, ou encore actif : pas soldé", () => {
    expect(paidInFull("canceled", at, at - 30 * 86400)).toBe(false);
    expect(paidInFull("past_due", at, null)).toBe(false);
    expect(paidInFull("active", at, null)).toBe(false);
    expect(paidInFull("canceled", null, at)).toBe(false);
  });
});

describe("scheduleFor : l'échéancier lu par le client", () => {
  it("compte les mensualités passées et annonce la prochaine", () => {
    const s = scheduleFor("2026-01-15T10:00:00Z", 6900, 3, new Date("2026-02-20T00:00:00Z"));
    expect(s.count).toBe(3);
    expect(s.totalCents).toBe(20700);
    expect(s.paid).toBe(2);
    expect(s.nextAt).toBe("2026-03-15T10:00:00.000Z");
    expect(s.lastAt).toBe("2026-03-15T10:00:00.000Z");
    expect(s.done).toBe(false);
  });
  it("une fois la dernière passée, plus rien à venir", () => {
    const s = scheduleFor("2026-01-15T10:00:00Z", 6900, 3, new Date("2026-03-16T00:00:00Z"));
    expect(s.paid).toBe(3);
    expect(s.nextAt).toBeNull();
    expect(s.done).toBe(true);
  });
});
