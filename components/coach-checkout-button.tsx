"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";

// Lance le paiement d'une offre coach sur le compte Stripe DU COACH (BYOK).
export function CoachCheckoutButton({ priceLabel }: { priceLabel: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coach/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Paiement indisponible.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Paiement indisponible.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <Alert>{error}</Alert> : null}
      <Button onClick={pay} loading={busy} full className="h-[54px] text-[16px]">
        Payer {priceLabel} et débloquer
      </Button>
      <p className="text-[12.5px] text-muted-2 text-center">
        Paiement sécurisé par Stripe. Aucune donnée de carte ne transite par l&apos;app.
      </p>
    </div>
  );
}
