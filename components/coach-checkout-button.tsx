"use client";

import { useState } from "react";
import { Button, Alert } from "@/components/ui";

// Lance le paiement d'une offre coach sur le compte Stripe DU COACH (BYOK).
// `allowPromo` affiche un champ code promo (paiement unique uniquement).
export function CoachCheckoutButton({
  priceLabel,
  allowPromo = false,
  mode,
  ctaLabel,
}: {
  priceLabel: string;
  allowPromo?: boolean;
  /** « once » ou « month » : la façon de payer choisie sur la page. */
  mode?: "once" | "month";
  /** Libellé du bouton, sinon « Payer X et débloquer ». */
  ctaLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPromo, setShowPromo] = useState(false);
  const [code, setCode] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coach/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: code.trim(), mode }),
      });
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

      {allowPromo ? (
        showPromo ? (
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code promo"
            autoCapitalize="characters"
            autoComplete="off"
            className="tap w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] uppercase tracking-[0.08em] text-ink outline-none focus:border-ink"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowPromo(true)}
            className="self-start text-[13px] font-semibold text-muted-2 underline underline-offset-2 hover:text-ink"
          >
            J&apos;ai un code promo
          </button>
        )
      ) : null}

      <Button onClick={pay} loading={busy} full className="h-[54px] text-[16px]">
        {ctaLabel ?? `Payer ${priceLabel} et débloquer`}
      </Button>
      <p className="text-[12.5px] text-muted-2 text-center">
        Paiement sécurisé par Stripe. Aucune donnée de carte ne transite par l&apos;app.
      </p>
    </div>
  );
}
