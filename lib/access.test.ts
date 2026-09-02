import { describe, it, expect } from "vitest";
import { computeAccess, accessLabel, unpaidNextStep } from "./access";
import { PROGRAM_DAYS, GRACE_DAYS, programDaysForMonths } from "./config";

// Date de référence : le programme démarre le 1er (jour 1).
const start = "2026-01-01";
const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("computeAccess — durée par défaut (90 jours)", () => {
  it("non payé → not_paid, tout fermé", () => {
    const a = computeAccess(false, start, at("2026-01-10"));
    expect(a.phase).toBe("not_paid");
    expect(a.programDays).toBe(PROGRAM_DAYS);
    expect(a.coachEnabled).toBe(false);
  });

  it("payé sans date de début → not_started", () => {
    expect(computeAccess(true, null).phase).toBe("not_started");
  });

  it("jour 1 = actif, coach ouvert", () => {
    const a = computeAccess(true, start, at("2026-01-01"));
    expect(a.phase).toBe("active");
    expect(a.day).toBe(1);
    expect(a.coachEnabled).toBe(true);
    expect(a.daysUntilProgramEnd).toBe(90);
  });

  it("dernier jour actif (J90) puis grâce (J91)", () => {
    const j90 = computeAccess(true, start, at("2026-03-31")); // 90 jours après le 1er janv.
    expect(j90.day).toBe(90);
    expect(j90.phase).toBe("active");
    const j91 = computeAccess(true, start, at("2026-04-01"));
    expect(j91.phase).toBe("grace");
    expect(j91.coachEnabled).toBe(false);
    expect(j91.canLog).toBe(false);
  });

  it("après la grâce → ended", () => {
    const ended = computeAccess(true, start, at("2026-06-01"));
    expect(ended.phase).toBe("ended");
  });
});

describe("computeAccess — durée dynamique (offre du coach)", () => {
  it("offre 1 mois : programme = 30 jours", () => {
    const d30 = programDaysForMonths(1);
    const j30 = computeAccess(true, start, at("2026-01-30"), d30);
    expect(j30.programDays).toBe(30);
    expect(j30.day).toBe(30);
    expect(j30.phase).toBe("active");
    // J31 bascule en grâce.
    const j31 = computeAccess(true, start, at("2026-01-31"), d30);
    expect(j31.phase).toBe("grace");
  });

  it("offre 6 mois : programme = 180 jours, grâce = +14", () => {
    const d180 = programDaysForMonths(6);
    const active = computeAccess(true, start, at("2026-06-01"), d180);
    expect(active.programDays).toBe(180);
    expect(active.phase).toBe("active");
    expect(accessLabel(active)).toBe(`Jour ${active.day} sur 180`);
    // Fenêtre de grâce = programDays + GRACE_DAYS (jour 181 à 194).
    const graceEnd = computeAccess(true, start, at("2026-07-05"), d180);
    expect(graceEnd.phase).toBe("grace");
    expect(d180 + GRACE_DAYS).toBe(194);
  });
});

describe("unpaidNextStep", () => {
  it("envoie à la caisse quand le questionnaire est déjà rempli", () => {
    expect(unpaidNextStep(true)).toBe("/app/paiement");
  });

  it("envoie au questionnaire quand il n'existe pas encore", () => {
    expect(unpaidNextStep(false)).toBe("/questionnaire");
  });
});

describe("tutoriel : pas de plan consultable avant paiement", () => {
  it("ne rend pas le plan consultable tant que rien n'est payé", () => {
    // Le tutoriel est monté sur `planViewable` : sans ça il tournait à vide
    // pour un client non payant, puis se marquait « vu » définitivement.
    expect(computeAccess(false, null).planViewable).toBe(false);
    expect(computeAccess(false, "2026-09-01").planViewable).toBe(false);
  });

  it("ne le rend pas non plus consultable payé mais sans programme généré", () => {
    expect(computeAccess(true, null).planViewable).toBe(false);
  });

  it("le rend consultable dès que le programme tourne", () => {
    expect(computeAccess(true, new Date()).planViewable).toBe(true);
  });
});
