import { describe, it, expect } from "vitest";
import { keyOwnerFor, whoPays, supplyDisplay, type SupplyNode, type SupplyFacts } from "./ai-supply";

// La règle a une seule formulation : le FOURNISSEUR décide. Ces tests la
// verrouillent sur les deux faces qui doivent toujours coïncider, la clé qui
// tourne et le portefeuille qui est débité. Les voir diverger avait produit
// deux écrans qui décrivaient le même compte autrement.

const noeud = (o: Partial<SupplyNode> & { id: string }): SupplyNode => ({
  parentId: null,
  aiMode: "byok",
  aiSupply: "byok",
  hasOwnKey: false,
  ...o,
});

const reseau = (...n: SupplyNode[]) => new Map(n.map((x) => [x.id, x]));

describe("keyOwnerFor", () => {
  it("un coach autonome tourne sur sa propre clé", () => {
    const m = reseau(
      noeud({ id: "plateforme", hasOwnKey: true }),
      noeud({ id: "revendeur", parentId: "plateforme", aiMode: "byok" }),
      noeud({ id: "coach", parentId: "revendeur", hasOwnKey: true }),
    );
    expect(keyOwnerFor("coach", m)).toBe("coach");
  });

  it("un coach sans clé et sans fournisseur n'a aucune clé", () => {
    const m = reseau(
      noeud({ id: "revendeur", aiMode: "byok" }),
      noeud({ id: "coach", parentId: "revendeur" }),
    );
    expect(keyOwnerFor("coach", m)).toBeNull();
  });

  it("un revendeur fournisseur avec sa clé fait tourner ses coachs dessus", () => {
    const m = reseau(
      noeud({ id: "revendeur", aiMode: "provider", aiSupply: "byok", hasOwnKey: true }),
      noeud({ id: "coach", parentId: "revendeur" }),
    );
    expect(keyOwnerFor("coach", m)).toBe("revendeur");
  });

  it("un revendeur en crédits plateforme fait tourner ses coachs sur la clé plateforme", () => {
    const m = reseau(
      noeud({ id: "plateforme", hasOwnKey: true }),
      noeud({ id: "revendeur", parentId: "plateforme", aiMode: "provider", aiSupply: "platform_credits" }),
      noeud({ id: "coach", parentId: "revendeur" }),
    );
    expect(keyOwnerFor("coach", m)).toBe("plateforme");
  });

  it("la clé d'un coach reste DORMANTE quand son revendeur fournit", () => {
    // Le cœur de la règle : sans ça, n'importe quel coach pouvait coller une
    // clé et cesser de consommer les crédits de son revendeur.
    const m = reseau(
      noeud({ id: "plateforme", hasOwnKey: true }),
      noeud({ id: "revendeur", parentId: "plateforme", aiMode: "provider", aiSupply: "platform_credits" }),
      noeud({ id: "coach", parentId: "revendeur", hasOwnKey: true }),
    );
    expect(keyOwnerFor("coach", m)).toBe("plateforme");
  });

  it("un fournisseur sans clé ne reporte rien sur la plateforme", () => {
    // Refuser l'appel vaut mieux que facturer quelqu'un qui n'a rien demandé.
    const m = reseau(
      noeud({ id: "plateforme", hasOwnKey: true }),
      noeud({ id: "revendeur", parentId: "plateforme", aiMode: "provider", aiSupply: "byok", hasOwnKey: false }),
      noeud({ id: "coach", parentId: "revendeur", hasOwnKey: true }),
    );
    expect(keyOwnerFor("coach", m)).toBeNull();
  });

  it("ne boucle pas sur une parenté circulaire en base", () => {
    const m = reseau(
      noeud({ id: "a", parentId: "b", aiMode: "provider", aiSupply: "platform_credits" }),
      noeud({ id: "b", parentId: "a", aiMode: "provider", aiSupply: "platform_credits" }),
    );
    expect(keyOwnerFor("a", m)).toBeNull();
  });
});

describe("whoPays", () => {
  const faits = (o: Partial<SupplyFacts> = {}): SupplyFacts => ({
    resellerSupplies: true,
    model: "credits",
    supply: "platform_credits",
    ...o,
  });

  it("débite les deux étages quand le revendeur fournit et achète ses crédits", () => {
    expect(whoPays(faits())).toEqual({ coach: true, reseller: true });
  });

  it("ne débite personne quand le revendeur ne fournit pas l'IA", () => {
    // Coachs autonomes : chacun règle Anthropic, aucun portefeuille ne bouge.
    expect(whoPays(faits({ resellerSupplies: false }))).toEqual({ coach: false, reseller: false });
  });

  it("revendeur fournisseur avec sa propre clé : le coach paie en crédits, lui en dollars", () => {
    expect(whoPays(faits({ supply: "byok" }))).toEqual({ coach: true, reseller: false });
  });

  it("revendeur en abonnement : il porte seul la consommation plateforme", () => {
    expect(whoPays(faits({ model: "subscription" }))).toEqual({ coach: false, reseller: true });
  });

  it("ne débite jamais un étage sans contrepartie d'IA fournie", () => {
    for (const resellerSupplies of [true, false]) {
      for (const model of ["subscription", "credits"] as const) {
        for (const supply of ["byok", "platform_credits"] as const) {
          const r = whoPays({ resellerSupplies, model, supply });
          if (r.coach || r.reseller) expect(resellerSupplies).toBe(true);
          if (r.reseller) expect(supply).toBe("platform_credits");
          if (r.coach) expect(model).toBe("credits");
        }
      }
    }
  });
});

describe("supplyDisplay", () => {
  it("dit « crédits » quand le compte achète et dépense un solde", () => {
    expect(supplyDisplay({ resellerSupplies: true, model: "credits", supply: "byok" })).toBe("credits");
  });

  it("dit « fourni » quand son fournisseur porte le coût sans solde à dépenser", () => {
    expect(supplyDisplay({ resellerSupplies: true, model: "subscription", supply: "byok" })).toBe("supplied");
  });

  it("dit « clé perso » quand personne ne le fournit", () => {
    expect(supplyDisplay({ resellerSupplies: false, model: "credits", supply: "byok" })).toBe("own_key");
  });

  it("ne montre un solde que là où whoPays débite le compte", () => {
    for (const resellerSupplies of [true, false]) {
      for (const model of ["subscription", "credits"] as const) {
        const f: SupplyFacts = { resellerSupplies, model, supply: "byok" };
        expect(supplyDisplay(f) === "credits").toBe(whoPays(f).coach);
      }
    }
  });
});
