"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Rejoue une animation d'entrée (fondu + léger glissement) à chaque changement
// de page : le `key` sur le chemin force le re-montage du contenu.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-[fadeup_0.28s_ease-out] motion-reduce:animate-none">
      {children}
    </div>
  );
}
