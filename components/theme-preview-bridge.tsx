"use client";

import { useEffect } from "react";
import { themeVars, themeAttrs } from "@/lib/theme";
import { isThemePreviewMessage } from "@/lib/theme-preview";

/**
 * Reçoit le brouillon de thème envoyé par le studio et l'applique à la page.
 *
 * Monté uniquement quand la page est ouverte DANS l'iframe d'aperçu : sur la
 * vraie page publique, ce composant n'existe pas, donc aucun visiteur ne peut
 * lui parler.
 *
 * L'origine est vérifiée : un message venant d'ailleurs que de notre propre
 * domaine est ignoré. Sans ce contrôle, n'importe quelle page ayant ouvert
 * celle-ci pourrait en changer l'apparence.
 */
export function ThemePreviewBridge() {
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!isThemePreviewMessage(e.data)) return;

      const racine = document.documentElement;
      for (const [k, v] of Object.entries(themeVars(e.data.theme))) {
        racine.style.setProperty(k, v);
      }
      // Les motifs de fond et le style de carte sont pilotés par des attributs,
      // pas par des variables : il faut aussi retirer ceux qui ne sont plus là,
      // sinon l'animation resterait allumée après l'avoir décochée.
      const attrs = themeAttrs(e.data.theme);
      for (const nom of ["data-wl-bg", "data-wl-card", "data-wl-motion"]) {
        const v = attrs[nom];
        if (v) racine.setAttribute(nom, v);
        else racine.removeAttribute(nom);
      }
    }

    window.addEventListener("message", onMessage);
    // Le studio peut avoir émis avant que l'iframe ait fini de charger : on
    // signale qu'on est prêt plutôt que d'attendre le prochain clic.
    window.parent?.postMessage({ type: "fitme:theme-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return null;
}
