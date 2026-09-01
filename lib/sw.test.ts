import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Le service worker (public/sw.js) est du JS navigateur : on l'évalue dans un
// faux « self » pour tester sa logique de repli, à l'origine de pages périmées
// servies à la place des pages fraîches.
type Handler = (event: unknown) => void;

function loadServiceWorker(opts: {
  fetchImpl: () => Promise<Response>;
  cachesBroken?: boolean;
  cachedBody?: string | null;
}) {
  const handlers: Record<string, Handler> = {};
  const put = async () => {
    if (opts.cachesBroken) throw new Error("QuotaExceededError");
  };
  const fakeCaches = {
    open: async () => {
      if (opts.cachesBroken) throw new Error("QuotaExceededError");
      return {
        put,
        match: async () =>
          opts.cachedBody == null ? undefined : new Response(opts.cachedBody),
      };
    },
    keys: async () => [],
    delete: async () => true,
  };
  const self = {
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn;
    },
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [] },
    registration: { showNotification: async () => {} },
  };
  const code = readFileSync(join(process.cwd(), "public/sw.js"), "utf8");
  new Function("self", "caches", "fetch", "Response", code)(
    self,
    fakeCaches,
    opts.fetchImpl,
    Response,
  );
  return handlers;
}

/** Déclenche le handler « fetch » sur une navigation et rend la réponse. */
async function navigate(handlers: Record<string, Handler>): Promise<Response> {
  let responded!: Promise<Response>;
  handlers.fetch({
    request: { method: "GET", mode: "navigate", url: "https://x/inscription-coach" },
    respondWith: (p: Promise<Response>) => {
      responded = p;
    },
  });
  return responded;
}

describe("service worker : stratégie réseau d'abord", () => {
  it("sert la réponse FRAÎCHE même si le cache est en panne (quota saturé)", async () => {
    const handlers = loadServiceWorker({
      fetchImpl: async () => new Response("page fraiche"),
      cachesBroken: true,
      cachedBody: "vieille page FitMe90",
    });
    expect(await (await navigate(handlers)).text()).toBe("page fraiche");
  });

  it("hors ligne : sert la page demandée si elle est en cache", async () => {
    const handlers = loadServiceWorker({
      fetchImpl: async () => {
        throw new Error("offline");
      },
      cachedBody: "cette page en cache",
    });
    expect(await (await navigate(handlers)).text()).toBe("cette page en cache");
  });

  it("hors ligne sans cache : page « Connexion perdue », jamais une autre page", async () => {
    const handlers = loadServiceWorker({
      fetchImpl: async () => {
        throw new Error("offline");
      },
      cachedBody: null,
    });
    const body = await (await navigate(handlers)).text();
    expect(body).toContain("Connexion perdue");
    expect(body).not.toContain("Créer mon espace coach");
  });
});
