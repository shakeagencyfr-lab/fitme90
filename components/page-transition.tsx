"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Entrée de page à chaque navigation.
//
// La clé est le chemin : React démonte l'ancien contenu et remonte le nouveau,
// donc l'animation CSS `page-in` rejoue. Sans clé, l'animation ne se
// déclencherait qu'au tout premier rendu.
//
// Volontairement court (320 ms) et discret (8 px) : une transition de page qui
// se remarque devient pénible dès la troisième navigation.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}
