"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

// Déclenche la boîte d'impression du navigateur (→ « Enregistrer en PDF »).
// Bouton visible aussi, au cas où le déclenchement auto soit bloqué.
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print flex gap-3">
      <Button onClick={() => window.print()}>Enregistrer en PDF / Imprimer</Button>
      <Button variant="outline" onClick={() => window.history.back()}>
        Retour
      </Button>
    </div>
  );
}
