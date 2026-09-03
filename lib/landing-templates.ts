/**
 * Registre des templates de landing, isolé de `lib/offers.ts` qui est
 * `server-only` (client service_role). Les composants client ont besoin de ces
 * constantes à l'exécution, pas seulement du type : ce module ne doit donc
 * jamais importer de code serveur.
 */
export type LandingTemplate = "onyx" | "lumen" | "volt" | "sage" | "kinetic" | "aurora";

export const LANDING_TEMPLATES: readonly LandingTemplate[] = ["onyx", "lumen", "volt", "sage", "kinetic", "aurora"] as const;

/** Templates « premium » : défilement latéral épinglé et animations poussées. */
export const PREMIUM_TEMPLATES: readonly LandingTemplate[] = ["kinetic", "aurora"] as const;

/** Normalise la valeur stockée en une clé de template connue (défaut onyx). */
export function asLandingTemplate(v: string | null | undefined): LandingTemplate {
  return (LANDING_TEMPLATES as readonly string[]).includes(v ?? "") ? (v as LandingTemplate) : "onyx";
}
