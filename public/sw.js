// Service worker FitMe90 — minimal et sûr.
// Objectif : rendre l'app installable et fournir un repli hors-ligne pour les
// pages déjà visitées. Stratégie « network-first » sur les navigations : on sert
// toujours la version fraîche quand le réseau répond, le cache ne sert qu'en
// secours. Rien d'autre n'est intercepté (les assets versionnés de Next sont
// déjà gérés par le cache HTTP du navigateur).
const CACHE = "fitme90-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        return cached || (await cache.match("/")) || Response.error();
      }
    })(),
  );
});
