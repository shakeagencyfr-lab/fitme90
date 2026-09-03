import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";

type H = { key: string; value: string };
type Rule = { source: string; headers: H[] };

async function rules(): Promise<Rule[]> {
  const fn = nextConfig.headers;
  if (!fn) throw new Error("next.config n'expose pas headers()");
  return (await fn()) as unknown as Rule[];
}

function ruleFor(all: Rule[], source: string): Rule {
  const r = all.find((x) => x.source === source);
  if (!r) throw new Error(`Aucune règle d'en-têtes pour ${source}`);
  return r;
}

function header(r: Rule, key: string): string | null {
  return r.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value ?? null;
}

function directive(csp: string, name: string): string | null {
  const found = csp.split(";").map((d) => d.trim()).find((d) => d === name || d.startsWith(`${name} `));
  return found ?? null;
}

describe("en-têtes de sécurité", () => {
  it("le catch-all autorise le studio à encadrer sa propre origine (aperçu live)", async () => {
    // Régression : frame-src ne listait que Stripe. La page prévisualisée
    // acceptait bien d'être encadrée, mais le PARENT (/admin/marque-blanche)
    // refusait de l'insérer, d'où « Ce contenu est bloqué » dans l'iframe.
    const csp = header(ruleFor(await rules(), "/((?!c/[^/]+/embed|c/[^/]+$|r/[^/]+$|revendeurs$|$).*)"), "Content-Security-Policy");
    expect(csp).toBeTruthy();
    expect(directive(csp!, "frame-src")).toContain("'self'");
  });

  it("les landings publiques restent encadrables en same-origin seulement", async () => {
    const all = await rules();
    for (const source of ["/", "/revendeurs", "/c/:slug", "/r/:slug"]) {
      const r = ruleFor(all, source);
      expect(directive(header(r, "Content-Security-Policy")!, "frame-ancestors")).toBe("frame-ancestors 'self'");
      expect(header(r, "X-Frame-Options")).toBe("SAMEORIGIN");
    }
  });

  it("le reste du site n'est encadrable nulle part", async () => {
    const r = ruleFor(await rules(), "/((?!c/[^/]+/embed|c/[^/]+$|r/[^/]+$|revendeurs$|$).*)");
    expect(directive(header(r, "Content-Security-Policy")!, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(header(r, "X-Frame-Options")).toBe("DENY");
  });

  it("le widget embed reste encadrable partout et sans X-Frame-Options", async () => {
    const r = ruleFor(await rules(), "/c/:slug/embed");
    expect(directive(header(r, "Content-Security-Policy")!, "frame-ancestors")).toBe("frame-ancestors *");
    expect(header(r, "X-Frame-Options")).toBeNull();
  });

  it("aucune règle n'applique deux jeux d'en-têtes à la même landing", async () => {
    // Next.js FUSIONNE les en-têtes de toutes les sources qui matchent : si le
    // catch-all couvrait aussi /revendeurs, le navigateur recevait DENY +
    // SAMEORIGIN et bloquait tout.
    const re = new RegExp("^(?!c/[^/]+/embed|c/[^/]+$|r/[^/]+$|revendeurs$|$).*$");
    for (const path of ["", "revendeurs", "c/demo", "r/mon-reseau", "c/demo/embed"]) {
      expect(re.test(path)).toBe(false);
    }
    for (const path of ["admin/marque-blanche", "app", "c/demo/merci"]) {
      expect(re.test(path)).toBe(true);
    }
  });
});
