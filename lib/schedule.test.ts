import { describe, it, expect } from "vitest";
import {
  restPatternFromTrainDays,
  isRestDay,
  weekdayIndexUTC,
  startWeekday,
  dateOfProgramDay,
} from "./schedule";

describe("weekdayIndexUTC — 0=LUN … 6=DIM", () => {
  it("mappe correctement les jours (UTC)", () => {
    expect(weekdayIndexUTC(new Date("2026-08-31T00:00:00Z"))).toBe(0); // lundi
    expect(weekdayIndexUTC(new Date("2026-08-26T00:00:00Z"))).toBe(2); // mercredi
    expect(weekdayIndexUTC(new Date("2026-08-30T00:00:00Z"))).toBe(6); // dimanche
  });
});

describe("startWeekday", () => {
  it("déduit l'index du jour de semaine de la date de début", () => {
    expect(startWeekday("2026-08-31")).toBe(0); // lundi
    expect(startWeekday("2026-08-26")).toBe(2); // mercredi
    expect(startWeekday(null)).toBe(0); // défaut
  });
});

describe("dateOfProgramDay", () => {
  it("le jour 1 vaut la date de début, le jour 8 tombe une semaine après", () => {
    expect(dateOfProgramDay("2026-08-26", 1).toISOString().slice(0, 10)).toBe("2026-08-26");
    expect(dateOfProgramDay("2026-08-26", 8).toISOString().slice(0, 10)).toBe("2026-09-02");
  });
});

describe("isRestDay — aligné sur le vrai calendrier", () => {
  const pattern = restPatternFromTrainDays(["LUN", "VEN"]); // repos sauf LUN & VEN

  it("sans décalage : jour 1 = lundi (entraînement)", () => {
    expect(isRestDay(1, pattern)).toBe(false); // LUN
    expect(isRestDay(2, pattern)).toBe(true); // MAR repos
    expect(isRestDay(5, pattern)).toBe(false); // VEN
  });

  it("départ un mercredi : le jour 1 est un repos, le jour 3 (VEN) est un entraînement", () => {
    const wd = startWeekday("2026-08-26"); // mercredi = 2
    expect(isRestDay(1, pattern, wd)).toBe(true); // mercredi → repos
    expect(isRestDay(3, pattern, wd)).toBe(false); // vendredi → entraînement
    expect(isRestDay(6, pattern, wd)).toBe(false); // lundi suivant → entraînement
  });
});
