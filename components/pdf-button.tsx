"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Télécharge le PDF via /api/pdf (clé MarkupGo côté serveur). En cas
// d'indisponibilité, repli sur l'impression navigateur (même document).
export function PdfButton() {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/pdf", { method: "POST" });
      if (!res.ok) throw new Error("indispo");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fitme90.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.print(); // repli : « Imprimer / enregistrer en PDF »
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={download} loading={busy} className="h-11 px-4 text-[14px]">
      PDF
    </Button>
  );
}
