"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Export PDF. Tente d'abord /api/pdf (MarkupGo, si configuré) et ne télécharge
// QUE si la réponse est un vrai PDF ; sinon bascule sur la page d'impression
// propre (« Enregistrer en PDF » du navigateur, même document). Jamais de
// fichier corrompu.
export function PdfButton() {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    setBusy(true);
    try {
      const res = await fetch("/api/pdf", { method: "POST" });
      const type = res.headers.get("content-type") ?? "";
      if (res.ok && type.includes("application/pdf")) {
        const blob = await res.blob();
        if (blob.size > 1000) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "fitme90.pdf";
          a.click();
          URL.revokeObjectURL(url);
          return;
        }
      }
      // Repli fiable : page d'impression dédiée.
      window.open("/imprimer", "_blank");
    } catch {
      window.open("/imprimer", "_blank");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={exportPdf} loading={busy}>
      {busy ? "Préparation…" : "Exporter en PDF"}
    </Button>
  );
}
