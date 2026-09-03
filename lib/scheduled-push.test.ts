import { describe, it, expect } from "vitest";
import notify from "../vercel.json";

// Le bug d'origine : /api/cron/notify ne tourne qu'une fois par jour à 07:00,
// donc une notification programmée à 20 h partait le lendemain matin.
//
// La première correction visait « au moins toutes les heures » et ce test
// l'exigeait. C'était faux : le plan Hobby de Vercel n'accepte QUE des crons
// quotidiens, et une expression horaire fait échouer le DÉPLOIEMENT entier.
// La cadence exigible se limite donc à : plusieurs fenêtres réparties dans la
// journée, obtenues en faisant vider la file par chacun des crons.
// La contrainte Hobby elle-même est verrouillée dans lib/cron-schedule.test.ts.
const crons = (notify as { crons: { path: string; schedule: string }[] }).crons;

function scheduleOf(path: string): string | undefined {
  return crons.find((c) => c.path === path)?.schedule;
}

describe("cadence des crons", () => {
  it("le dispatcher des notifications programmées existe", () => {
    expect(scheduleOf("/api/cron/push")).toBeDefined();
  });

  it("il tourne le soir, pour ne pas laisser une notification du soir dormir", () => {
    const [, hour] = scheduleOf("/api/cron/push")!.split(" ");
    expect(Number(hour)).toBeGreaterThanOrEqual(12);
  });

  it("la file est vidée par plusieurs fenêtres réparties dans la journée", () => {
    // Un seul passage quotidien ferait attendre une notification jusqu'à 24 h.
    const heures = [...new Set(crons.map((c) => Number(c.schedule.split(" ")[1])))].sort((a, b) => a - b);
    expect(heures.length).toBeGreaterThanOrEqual(4);
    // Et le plus grand trou entre deux passages consécutifs reste raisonnable.
    const trous = heures.map((h, i) => (i === 0 ? h + 24 - heures[heures.length - 1] : h - heures[i - 1]));
    expect(Math.max(...trous)).toBeLessThanOrEqual(12);
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
