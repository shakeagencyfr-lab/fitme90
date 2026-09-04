import type { ReactNode } from "react";
import { brandForSlug } from "@/lib/branding";
import { themeProps } from "@/components/tenant-theme";

/**
 * Applique le thème d'un coach (par son slug) au contenu enfant. Sert à brander
 * les pages de connexion et d'inscription quand on arrive depuis sa page
 * publique : le visiteur ne doit pas voir nos couleurs s'intercaler entre la
 * page du coach et son espace.
 *
 * Le div porte `bg-paper` : c'est lui qui peint le fond, donc c'est sur lui que
 * le motif d'arrière-plan du thème doit se poser.
 */
export async function CoachAccent({ slug, children }: { slug?: string; children: ReactNode }) {
  const brand = slug ? await brandForSlug(slug) : null;
  if (!brand) return <>{children}</>;
  return (
    <div className="bg-paper" {...themeProps(brand.theme)}>
      {children}
    </div>
  );
}
