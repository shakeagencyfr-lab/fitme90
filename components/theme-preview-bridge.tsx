"use client";

import { useEffect } from "react";
import { themeVars, themeAttrs, THEME_ROOT_ATTR } from "@/lib/theme";
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

      // On vise l'élément qui PORTE déjà le thème, pas <html>.
      //
      // Le serveur pose les variables en style en ligne sur la racine de la
      // landing. Un style en ligne gagne sur tout ce qu'un ancêtre déclare :
      // écrire sur <html>, comme on le faisait, ne changeait donc rien du tout
      // à l'intérieur de la page, et l'aperçu restait figé sur le thème
      // enregistré. On écrit au même endroit que le serveur, ce qui remplace
      // sa valeur au lieu de se faire couvrir par elle.
      const cibles = document.querySelectorAll<HTMLElement>(`[${THEME_ROOT_ATTR}]`);
      const racines: HTMLElement[] = cibles.length > 0 ? [...cibles] : [document.documentElement];

      const vars = Object.entries(themeVars(e.data.theme));
      // Les motifs de fond et le style de carte sont pilotés par des attributs,
      // pas par des variables : il faut aussi retirer ceux qui ne sont plus là,
      // sinon l'animation resterait allumée après l'avoir décochée.
      const attrs = themeAttrs(e.data.theme);
      for (const racine of racines) {
        for (const [k, v] of vars) racine.style.setProperty(k, v);
        for (const nom of ["data-wl-bg", "data-wl-card", "data-wl-motion"]) {
          const v = attrs[nom];
          if (v) racine.setAttribute(nom, v);
          else racine.removeAttribute(nom);
        }
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
