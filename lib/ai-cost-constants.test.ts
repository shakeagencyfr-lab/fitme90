import { describe, it, expect } from "vitest";
import {
  estimateAiMonthlyCost,
  estimateAiMonthlyCredits,
  AI_COST_COACH_MSG_USD,
  AI_COST_ACTION_USD,
  AI_COST_MEMORY_USD,
  AI_COST_PROGRAM_USD,
} from "./config";

// Ces constantes alimentent ce que le coach et le revendeur voient dans leur
// dashboard, et la promesse commerciale des landings. Elles sont calées sur la
// conso RÉELLE mesurée dans ai_calls : ces tests bloquent une dérive silencieuse.
describe("constantes de coût IA", () => {
  it("colle à la mesure : environ 1,1 $ par client actif et par mois", () => {
    // Usage réaliste : 8 messages par jour, 26 jours actifs, plus la mémoire.
    // Les recettes et les alternatives ne comptent plus : elles sont calculées.
    const { realMonth } = estimateAiMonthlyCost(0);
    expect(realMonth).toBeGreaterThan(0.9);
    expect(realMonth).toBeLessThan(1.3);
  });

  it("tient la promesse de 1 à 2 € affichée sur les landings", () => {
    const eur = estimateAiMonthlyCost(0).realMonth * 0.92;
    expect(eur).toBeGreaterThan(0.5);
    expect(eur).toBeLessThan(2);
  });

  it("garde une borne haute prudente, au dessus de l'usage réaliste", () => {
    const { realMonth, ceilingMonth } = estimateAiMonthlyCost(60);
    expect(ceilingMonth).not.toBeNull();
    expect(ceilingMonth!).toBeGreaterThan(realMonth);
  });

  it("laisse la borne haute ouverte quand le plafond est illimité", () => {
    expect(estimateAiMonthlyCost(0).ceilingMonth).toBeNull();
    expect(estimateAiMonthlyCredits(0).ceilingMonth).toBeNull();
  });

  it("compte la mémoire, qui n'est débitée à aucun crédit", () => {
    // Sans elle, l'estimation sous-évaluerait la charge réelle du coach.
    expect(AI_COST_MEMORY_USD).toBeGreaterThan(0);
    const avecMemoire = estimateAiMonthlyCost(0).realMonth;
    const sansMemoire = 8 * AI_COST_COACH_MSG_USD * 26;
    expect(avecMemoire).toBeGreaterThan(sansMemoire);
  });

  it("aligne le crédit action sur la seule action facturée qui reste", () => {
    expect(AI_COST_ACTION_USD).toBe(AI_COST_COACH_MSG_USD);
  });

  it("colle à la génération mesurée, et reste très loin du tarif Opus", () => {
    // Mesure du 5 septembre 2026 : 12 110 jetons d'entrée, 26 788 de sortie.
    const entree = 12110, sortie = 26788;
    const surSonnet = (entree * 2 + sortie * 10) / 1e6;   // 0,2921 $
    const surOpus = (entree * 5 + sortie * 25) / 1e6;     // 0,7303 $
    // La constante majore la mesure sans la dépasser d'un facteur.
    expect(AI_COST_PROGRAM_USD).toBeGreaterThanOrEqual(surSonnet);
    expect(AI_COST_PROGRAM_USD).toBeLessThan(surSonnet * 1.3);
    // Et elle reste sous la moitié de ce que la même génération aurait coûté
    // sur Opus : c'est ça, l'économie de la bascule.
    expect(AI_COST_PROGRAM_USD).toBeLessThan(surOpus / 2);
  });

  it("compte les crédits indépendamment des tarifs", () => {
    // 8 messages par jour sur 26 jours = 208 crédits.
    expect(estimateAiMonthlyCredits(0).realMonth).toBe(208);
  });
});
