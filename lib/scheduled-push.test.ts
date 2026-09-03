import { describe, it, expect } from "vitest";
import notify from "../vercel.json";

// Le bug : /api/cron/notify ne tourne qu'une fois par jour, donc une
// notification programmée à 20 h partait le lendemain matin. Ces tests
// verrouillent la cadence du dispatcher dédié.
const crons = (notify as { crons: { path: string; schedule: string }[] }).crons;

function scheduleOf(path: string): string | undefined {
  return crons.find((c) => c.path === path)?.schedule;
}

describe("cadence des crons", () => {
  it("le dispatcher des notifications programmées existe", () => {
    expect(scheduleOf("/api/cron/push")).toBeDefined();
  });

  it("il tourne au moins toutes les heures, pas une fois par jour", () => {
    const s = scheduleOf("/api/cron/push")!;
    const [, hour] = s.split(" ");
    // « * » ou « */n » en position heure = plusieurs passages par jour.
    expect(hour === "*" || hour.startsWith("*/")).toBe(true);
  });

  it("le cron quotidien reste quotidien : il fait autre chose (rappels séance)", () => {
    const s = scheduleOf("/api/cron/notify")!;
    const [, hour] = s.split(" ");
    expect(hour).toBe("7");
  });

  it("chaque cron a un chemin unique", () => {
    const paths = crons.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
