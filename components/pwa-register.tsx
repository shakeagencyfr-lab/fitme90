"use client";

import { useEffect } from "react";

// Enregistre le service worker (installabilité PWA + repli hors-ligne).
// Sans rendu : monté une fois dans le layout racine.
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* enregistrement best-effort : on ignore l'échec */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
