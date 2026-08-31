"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";

// Lance le paiement Stripe Checkout. Le contrôle du paiement reste côté
// serveur (webhook) : ce bouton ne fait que rediriger vers Stripe.
export function CheckoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
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
        Payer 190 € et débloquer
      </Button>
      <p className="text-[12.5px] text-muted-2 text-center">
        Paiement sécurisé par Stripe. Aucune donnée de carte ne transite par My Fitness App.
      </p>
    </div>
  );
}
