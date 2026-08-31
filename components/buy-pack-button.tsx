"use client";

import { useState } from "react";

// Bouton d'achat d'un pack : demande une session Stripe au serveur puis redirige
// vers la page de paiement du revendeur.
export function BuyPackButton({ packId, label = "Acheter" }: { packId: number; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/pack-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Paiement indisponible.");
    } catch {
      setError("Réseau indisponible. Réessaie.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={buy}
        disabled={loading}
        className="tap inline-flex h-9 items-center rounded-btn bg-brand px-4 text-[13.5px] font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
      >
        {loading ? "…" : label}
      </button>
      {error ? <span className="text-[11px] text-[#C4471A]">{error}</span> : null}
    </div>
  );
}
