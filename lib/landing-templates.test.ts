import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LANDING_TEMPLATES, PREMIUM_TEMPLATES, asLandingTemplate } from "./landing-templates";

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

// Garde-fou : un template ajouté au registre mais oublié dans l'aiguillage
// rendait Onyx à la place, silencieusement. Ces tests échouent tant que le
// nouveau template n'est pas réellement atteignable et sélectionnable.
describe("câblage des templates de landing", () => {
  const page = read("app/c/[slug]/page.tsx");
  const preview = read("app/dev/landing/[template]/page.tsx");
  const selector = read("components/template-selector.tsx");

  it("chaque template du registre est rendu par la page publique", () => {
    for (const t of LANDING_TEMPLATES) {
      if (t === "onyx") continue; // Onyx est le rendu par défaut.
      expect(page, t).toContain(`=== "${t}"`);
    }
  });

  it("chaque template est rendu par l'aperçu de développement", () => {
    for (const t of LANDING_TEMPLATES) {
      if (t === "onyx") continue;
      expect(preview, t).toContain(`case "${t}":`);
    }
  });

  it("chaque template est proposé dans le sélecteur", () => {
    for (const t of LANDING_TEMPLATES) {
      expect(selector, t).toContain(`key: "${t}"`);
    }
  });

  it("les templates premium font partie du registre", () => {
    for (const t of PREMIUM_TEMPLATES) expect(LANDING_TEMPLATES).toContain(t);
  });

  it("asLandingTemplate accepte les nouveaux templates et rejette le reste", () => {
    expect(asLandingTemplate("kinetic")).toBe("kinetic");
    expect(asLandingTemplate("aurora")).toBe("aurora");
    expect(asLandingTemplate("nope")).toBe("onyx");
  });
});
