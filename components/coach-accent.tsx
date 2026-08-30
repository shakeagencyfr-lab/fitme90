import type { CSSProperties, ReactNode } from "react";
import { accentForSlug } from "@/lib/branding";

// Applique la couleur d'accent d'un coach (par son slug) au contenu enfant, en
// surchargeant --color-brand / --color-brand-hover. Sert à brander les pages de
// connexion / inscription quand on arrive depuis la page d'un coach.
export async function CoachAccent({ slug, children }: { slug?: string; children: ReactNode }) {
  const accent = slug ? await accentForSlug(slug) : null;
  if (!accent) return <>{children}</>;
  return (
    <div
      style={
        {
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
