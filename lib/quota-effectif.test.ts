import { describe, it, expect } from "vitest";
import { tighter } from "./coach-ai-budget";

/**
 * Le quota qu'un client reçoit vraiment.
 *
 * Le coach règle un nombre sur son plan, son revendeur en impose un autre
 * quand c'est lui qui fournit l'IA, et le client obtient le plus serré des
 * deux. Cette règle est la cause d'un « j'ai augmenté le quota et rien n'a
 * changé chez mon client » que rien n'expliquait : ces tests la fixent, et
 * l'écran des plans l'affiche désormais.
 *
 * Le zéro veut dire ILLIMITÉ des deux côtés, ce qui inverse le sens de la
 * comparaison : c'est le piège que ces tests gardent fermé.
 */
describe("quota effectif = le plus serré des deux", () => {
  it("garde le plus petit quand les deux sont bornés", () => {
    expect(tighter(30, 15)).toBe(15);
    expect(tighter(15, 30)).toBe(15);
    expect(tighter(20, 20)).toBe(20);
  });

  it("laisse le plafond du revendeur décider quand le coach dit illimité", () => {
    // 0 côté coach = illimité : c'est le revendeur qui borne.
    expect(tighter(0, 15)).toBe(15);
  });

  it("laisse le coach décider quand le revendeur ne plafonne pas", () => {
    expect(tighter(30, 0)).toBe(30);
  });

  it("reste illimité quand personne ne borne", () => {
    expect(tighter(0, 0)).toBe(0);
  });

  it("ne rend jamais un nombre négatif", () => {
    // Une valeur négative en base ne doit pas se transformer en quota négatif,
    // qui refuserait tout message sans le dire.
    expect(tighter(-5, 15)).toBe(15);
    expect(tighter(30, -1)).toBe(30);
  });
});
