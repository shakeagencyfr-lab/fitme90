/**
 * Registre des habillages du mini-site du coach.
 *
 * Isolé de `lib/site.ts`, qui est `server-only` : le sélecteur du tableau de
 * bord est un composant client et a besoin de ces constantes à l'exécution,
 * pas seulement de leur type. Ce module ne doit donc jamais importer de code
 * serveur.
 *
 * Trois habillages, pas six. La landing de vente en propose davantage parce
 * qu'elle sert un argumentaire ; un site de présentation a une structure
 * unique (qui, quoi, où, quand, avis, programmes) et se distingue par son
 * ambiance.
 */
export type SiteTemplate = "atelier" | "nocturne" | "vitrine";

export const SITE_TEMPLATES: readonly SiteTemplate[] = ["atelier", "nocturne", "vitrine"] as const;

export function asSiteTemplate(v: string | null | undefined): SiteTemplate {
  return (SITE_TEMPLATES as readonly string[]).includes(v ?? "") ? (v as SiteTemplate) : "atelier";
}

/** Fond de page de chaque habillage, pour la barre du navigateur mobile. */
export const SITE_THEME_COLOR: Record<SiteTemplate, string> = {
  atelier: "#f7f4ee",
  nocturne: "#0a0b0d",
  vitrine: "#ffffff",
};

/** Nombre maximum de prestations affichées. Au-delà, la section n'est plus lue. */
export const MAX_SERVICES = 6;
/** Nombre maximum de photos dans la galerie. */
export const MAX_SITE_PHOTOS = 12;
