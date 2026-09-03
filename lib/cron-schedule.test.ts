import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Le plan Hobby de Vercel n'accepte QUE des crons quotidiens. Une expression
// plus fréquente ne dégrade pas le cron : elle fait ÉCHOUER LE DÉPLOIEMENT
// ENTIER, avec « Deployment failed. » posé sur le commit et aucune entrée
// créée dans la liste des déploiements. Un « 0 * * * * » ajouté ici a bloqué
// trois PR d'affilée sans que rien ne le signale, d'où ce test.

/** Vrai si l'expression peut se déclencher plus d'une fois par jour. */
export function runsMoreThanDaily(schedule: string): boolean {
  const f = schedule.trim().split(/\s+/);
  if (f.length !== 5) return true; // expression illisible : on refuse
  const fixed = (v: string) => /^\d+$/.test(v);
  // Seuls la minute et l'heure décident de la fréquence dans une journée. Les
  // trois champs de date ne font que sauter des jours, jamais en ajouter.
  return !(fixed(f[0]) && fixed(f[1]));
}

interface Cron {
  path: string;
  schedule: string;
}

function crons(): Cron[] {
  const cfg = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  return (cfg.crons ?? []) as Cron[];
}

describe("crons vercel.json", () => {
  it("aucun cron ne tourne plus d'une fois par jour (contrainte Hobby)", () => {
    const coupables = crons().filter((c) => runsMoreThanDaily(c.schedule));
    expect(coupables).toEqual([]);
  });

  it("chaque cron pointe une route qui existe", () => {
    for (const c of crons()) {
      const url = new URL(`../app${c.path}/route.ts`, import.meta.url);
      expect(() => readFileSync(url, "utf8"), c.path).not.toThrow();
    }
  });

  it("runsMoreThanDaily reconnaît les expressions interdites", () => {
    for (const s of ["0 * * * *", "*/30 * * * *", "0 */4 * * *", "* * * * *", "0,30 1 * * *", "0 1-5 * * *"]) {
      expect(runsMoreThanDaily(s), s).toBe(true);
    }
  });

  it("runsMoreThanDaily laisse passer les expressions quotidiennes ou moins", () => {
    for (const s of ["0 7 * * *", "30 2 * * *", "0 18 * * *", "0 3 * * 1", "15 4 1 * *"]) {
      expect(runsMoreThanDaily(s), s).toBe(false);
    }
  });
});
