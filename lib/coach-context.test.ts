import { describe, it, expect } from "vitest";
import { coachPlanView, logsDigest } from "./coach-context";
import type { Plan, Session } from "./program";

function session(title: string): Session {
  return {
    cycleLabel: "C1",
    title,
    meta: "",
    restSec: 90,
    warmup: [],
    exercises: [{ name: "Développé couché", sets: "4", reps: "8", note: "" }],
  } as unknown as Session;
}

function plan(): Plan {
  return {
    summary: "Résumé",
    weekPlan: [{ day: "LUN", name: "Haut", dur: "50 min", rest: false }],
    nutrition: { kcal: "2500", protein: "150", carbs: "260", fat: "70", tags: [], meals: [] },
    warning: "",
    cycles: [
      { label: "Cycle 1", name: "Fondations", weeks: "S1-S4", body: "Adaptation", sessions: [session("A1")] },
      { label: "Cycle 2", name: "Volume", weeks: "S5-S8", body: "Volume", sessions: [session("A2")] },
      { label: "Cycle 3", name: "Intensité", weeks: "S9-S12", body: "Intensité", sessions: [session("A3")] },
    ],
    // Doublons de compat historique : ne doivent PAS partir vers le coach.
    sessions: [session("legacy")],
    session: session("legacy"),
  } as unknown as Plan;
}

describe("coachPlanView", () => {
  it("ne détaille que le cycle en cours et garde les en-têtes des autres", () => {
    const view = coachPlanView(plan(), 40) as {
      cycleEnCours: number;
      cycles: { label: string; sessions?: unknown[] }[];
    };
    expect(view.cycleEnCours).toBe(2); // jour 40 => 2e cycle de 30 jours
    expect(view.cycles).toHaveLength(3);
    expect(view.cycles[1].sessions).toHaveLength(1); // cycle courant détaillé
    expect(view.cycles[0].sessions).toBeUndefined(); // en-tête seul
    expect(view.cycles[2].sessions).toBeUndefined();
    expect(view.cycles[2].label).toBe("Cycle 3"); // la progression reste lisible
  });

  it("retire les clés de compat historique sessions et session", () => {
    const view = coachPlanView(plan(), 1) as Record<string, unknown>;
    expect(view.session).toBeUndefined();
    expect(JSON.stringify(view)).not.toContain("legacy");
  });

  it("réduit fortement le volume envoyé", () => {
    const full = JSON.stringify(plan()).length;
    const trimmed = JSON.stringify(coachPlanView(plan(), 1)).length;
    expect(trimmed).toBeLessThan(full * 0.75);
  });

  it("retombe sur les séances non cyclées pour un vieux plan sans cycles", () => {
    const old = { ...plan(), cycles: [] } as unknown as Plan;
    const view = coachPlanView(old, 1) as { seances?: unknown[] };
    expect(view.seances).toHaveLength(1);
  });

  it("renvoie un objet vide sans programme", () => {
    expect(coachPlanView(null, 1)).toEqual({});
  });
});

describe("logsDigest", () => {
  it("groupe les séries identiques en conservant toutes les charges", () => {
    const out = logsDigest([
      {
        day: 12,
        volume: 4200,
        sets_done: 3,
        entries: [
          { exercise: "Développé couché", kg: 60, reps: 8 },
          { exercise: "Développé couché", kg: 60, reps: 8 },
          { exercise: "Développé couché", kg: 62, reps: 6 },
        ],
      },
    ]);
    expect(out).toContain("J12");
    expect(out).toContain("volume 4200");
    expect(out).toContain("2x(60kg x8)");
    expect(out).toContain("62kg x6"); // la charge la plus lourde reste lisible
  });

  it("est plus compact que le JSON brut équivalent", () => {
    const entries = Array.from({ length: 12 }, () => ({ exercise: "Squat", kg: 80, reps: 5 }));
    const logs = [{ day: 5, volume: 4800, sets_done: 12, entries }];
    expect(logsDigest(logs).length).toBeLessThan(JSON.stringify(logs).length / 2);
  });

  it("marque le cardio et gère l'absence de séance", () => {
    expect(logsDigest([{ day: 3, volume: null, sets_done: null, entries: [{ exercise: "Vélo", kg: null, reps: null, cardio: true }] }])).toContain("cardio");
    expect(logsDigest([])).toContain("Aucune séance");
  });
});
