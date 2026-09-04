import { describe, it, expect } from "vitest";
import { adaptationsFromAnswers, buildBrief } from "./program";

/**
 * Contraintes physiques déclarées : du questionnaire jusqu'au prompt.
 *
 * Ce fil était coupé. Le bloc impératif du brief ne lisait que la clé
 * `adaptations`, écrite au seul endroit où un client signale une gêne au Coach
 * IA en cours de programme : pour un PREMIER programme, une épaule cochée au
 * questionnaire n'atteignait jamais la consigne. Elle arrivait au modèle noyée
 * parmi vingt lignes de profil, et un modèle pouvait écrire « aucune contrainte
 * n'a été déclarée » sans que rien ne l'en empêche.
 *
 * C'est une donnée de santé : une régression ici produit un programme dangereux
 * qui a l'air parfaitement normal. D'où des tests sur le fil entier.
 */

const brief = (answers: Record<string, unknown>) =>
  buildBrief({ answers, trainDays: ["LUN", "JEU"], equipment: ["Haltères"] });

describe("collecte des contraintes", () => {
  it("prend les pathologies articulaires cochées", () => {
    expect(adaptationsFromAnswers({ patho1: ["Épaule", "Genou"] })).toEqual([
      "pathologie articulaire déclarée : épaule",
      "pathologie articulaire déclarée : genou",
    ]);
  });

  it("prend les limitations de mobilité", () => {
    expect(adaptationsFromAnswers({ mobility: ["Chevilles"] })).toEqual([
      "limitation de mobilité : chevilles",
    ]);
  });

  it("prend une blessure passée en texte libre", () => {
    const r = adaptationsFromAnswers({ past_injuries: "Entorse cheville en 2022" });
    expect(r).toEqual(["blessure passée : Entorse cheville en 2022"]);
  });

  it("ignore « Aucune » et les réponses vides", () => {
    // Sans ça, chaque client sans problème recevrait une consigne d'adaptation
    // pour une contrainte inexistante, et le modèle inventerait un aménagement.
    const r = adaptationsFromAnswers({
      patho1: ["Aucune"],
      mobility: ["Aucune"],
      past_injuries: "  non  ",
    });
    expect(r).toEqual([]);
  });

  it("garde ce que le client a signalé au Coach IA en cours de route", () => {
    const r = adaptationsFromAnswers({ adaptations: ["Douleur au poignet depuis 3 jours"] });
    expect(r[0]).toBe("Douleur au poignet depuis 3 jours");
  });

  it("met le signalement récent avant les réponses du questionnaire", () => {
    // Une gêne apparue cette semaine prime sur une case cochée il y a 3 mois.
    const r = adaptationsFromAnswers({
      adaptations: ["Douleur vive au genou droit"],
      patho1: ["Épaule"],
    });
    expect(r[0]).toBe("Douleur vive au genou droit");
  });

  it("ne répète pas la même zone dite deux fois, et garde la plus grave", () => {
    // « Épaule » en pathologie et « Épaules » en mobilité désignent la même
    // zone ; répétée, la consigne se dilue. On garde la pathologie, qui appelle
    // l'adaptation la plus prudente.
    const r = adaptationsFromAnswers({ patho1: ["Épaule"], mobility: ["Épaules"] });
    expect(r).toEqual(["pathologie articulaire déclarée : épaule"]);
  });

  it("laisse coexister deux zones différentes", () => {
    const r = adaptationsFromAnswers({ patho1: ["Épaule"], mobility: ["Chevilles"] });
    expect(r).toHaveLength(2);
  });

  it("borne la liste pour ne pas noyer la consigne", () => {
    const r = adaptationsFromAnswers({
      adaptations: Array.from({ length: 20 }, (_, i) => `contrainte ${i}`),
    });
    expect(r.length).toBeLessThanOrEqual(8);
  });
});

describe("acheminement jusqu'au prompt", () => {
  it("fait apparaître une épaule cochée au questionnaire dans le brief", () => {
    // Le test qui aurait attrapé le trou : avant, ce cas ne produisait aucune
    // consigne, la case cochée restait une ligne de profil parmi d'autres.
    const t = brief({ patho1: ["Épaule"] });
    expect(t).toContain("CONTRAINTES PHYSIQUES DÉCLARÉES");
    expect(t).toContain("épaule");
  });

  it("exige les trois effets : avertissement, exercice, raison", () => {
    const t = brief({ mobility: ["Dos"] });
    expect(t).toContain('Le champ "warning" la NOMME');
    expect(t).toContain("Au moins UN exercice");
    expect(t).toContain('La "note" de cet exercice DIT la raison');
  });

  it("interdit explicitement de nier une contrainte déclarée", () => {
    // Le défaut observé en production sur un modèle : « aucune contrainte de
    // santé n'a été déclarée » alors que le client en avait signalé une.
    expect(brief({ patho1: ["Genou"] })).toContain("N'écris JAMAIS qu'aucune contrainte n'a été déclarée");
  });

  it("n'ajoute aucune consigne quand rien n'est déclaré", () => {
    // Un brief propre pour un client sans contrainte : pas de bloc inutile,
    // pas de tokens gaspillés, pas d'aménagement inventé.
    expect(brief({ patho1: ["Aucune"] })).not.toContain("CONTRAINTES PHYSIQUES");
  });
});
