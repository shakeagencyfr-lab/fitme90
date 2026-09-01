// Service worker My Fitness App — minimal et sûr.
// Objectif : rendre l'app installable et fournir un repli hors-ligne pour les
// pages déjà visitées. Stratégie « network-first » sur les navigations : on sert
// toujours la version fraîche quand le réseau répond, le cache ne sert qu'en
// secours. Rien d'autre n'est intercepté (les assets versionnés de Next sont
// déjà gérés par le cache HTTP du navigateur).
const CACHE = "mfa-v3";

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

// Réception d'une notification push (rappels de séance, relances).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "My Fitness App";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || undefined,
    data: { url: data.url || "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification : on ouvre (ou on focus) l'app sur la bonne page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/app";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          try {
            await client.navigate(url);
          } catch {
            /* navigation best-effort */
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
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
        // Repli hors-ligne : UNIQUEMENT la page demandée. On ne sert JAMAIS une
        // autre page : afficher l'accueil sous l'URL de /inscription-coach
        // donnait l'impression que le bouton d'inscription était cassé.
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        return cached || offlinePage();
      }
    })(),
  );
});

// Page affichée quand une navigation échoue et qu'aucune version de CETTE page
// n'est en cache. Elle dit la vérité (pas de réseau) au lieu d'afficher une
// autre page du site.
function offlinePage() {
  return new Response(
    '<!doctype html><html lang="fr"><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Hors ligne</title>' +
      '<style>body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;' +
      'font-family:system-ui,sans-serif;background:#F4F3F1;color:#171310;text-align:center;padding:24px}' +
      'h1{font-size:20px;margin:0 0 8px}p{margin:0 0 20px;color:#7C7164;font-size:15px;line-height:1.6}' +
      'button{min-height:44px;padding:0 20px;border:0;border-radius:10px;background:#A67C52;color:#fff;' +
      'font-size:15px;font-weight:600}</style>' +
      '<body><div><h1>Connexion perdue</h1>' +
      '<p>Cette page n\'a pas pu être chargée.<br>Vérifie ta connexion, puis réessaie.</p>' +
      '<button onclick="location.reload()">Réessayer</button></div>',
    { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
