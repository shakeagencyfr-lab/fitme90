"use client";

import { useState } from "react";
import { formatEuros } from "@/lib/config";

interface GiftOffer {
  id: string;
  name: string;
  price_cents: number | null;
  duration_months: number;
}

function durationText(m: number): string {
  const total = m === 12 ? "1 an" : `${m} mois`;
  return total;
}

// Achat cadeau invité : choix d'une offre + email de l'acheteur → paiement chez
// le coach. Au retour, la page « merci » affiche le code à transmettre.
export function GiftPurchase({ slug, offers }: { slug: string; offers: GiftOffer[] }) {
  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    if (busy) return;
    if (!offerId) return setError("Choisis un programme à offrir.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Saisis un email valide.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coach/gift-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, offerId, email: email.trim() }),
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {offers.map((o) => {
          const on = o.id === offerId;
          return (
            <button
              type="button"
              key={o.id}
              onClick={() => setOfferId(o.id)}
              className={[
                "flex items-center justify-between gap-3 rounded-card border p-4 text-left transition-colors",
                on ? "border-brand bg-brand/10" : "border-white/12 bg-white/[0.03] hover:border-white/30",
              ].join(" ")}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-archivo font-bold text-[16px] text-white">{o.name}</span>
                <span className="text-[12.5px] text-white/55">{durationText(o.duration_months)}</span>
              </div>
              <span className="font-archivo font-extrabold text-[20px] tracking-[-0.02em] text-white">
                {formatEuros(o.price_cents)}
              </span>
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/50">Ton email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="pour ton reçu"
          autoComplete="email"
          className="w-full rounded-control border border-white/15 bg-white/[0.04] px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-white/50"
        />
      </label>

      {error ? (
        <div className="rounded-control border border-red-400/40 bg-red-500/10 px-3.5 py-2.5 text-[13.5px] text-red-200">{error}</div>
      ) : null}

      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="tap inline-flex h-[54px] items-center justify-center rounded-btn bg-brand px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "…" : "Payer et recevoir le code cadeau"}
      </button>
      <p className="text-center text-[12.5px] text-white/45">
        Paiement sécurisé par Stripe, directement auprès du coach. Tu recevras un code à transmettre à la personne de ton choix.
      </p>
    </div>
  );
}
