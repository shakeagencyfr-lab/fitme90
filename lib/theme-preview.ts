import type { TenantTheme } from "@/lib/theme";

/**
 * APERÇU VIVANT DU THÈME, entre le studio et l'iframe de la page publique.
 *
 * L'aperçu est un iframe de la vraie page : c'est ce qui le rend fiable, mais
 * il ne montrait que ce qui est ENREGISTRÉ. Choisir un thème demandait donc
 * d'enregistrer pour le voir, puis de revenir en arrière si on n'aimait pas.
 * Personne n'essaie six thèmes à ce prix.
 *
 * On passe le brouillon par `postMessage` plutôt que par l'URL. Une URL qui
 * porterait un thème serait partageable, indexable, et surtout falsifiable :
 * n'importe qui pourrait faire afficher n'importe quelles couleurs sur la page
 * publique d'un coach. Un message ne sort pas de l'onglet, et on vérifie
 * l'origine des deux côtés.
 *
 * Rien n'est persisté : fermer l'onglet suffit à tout oublier, et le bandeau
 * du studio continue de dire que rien n'est enregistré.
 */

/** Marque l'iframe d'aperçu, pour que le studio sache à qui parler. */
export const PREVIEW_FRAME_ATTR = "data-wl-preview";

/** Discriminant du message. Sans lui, on réagirait au bruit d'autres scripts. */
export const THEME_PREVIEW_TYPE = "fitme:theme-preview";

export interface ThemePreviewMessage {
  type: typeof THEME_PREVIEW_TYPE;
  theme: TenantTheme;
}

/** Vrai si ce message est bien un brouillon de thème, et pas autre chose. */
export function isThemePreviewMessage(raw: unknown): raw is ThemePreviewMessage {
  if (!raw || typeof raw !== "object") return false;
  const m = raw as Partial<ThemePreviewMessage>;
  if (m.type !== THEME_PREVIEW_TYPE) return false;
  const t = m.theme as Partial<TenantTheme> | undefined;
  // On exige les champs dont dépend le rendu : un objet à moitié rempli
  // produirait une page à moitié thémée, plus déroutante qu'un aperçu figé.
  return (
    !!t &&
    typeof t.primary === "string" &&
    typeof t.accent === "string" &&
    typeof t.background === "string" &&
    typeof t.card === "string" &&
    typeof t.corners === "string" &&
    typeof t.headingFont === "string" &&
    typeof t.bodyFont === "string"
  );
}
