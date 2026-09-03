import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PUSH_WINDOWS, windowInstant, nextWindow, isServedInstant } from "./push-windows";

// Le formulaire ne doit proposer QUE des créneaux que le dispatcher sert
// réellement. La seule façon de le garantir dans la durée est de comparer
// cette liste au fichier qui pilote les crons.
function cronWindows(): { hour: number; minute: number }[] {
  const cfg = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  return (cfg.crons ?? []).map((c: { schedule: string }) => {
    const [m, h] = c.schedule.trim().split(/\s+/);
    return { hour: Number(h), minute: Number(m) };
  });
}

describe("créneaux d'envoi", () => {
  it("correspondent exactement aux crons de vercel.json", () => {
    const key = (w: { hour: number; minute: number }) => `${w.hour}:${w.minute}`;
    expect(PUSH_WINDOWS.map(key).sort()).toEqual(cronWindows().map(key).sort());
  });

  it("chaque créneau a un rôle nommé, pour situer l'heure", () => {
    for (const w of PUSH_WINDOWS) expect(w.role.trim()).not.toBe("");
  });
});

describe("windowInstant", () => {
  it("place l'heure en UTC, pas dans le fuseau local", () => {
    // Construire la date localement décalerait l'envoi d'une à deux heures
    // selon la saison : c'est exactement le bug que ce module corrige.
    const at = windowInstant("2026-07-14", { hour: 18, minute: 0, role: "Soir" })!;
    expect(at.toISOString()).toBe("2026-07-14T18:00:00.000Z");
  });

  it("refuse une date mal formée", () => {
    for (const bad of ["", "14/07/2026", "2026-7-4", "hier"]) {
      expect(windowInstant(bad, PUSH_WINDOWS[0]), bad).toBeNull();
    }
  });
});

describe("nextWindow", () => {
  it("saute les créneaux déjà passés dans la journée", () => {
    // 12 h UTC : les créneaux de 2 h 30, 6 h et 7 h sont passés, reste 18 h.
    const r = nextWindow(new Date("2026-03-10T12:00:00Z"))!;
    expect(r.date).toBe("2026-03-10");
    expect(r.window.hour).toBe(18);
  });

  it("bascule au lendemain quand la journée est finie", () => {
    const r = nextWindow(new Date("2026-03-10T23:00:00Z"))!;
    expect(r.date).toBe("2026-03-11");
    expect(r.window.hour).toBe(2);
  });

  it("ne renvoie jamais un instant déjà passé", () => {
    for (const iso of ["2026-01-01T00:00:00Z", "2026-06-15T06:00:00Z", "2026-12-31T18:00:01Z"]) {
      const from = new Date(iso);
      const r = nextWindow(from)!;
      expect(windowInstant(r.date, r.window)!.getTime(), iso).toBeGreaterThan(from.getTime());
    }
  });
});

describe("isServedInstant", () => {
  it("accepte les quatre créneaux", () => {
    for (const w of PUSH_WINDOWS) {
      expect(isServedInstant(windowInstant("2026-05-20", w)!), `${w.hour}:${w.minute}`).toBe(true);
    }
  });

  it("refuse une heure choisie à la main", () => {
    // Le garde-fou du serveur : le formulaire ne propose que la liste, mais un
    // POST forgé pourrait viser une heure qui ne partirait jamais à l'heure dite.
    for (const iso of ["2026-05-20T21:15:00Z", "2026-05-20T18:01:00Z", "2026-05-20T02:00:00Z"]) {
      expect(isServedInstant(new Date(iso)), iso).toBe(false);
    }
  });
});
