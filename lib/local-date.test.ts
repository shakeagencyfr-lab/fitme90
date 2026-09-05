import { describe, it, expect } from "vitest";
import { localDayUTC, todayIso, browserLocalIso } from "./local-date";

describe("date calendaire dans le fuseau de l'application", () => {
  it("à 22 h 30 UTC un 5 septembre, Paris est déjà le 6", () => {
    const now = new Date("2026-09-05T22:30:00Z");
    expect(todayIso(now)).toBe("2026-09-06");
    expect(localDayUTC(now)).toBe(Date.UTC(2026, 8, 6));
  });

  it("à midi UTC, même jour des deux côtés", () => {
    expect(todayIso(new Date("2026-01-10T12:00:00Z"))).toBe("2026-01-10");
  });

  it("l'hiver, le décalage n'est plus que d'une heure", () => {
    expect(todayIso(new Date("2026-01-10T23:30:00Z"))).toBe("2026-01-11");
    expect(todayIso(new Date("2026-01-10T22:30:00Z"))).toBe("2026-01-10");
  });

  it("accepte un autre fuseau", () => {
    expect(todayIso(new Date("2026-09-05T22:30:00Z"), "UTC")).toBe("2026-09-05");
  });

  it("formate une date locale du navigateur sans passer par UTC", () => {
    const d = new Date(2026, 8, 6, 0, 30);
    expect(browserLocalIso(d)).toBe("2026-09-06");
  });
});
