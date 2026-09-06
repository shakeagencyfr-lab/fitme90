import { describe, expect, it } from "vitest";
import {
  clientCanCancel,
  formatHm,
  normalizeHours,
  parseHm,
  resolveBookingAccess,
  sanitizeBookingSettings,
  sanitizeService,
  DEFAULT_BOOKING_SETTINGS,
} from "./booking-rules";

describe("resolveBookingAccess", () => {
  const base = { addonEnabled: false, planIncluded: false, priceCents: null, subStatus: null };

  it("la plateforme, les revendeurs et un coach sans parent l'ont d'office", () => {
    expect(resolveBookingAccess({ ...base, kind: "platform", parentId: null }).source).toBe("own");
    expect(resolveBookingAccess({ ...base, kind: "reseller", parentId: "p" }).source).toBe("own");
    expect(resolveBookingAccess({ ...base, kind: "coach", parentId: null }).allowed).toBe(true);
  });

  it("le pack payé passe avant le palier", () => {
    const a = resolveBookingAccess({ ...base, kind: "coach", parentId: "r", addonEnabled: true, planIncluded: true, subStatus: "active" });
    expect(a).toMatchObject({ allowed: true, source: "addon", subStatus: "active" });
  });

  it("le palier qui l'inclut ouvre", () => {
    expect(resolveBookingAccess({ ...base, kind: "coach", parentId: "r", planIncluded: true })).toMatchObject({ allowed: true, source: "plan" });
  });

  it("sans palier ni pack : proposé si le revendeur a fixé un prix, fermé sinon", () => {
    expect(resolveBookingAccess({ ...base, kind: "coach", parentId: "r", priceCents: 1900 })).toMatchObject({ allowed: false, source: "offered", priceCents: 1900 });
    expect(resolveBookingAccess({ ...base, kind: "coach", parentId: "r", priceCents: 0 })).toMatchObject({ allowed: false, source: "closed", priceCents: null });
    expect(resolveBookingAccess({ ...base, kind: "coach", parentId: "r" })).toMatchObject({ allowed: false, source: "closed" });
  });
});

describe("réglages", () => {
  it("part des défauts et borne ce qui vient du formulaire", () => {
    expect(sanitizeBookingSettings({})).toEqual(DEFAULT_BOOKING_SETTINGS);
    const s = sanitizeBookingSettings({ slotStepMin: "15", minNoticeHours: "-3", maxAdvanceDays: "9999", cancelLimitHours: "48", bufferMin: "10", payment: "required", confirmation: "manual", address: "  12 rue X  ", instructions: "x".repeat(700) });
    expect(s).toMatchObject({ slotStepMin: 15, minNoticeHours: 0, maxAdvanceDays: 365, cancelLimitHours: 48, bufferMin: 10, payment: "required", confirmation: "manual", address: "12 rue X" });
    expect(s.instructions).toHaveLength(600);
  });

  it("ramène un pas exotique sur une valeur proposée", () => {
    expect(sanitizeBookingSettings({ slotStepMin: 7 }).slotStepMin).toBe(15);
    expect(sanitizeBookingSettings({ slotStepMin: 25 }).slotStepMin).toBe(30);
    expect(sanitizeBookingSettings({ slotStepMin: 90 }).slotStepMin).toBe(60);
  });
});

describe("horaires", () => {
  it("lit et écrit les heures", () => {
    expect(parseHm("09:00")).toBe(540);
    expect(parseHm("9h30")).toBe(570);
    expect(parseHm("24:00")).toBe(1440);
    expect(parseHm("25:00")).toBeNull();
    expect(parseHm("abc")).toBeNull();
    expect(formatHm(570)).toBe("09:30");
  });

  it("rejette l'invalide, fusionne ce qui se chevauche, trie", () => {
    const h = normalizeHours([
      { weekday: 2, startMin: 840, endMin: 1140 },
      { weekday: 0, startMin: 540, endMin: 720 },
      { weekday: 0, startMin: 660, endMin: 780 },
      { weekday: 0, startMin: 900, endMin: 1080 },
      { weekday: 7, startMin: 540, endMin: 720 },
      { weekday: 1, startMin: 720, endMin: 600 },
    ]);
    expect(h).toEqual([
      { weekday: 0, startMin: 540, endMin: 780 },
      { weekday: 0, startMin: 900, endMin: 1080 },
      { weekday: 2, startMin: 840, endMin: 1140 },
    ]);
  });
});

describe("prestations", () => {
  it("borne une prestation et lit un prix en euros décimaux", () => {
    expect(sanitizeService({ name: " Séance individuelle ", durationMin: "60", priceCents: 4500 })).toEqual({ name: "Séance individuelle", description: "", durationMin: 60, priceCents: 4500 });
    expect(sanitizeService({ name: "Bilan", durationMin: "45", priceCents: "" })?.priceCents).toBeNull();
    expect(sanitizeService({ name: "Bilan", durationMin: "45", priceCents: "0" })?.priceCents).toBeNull();
    expect(sanitizeService({ name: "", durationMin: "45" })).toBeNull();
    expect(sanitizeService({ name: "X", durationMin: "5" })).toBeNull();
    expect(sanitizeService({ name: "X", durationMin: "500" })?.durationMin).toBe(240);
  });
});

describe("annulation par le client", () => {
  it("respecte la limite en heures", () => {
    const now = new Date("2026-09-06T10:00:00Z");
    expect(clientCanCancel(new Date("2026-09-07T10:00:00Z"), 24, now)).toBe(true);
    expect(clientCanCancel(new Date("2026-09-07T09:59:00Z"), 24, now)).toBe(false);
    expect(clientCanCancel(new Date("2026-09-06T10:30:00Z"), 0, now)).toBe(true);
  });
});
