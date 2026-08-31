"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";

// Lance le paiement d'un palier (abonnement du compte à son parent). La session
// est créée sur le compte Stripe du parent ; on redirige vers l'URL Checkout.
export function PlanCheckoutButton({
  planId,
  monthLabel,
  yearLabel,
}: {
  planId: string;
  monthLabel: string | null;
  yearLabel: string | null;
}) {
  const [busy, setBusy] = useState<"month" | "year" | null>(null);
  const [error, setError] = useState("");

  async function pay(interval: "month" | "year") {
    setBusy(interval);
    setError("");
    try {
      const res = await fetch("/api/coach/plan-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Paiement indisponible.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement indisponible.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {monthLabel ? (
          <Button onClick={() => pay("month")} loading={busy === "month"} className="h-11">
            {monthLabel}
          </Button>
        ) : null}
        {yearLabel ? (
          <Button
            onClick={() => pay("year")}
            loading={busy === "year"}
            variant="outline"
            className="h-11"
          >
            {yearLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
