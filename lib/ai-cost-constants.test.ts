import { describe, it, expect } from "vitest";
import {
  estimateAiMonthlyCost,
  estimateAiMonthlyCredits,
  AI_COST_COACH_MSG_USD,
  AI_COST_ACTION_USD,
  AI_COST_MEMORY_USD,
  AI_COST_PROGRAM_USD,
  AI_COST_GENERATION_USD,
  AI_COST_GYM_PHOTOS_USD,
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

  it("colle à la génération mesurée, au tarif Opus", () => {
    // Jetons mesurés le 5 septembre 2026 : 12 110 en entrée, 26 788 en sortie.
    // La génération tourne sur Opus 5 ($5 / $25 le million) : la qualité du
    // programme prime sur l'économie que Sonnet permettait.
    const entree = 12110, sortie = 26788;
    const surOpus = (entree * 5 + sortie * 25) / 1e6; // 0,7303 $
    // La constante majore la mesure sans la dépasser d'un facteur.
    expect(AI_COST_GENERATION_USD).toBeGreaterThanOrEqual(surOpus);
    expect(AI_COST_GENERATION_USD).toBeLessThan(surOpus * 1.3);
  });

  it("chiffre l'analyse des photos de salle sur sa mesure", () => {
    // Mesure du 5 septembre 2026, un lot de photos sur Haiku 4.5 (vision) :
    // 6 631 jetons d'entrée, 864 de sortie.
    const mesure = (6631 * 1 + 864 * 5) / 1e6; // 0,0110 $
    expect(AI_COST_GYM_PHOTOS_USD).toBeGreaterThanOrEqual(mesure);
    expect(AI_COST_GYM_PHOTOS_USD).toBeLessThan(mesure * 1.3);
  });

  it("compte les photos de salle dans le coût d'un programme livré", () => {
    // Un client n'a pas son programme sans que sa salle ait été analysée : le
    // coût du programme doit porter les deux appels, sinon la marge d'une
    // génération vendue en crédits est flatteuse d'un poste entier.
    expect(AI_COST_PROGRAM_USD).toBeGreaterThanOrEqual(
      AI_COST_GENERATION_USD + AI_COST_GYM_PHOTOS_USD,
    );
    expect(AI_COST_PROGRAM_USD).toBeGreaterThan(AI_COST_GENERATION_USD);
  });

  it("majore le message mesuré, écriture de cache amortie", () => {
    // Session réelle du 5 septembre 2026 : neuf messages, une écriture de
    // cache (0,0164 $) et huit lectures (0,0023 $ en moyenne).
    const session = (0.01642 + 0.00193 + 0.00254 + 0.00189 + 0.00205 + 0.00207 + 0.00249 + 0.00228 + 0.00291) / 9;
    expect(AI_COST_COACH_MSG_USD).toBeGreaterThanOrEqual(session);
    expect(AI_COST_COACH_MSG_USD).toBeLessThan(session * 1.5);
  });

  it("compte les crédits indépendamment des tarifs", () => {
    // 8 messages par jour sur 26 jours = 208 crédits.
    expect(estimateAiMonthlyCredits(0).realMonth).toBe(208);
  });
});
