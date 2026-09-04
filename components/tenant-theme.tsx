import type { CSSProperties } from "react";
import { themeVars, themeAttrs, type TenantTheme } from "@/lib/theme";

/**
 * Props à étaler sur l'élément qui PEINT LE FOND DE PAGE (celui qui porte
 * `bg-paper`, ou le fond d'une landing).
 *
 * Pourquoi cet élément précisément : les motifs d'arrière-plan sont des
 * `background-image`. Posés ailleurs, un fond opaque les recouvrirait ; posés
 * là, ils se superposent naturellement à la couleur de fond et passent sous le
 * contenu sans qu'aucun composant ait à gérer un z-index.
 *
 * Les variables, elles, se contentent d'être héritées : tout ce qui est à
 * l'intérieur suit le thème sans une ligne de plus.
 *
 *   <div className="min-h-dvh bg-paper" {...themeProps(brand?.theme)}>
 */
export function themeProps(theme: TenantTheme | null | undefined): Record<string, unknown> {
  if (!theme) return {};
  return { style: themeVars(theme) as CSSProperties, ...themeAttrs(theme) };
}

/**
 * Même chose, mais en fusionnant avec un style déjà présent. Utile sur les
 * landings qui posent leur propre dégradé en style inline.
 */
export function themePropsWith(
  theme: TenantTheme | null | undefined,
  style: CSSProperties,
): Record<string, unknown> {
  if (!theme) return { style };
  return { style: { ...style, ...themeVars(theme) } as CSSProperties, ...themeAttrs(theme) };
}
