import type { ReactNode } from "react";
import { brandForSlug } from "@/lib/branding";
import { themeProps } from "@/components/tenant-theme";
import { LangSwitch } from "@/components/lang-switch";

/**
 * Cadre des pages de connexion, d'inscription et de mot de passe, aux couleurs
 * du coach quand on arrive depuis sa page publique.
 *
 * POURQUOI LE CADRE ET LE THÈME SONT LE MÊME COMPOSANT.
 *
 * Le thème posait son motif d'arrière-plan sur un div niché dans la colonne de
 * 400 pixels du formulaire : la grille, les lignes ou la lueur s'arrêtaient net
 * de part et d'autre de la carte, au milieu d'un fond nu. Un motif de fond de
 * page qui ne couvre pas la page se voit immédiatement.
 *
 * La cause était structurelle : le cadre vivait dans la mise en page (layout)
 * de la section, qui ne reçoit pas les paramètres d'URL et ne peut donc pas
 * savoir de quel coach il s'agit. Le thème arrivait forcément plus bas. Les
 * deux sont maintenant réunis ici, dans un composant que chaque page appelle
 * en connaissant son slug : l'élément qui peint le fond est aussi celui qui
 * porte le thème, ce que le reste de l'application respecte déjà partout.
 *
 * Sans slug, le cadre reste le même, simplement à nos couleurs.
 */
export async function AuthShell({ slug, children }: { slug?: string; children: ReactNode }) {
  const brand = slug ? await brandForSlug(slug) : null;
  return (
    <div className="min-h-dvh flex flex-col bg-paper" {...themeProps(brand?.theme)}>
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))]">
        <LangSwitch compact />
      </div>
      <main className="flex-1 flex items-center justify-center px-5 pb-12 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))]">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
