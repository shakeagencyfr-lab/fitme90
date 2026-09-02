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

  const topLevelRoutes = readdirSync(appDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    // Groupes de routes et segments dynamiques ne produisent pas d'URL directe.
    .filter((n) => !n.startsWith("(") && !n.startsWith("[") && !n.startsWith("_"))
    .filter((n) => existsSync(join(appDir, n, "page.tsx")) || existsSync(join(appDir, n, "route.ts")));

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
