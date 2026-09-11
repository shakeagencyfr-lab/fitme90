import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { RESERVED_PATH_SEGMENTS, isRewritablePathSegment } from "./config";

// Le proxy réécrit `/<segment>` vers la landing du coach `/c/<segment>` dès que
// le segment n'est pas réservé. Une route de l'app oubliée dans la liste devient
// donc un 404 silencieux : c'est ce qui est arrivé à /plan-pdf, dont le bouton
// « Exporter mon plan en PDF » ne menait nulle part.
describe("segments de chemin réservés", () => {
  const appDir = join(process.cwd(), "app");

  /**
   * Toutes les URL de premier niveau, groupes de routes COMPRIS.
   *
   * La première version ne lisait que les dossiers directs de `app/`. Or un
   * groupe entre parenthèses ne crée pas de segment d'URL : `app/(legal)/cgv`
   * répond bien sur `/cgv`. Ses enfants étaient donc invisibles pour ce test,
   * et c'est exactement par là que /sous-traitance est passé, servi en 404
   * parce que le proxy le prenait pour le nom d'un coach.
   */
  function urlsDePremierNiveau(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => {
        // Un groupe de routes est transparent dans l'URL : on descend dedans.
        if (d.name.startsWith("(")) return urlsDePremierNiveau(join(dir, d.name));
        if (d.name.startsWith("[") || d.name.startsWith("_")) return [];
        const chemin = join(dir, d.name);
        const sert = existsSync(join(chemin, "page.tsx")) || existsSync(join(chemin, "route.ts"));
        return sert ? [d.name] : [];
      });
  }

  const topLevelRoutes = urlsDePremierNiveau(appDir);

  it("trouve bien les routes de premier niveau", () => {
    expect(topLevelRoutes.length).toBeGreaterThan(3);
  });

  it("réserve chaque route de premier niveau, sinon le proxy la réécrit en landing coach", () => {
    const oubliees = topLevelRoutes.filter((r) => !RESERVED_PATH_SEGMENTS.has(r));
    expect(oubliees).toEqual([]);
  });

  it("ne réécrit aucune route existante", () => {
    const reecrites = topLevelRoutes.filter((r) => isRewritablePathSegment(r));
    expect(reecrites).toEqual([]);
  });

  it("laisse passer un vrai slug de coach", () => {
    expect(isRewritablePathSegment("studio-forme")).toBe(true);
  });
});
