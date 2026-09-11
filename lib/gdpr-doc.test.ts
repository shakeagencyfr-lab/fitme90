import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DOC_END, DOC_START, registerMarkdown } from "./gdpr-doc";

// RGPD.md ne doit jamais mentir sur ce que l'application traite.
//
// Le registre de l'article 30 est un document qu'on sort en cas de contrôle :
// s'il décrit un état d'il y a six mois, il est pire qu'absent. Ce test le
// régénère et compare. `npm run rgpd` (UPDATE_DOCS=1) réécrit le fichier.

const CHEMIN = join(__dirname, "..", "RGPD.md");

describe("registre RGPD", () => {
  it("RGPD.md est à jour avec lib/gdpr.ts", () => {
    const attendu = registerMarkdown();
    const doc = readFileSync(CHEMIN, "utf8");
    const debut = doc.indexOf(DOC_START);
    const fin = doc.indexOf(DOC_END);
    expect(debut, "les marqueurs du registre ont disparu de RGPD.md").toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(debut);
    const actuel = doc.slice(debut, fin + DOC_END.length);

    if (process.env.UPDATE_DOCS === "1" && actuel !== attendu) {
      writeFileSync(CHEMIN, doc.slice(0, debut) + attendu + doc.slice(fin + DOC_END.length));
      return;
    }
    expect(actuel, "RGPD.md a pris du retard : lance `npm run rgpd`").toBe(attendu);
  });

  it("chaque table du registre porte une finalité et une durée lisibles", () => {
    const md = registerMarkdown();
    // Une cellule vide dans un registre est un trou qu'un contrôle verra.
    expect(md).not.toMatch(/\|\s*\|\s*\|/);
  });
});
