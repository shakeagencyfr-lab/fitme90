import { describe, it, expect } from "vitest";
import { readBounded, readBoundedText } from "./bounded-body";

/**
 * La limite de taille doit être VRAIE : refuser après avoir tout chargé en
 * mémoire ne protège de rien. Ces tests vérifient donc surtout qu'on cesse de
 * lire, pas seulement qu'on renvoie null.
 */

/** Réponse dont le corps arrive en plusieurs morceaux, en comptant les lectures. */
function flux(morceaux: string[], headers: Record<string, string> = {}) {
  let lus = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (lus >= morceaux.length) return ctrl.close();
      ctrl.enqueue(new TextEncoder().encode(morceaux[lus++]));
    },
  });
  return { res: new Response(stream, { headers }), lus: () => lus };
}

describe("readBounded", () => {
  it("rend le corps entier quand il tient dans le budget", async () => {
    const { res } = flux(["abc", "def"]);
    expect(await readBoundedText(res, 100)).toBe("abcdef");
  });

  it("refuse sans ouvrir le flux quand Content-Length annonce trop gros", async () => {
    // La preuve qu'on n'a rien consommé est que le corps reste déverrouillé :
    // compter les `pull` ne dirait rien, le flux en amorce un tout seul.
    const f = flux(["x".repeat(10)], { "content-length": "999999" });
    expect(await readBounded(f.res, 10)).toBeNull();
    expect(f.res.bodyUsed).toBe(false);
    expect(f.res.body?.locked).toBe(false);
  });

  it("cesse de lire dès le dépassement, sans avaler la suite", async () => {
    // Un Content-Length absent ou menteur ne doit pas suffire à nous noyer.
    const f = flux(["1234", "5678", "9012", "3456"]);
    expect(await readBounded(f.res, 6)).toBeNull();
    expect(f.lus()).toBeLessThanOrEqual(2);
  });

  it("accepte pile la taille limite", async () => {
    const { res } = flux(["12345"]);
    expect(await readBoundedText(res, 5)).toBe("12345");
  });

  it("rend null sur un corps absent", async () => {
    expect(await readBounded(new Response(null), 10)).toBeNull();
  });

  it("rend null quand le flux casse en cours de route", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode("ok"));
        ctrl.error(new Error("coupure"));
      },
    });
    expect(await readBounded(new Response(stream), 100)).toBeNull();
  });

  it("recolle les morceaux dans l'ordre", async () => {
    const { res } = flux(["le ", "corps ", "complet"]);
    expect(await readBoundedText(res, 100)).toBe("le corps complet");
  });
});
