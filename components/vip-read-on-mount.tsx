"use client";

import { useEffect } from "react";
import { markClientVipRead } from "@/app/app/chat/actions";

// Marque le fil VIP comme lu au montage de la page (côté client), puis rafraîchit
// le badge de non-lus du layout. Nécessaire car le layout /app partagé n'est pas
// re-rendu lors d'une navigation interne : sans ça, la pastille resterait affichée.
export function VipReadOnMount() {
  useEffect(() => {
    void markClientVipRead();
  }, []);
  return null;
}
