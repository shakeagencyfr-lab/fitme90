import { describe, it, expect } from "vitest";
import { explainWarmup, bpmLabel } from "./warmup-guide";
import { karvonen } from "./fitness";

const zones = karvonen(40, 60).zones;

describe("échauffement expliqué", () => {
  it("un cardio d'échauffement se fait en Z1, avec la fourchette de pulsations du client", () => {
    const e = explainWarmup({ name: "Rameur léger", detail: "5 min" }, zones, "fr");
    expect(e.zone?.id).toBe("Z1");
    expect(e.zone?.range).toBe(zones[0].range);
    expect(e.how).toMatch(/parler/);
    expect(bpmLabel(e.zone!.range)).toMatch(/^\d+ à \d+ bpm$/);
  });

  it("lit la zone écrite dans le plan", () => {
    expect(explainWarmup({ name: "Elliptique", detail: "6 min Z1-Z2" }, zones).zone?.id).toBe("Z1");
    expect(explainWarmup({ name: "Vélo Assault", detail: "5 min zone 2" }, zones).zone?.id).toBe("Z2");
  });

  it("sans profil, annonce la zone sans pulsations", () => {
    const e = explainWarmup({ name: "Vélo sans impact", detail: "5 min" }, null);
    expect(e.zone).toEqual({ id: "Z1", name: "", range: "" });
  });

  it("détaille une mobilité par zone du corps", () => {
    expect(explainWarmup({ name: "Mobilité hanches", detail: "6 mouvements" }, zones).how).toMatch(/Cercles de hanche/);
    expect(explainWarmup({ name: "Mobilité épaules", detail: "6 mouvements" }, zones).how).toMatch(/rotations externes/i);
    expect(explainWarmup({ name: "Mobilité hanches et chevilles", detail: "" }, zones).how).toMatch(/cheville/);
    expect(explainWarmup({ name: "Mobilité dos", detail: "" }, zones, "en").how).toMatch(/Cat-cow/);
  });

  it("explique une activation et des montées en charge", () => {
    expect(explainWarmup({ name: "Montées en charge squat", detail: "3 séries légères" }, zones).how).toMatch(/moitié de la charge/);
    expect(explainWarmup({ name: "Activation fessiers", detail: "Pont fessier au sol, 2 x 15" }, zones).how).toMatch(/Pont fessier/);
  });

  it("laisse tel quel un item qu'il ne sait pas éclairer, sans inventer", () => {
    const e = explainWarmup({ name: "Respiration", detail: "1 min" }, zones);
    expect(e.how).toBe("");
    expect(e.zone).toBeNull();
  });
});
