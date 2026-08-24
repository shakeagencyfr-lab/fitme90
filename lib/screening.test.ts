import { describe, it, expect } from "vitest";
import { screen } from "./screening";

describe("screen — exclusion médicale", () => {
  it("laisse passer un profil en bonne santé", () => {
    const r = screen({
      patho1: ["Aucune"],
      patho2: ["Aucune"],
      meds: "Non",
      pregnancy: "Non concerné",
    });
    expect(r.hold).toBe(false);
    expect(r.reasons).toHaveLength(0);
  });

  it("bloque sur une pathologie générale (diabète, hypertension…)", () => {
    expect(screen({ patho2: ["Diabète type 2"] }).hold).toBe(true);
    expect(screen({ patho2: ["Hypertension", "Aucune"] }).hold).toBe(true);
  });

  it("bloque sur une hernie discale mais pas sur une gêne articulaire simple", () => {
    expect(screen({ patho1: ["Hernie discale"] }).hold).toBe(true);
    expect(screen({ patho1: ["Genou", "Épaule"] }).hold).toBe(false);
  });

  it("bloque en cas de grossesse ou post-partum récent", () => {
    expect(screen({ pregnancy: "Enceinte" }).hold).toBe(true);
    expect(screen({ pregnancy: "Post-partum < 6 mois" }).hold).toBe(true);
    expect(screen({ pregnancy: "Post-partum > 6 mois" }).hold).toBe(false);
    expect(screen({ pregnancy: "Non concerné" }).hold).toBe(false);
  });

  it("bloque si un traitement médical est déclaré, ignore les réponses négatives", () => {
    expect(screen({ meds: "Bêtabloquants" }).hold).toBe(true);
    expect(screen({ meds: "aucun" }).hold).toBe(false);
    expect(screen({ meds: "  " }).hold).toBe(false);
    expect(screen({ meds: "-" }).hold).toBe(false);
  });

  it("cumule les raisons", () => {
    const r = screen({
      patho2: ["Asthme"],
      pregnancy: "Enceinte",
      meds: "Ventoline",
    });
    expect(r.hold).toBe(true);
    expect(r.reasons.length).toBe(3);
  });
});
