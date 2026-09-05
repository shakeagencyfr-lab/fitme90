import { describe, it, expect } from "vitest";
import { priceFor, costParts, formatUsdPrecise } from "./ai-cost";

// Depuis que le journal enregistre le modèle SERVI et non le modèle configuré,
// la table porte des identifiants datés. Ces tests existent parce que la table
// de tarifs, à correspondance exacte, retombait alors sur le tarif par défaut
// (Opus) : un message Haiku s'affichait cinq fois trop cher.

describe("tarif d'un modèle", () => {
  it("reconnaît l'alias tel qu'il est configuré", () => {
    expect(priceFor("claude-haiku-4-5")).toEqual({ in: 1, out: 5 });
    expect(priceFor("claude-sonnet-5")).toEqual({ in: 2, out: 10 });
  });

  it("reconnaît l'identifiant daté que renvoie l'API", () => {
    expect(priceFor("claude-haiku-4-5-20251001")).toEqual({ in: 1, out: 5 });
    expect(priceFor("claude-sonnet-5-20260115")).toEqual({ in: 2, out: 10 });
    expect(priceFor("claude-opus-5-20260401")).toEqual({ in: 5, out: 25 });
  });

  it("ne confond pas deux générations d'une même famille", () => {
    // Sonnet 4.6 coûte 3/15, Sonnet 5 coûte 2/10 : un préfixe trop gourmand
    // ferait payer l'un au prix de l'autre.
    expect(priceFor("claude-sonnet-4-6-20260210")).toEqual({ in: 3, out: 15 });
    expect(priceFor("claude-haiku-4-5")).not.toEqual(priceFor("claude-opus-4-6"));
  });

  it("retient l'alias le plus long, pas le premier venu", () => {
    // « claude-opus-4-8 » et « claude-opus-4-7 » se ressemblent : c'est la
    // longueur du préfixe qui départage, pas l'ordre de la table.
    expect(priceFor("claude-opus-4-8-20260301")).toEqual({ in: 5, out: 25 });
  });

  it("tarife un modèle inconnu au plus cher, jamais au moins cher", () => {
    // Une estimation qui dépasse se remarque et se corrige. Une estimation qui
    // minore passe inaperçue jusqu'à la facture.
    expect(priceFor("claude-inconnu-9")).toEqual({ in: 5, out: 25 });
  });
});

describe("coût d'une ligne", () => {
  it("facture un appel Haiku daté au prix de Haiku", () => {
    const r = {
      user_id: "u",
      route: "coach",
      model: "claude-haiku-4-5-20251001",
      input_tokens: 1_000_000,
      output_tokens: 0,
      cache_read_tokens: 0,
      cache_write_tokens: 0,
      cache_write_1h_tokens: 0,
    };
    expect(costParts(r).total).toBeCloseTo(1, 10);
  });
});

describe("affichage du montant", () => {
  it("garde quatre décimales sous le dollar", () => {
    // Un message de chat coûte quelques millièmes : arrondi au centime, il
    // s'afficherait « $0.00 » et le journal deviendrait illisible.
    expect(formatUsdPrecise(0.0037)).toBe("$0.0037");
    expect(formatUsdPrecise(0.4859)).toBe("$0.4859");
  });

  it("repasse au centime au-delà du dollar", () => {
    expect(formatUsdPrecise(12.3456)).toBe("$12.35");
  });
});
