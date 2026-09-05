import { describe, it, expect } from "vitest";
import { realEmail, internalAddress, isInternalAddress, INTERNAL_EMAIL_DOMAIN } from "./internal-clients";

// Un compte interne porte une adresse technique que personne ne relève. Tout
// le danger tient en une phrase : si cette adresse était un jour prise pour
// une vraie, le client se retrouverait enfermé dehors, avec un compte dont les
// courriels partent vers un domaine sans boîte aux lettres.

describe("adresse technique d'un compte interne", () => {
  it("se reconnaît", () => {
    expect(isInternalAddress(internalAddress())).toBe(true);
    expect(isInternalAddress("marie@exemple.fr")).toBe(false);
    expect(isInternalAddress(null)).toBe(false);
    expect(isInternalAddress("")).toBe(false);
  });

  it("se reconnaît quelle que soit la casse", () => {
    expect(isInternalAddress(`INTERNE-ABC@${INTERNAL_EMAIL_DOMAIN.toUpperCase()}`)).toBe(true);
  });

  it("ne se répète pas d'un client à l'autre", () => {
    // Deux adhérents du même nom dans la même salle ne doivent pas se marcher
    // dessus, et le nom n'a rien à faire dans une adresse technique.
    const lot = new Set(Array.from({ length: 50 }, () => internalAddress()));
    expect(lot.size).toBe(50);
  });
});

describe("adresse réelle saisie par le coach", () => {
  it("accepte une adresse ordinaire et la range", () => {
    expect(realEmail("  Marie.Durand@Exemple.FR ")).toBe("marie.durand@exemple.fr");
  });

  it("refuse ce qui n'est pas une adresse", () => {
    expect(realEmail("")).toBeNull();
    expect(realEmail("marie")).toBeNull();
    expect(realEmail("marie@exemple")).toBeNull();
    expect(realEmail("marie @exemple.fr")).toBeNull();
    expect(realEmail("@exemple.fr")).toBeNull();
    expect(realEmail(`${"a".repeat(250)}@exemple.fr`)).toBeNull();
  });

  it("refuse l'adresse technique, même recopiée à la main", () => {
    // Le piège : un coach recopie l'adresse vue dans la console d'auth et croit
    // donner la main à son client. Il l'enverrait vers une boîte inexistante.
    expect(realEmail(internalAddress())).toBeNull();
    expect(realEmail(`  N'IMPORTE-QUOI@${INTERNAL_EMAIL_DOMAIN}  `)).toBeNull();
  });
});
