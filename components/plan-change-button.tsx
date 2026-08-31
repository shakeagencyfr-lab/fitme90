"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Alert } from "@/components/ui";

// Choix d'un palier : souscription (checkout) OU changement d'offre en place
// (upgrade/downgrade). L'API décide selon l'état de l'abonnement.
export function PlanChangeButton({
  planId,
  monthLabel,
  yearLabel,
  hasActiveSub,
}: {
  planId: string;
  monthLabel: string | null;
  yearLabel: string | null;
  /** Un abonnement est déjà actif → le bouton « change » plutôt que « souscrit ». */
  hasActiveSub: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"month" | "year" | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function choose(interval: "month" | "year") {
    setBusy(interval);
    setError("");
    try {
      const res = await fetch("/api/coach/plan-choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action indisponible.");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.switched) {
        setDone(true);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action indisponible.");
    } finally {
      setBusy(null);
    }
  }

  const prefix = hasActiveSub ? "Passer à " : "";
  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert>{error}</Alert> : null}
      {done ? <Alert tone="info">Offre mise à jour. Le prorata est appliqué sur ta prochaine facture.</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {monthLabel ? (
          <Button onClick={() => choose("month")} loading={busy === "month"} className="h-11">
            {prefix}{monthLabel}
          </Button>
        ) : null}
        {yearLabel ? (
          <Button onClick={() => choose("year")} loading={busy === "year"} variant="outline" className="h-11">
            {prefix}{yearLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
