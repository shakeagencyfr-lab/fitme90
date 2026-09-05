import { describe, it, expect } from "vitest";
import { clientDisplayName } from "./display-name";

describe("nom affiché d'un client", () => {
  it("préfère le prénom", () => {
    expect(clientDisplayName("Sebastien", "x@y.fr")).toBe("Sebastien");
    expect(clientDisplayName("  Léa ", null)).toBe("Léa");
  });
  it("se replie sur la partie locale de l'e-mail, jamais sur un point", () => {
    expect(clientDisplayName(null, "ollivierlaetizia@gmail.com")).toBe("ollivierlaetizia");
    expect(clientDisplayName("", "a@b.c")).toBe("a");
  });
  it("dit « Client » quand il n'y a rien", () => {
    expect(clientDisplayName(null, null)).toBe("Client");
    expect(clientDisplayName(null, "@x")).toBe("Client");
    expect(clientDisplayName(null, "", "Compte")).toBe("Compte");
  });
});
