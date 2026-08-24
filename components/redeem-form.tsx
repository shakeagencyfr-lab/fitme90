"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Alert } from "@/components/ui";

// Option « On m'a offert FitMe90 » : débloque le programme avec un code cadeau.
// Repliée par défaut, sous le bouton de paiement.
export function RedeemForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function redeem() {
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code invalide.");
      router.push("/questionnaire");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code invalide.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="tap text-[14px] text-muted hover:text-ink underline underline-offset-2 self-center"
      >
        On m'a offert FitMe90 ? J'ai un code cadeau
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-2 p-4">
      <div className="font-archivo font-semibold text-[15px] text-ink">
        Débloquer avec un code cadeau
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && redeem()}
        placeholder="Ton code cadeau"
        autoCapitalize="characters"
        autoComplete="off"
        className="tap w-full rounded-control border border-line-4 bg-surface px-3.5 text-ink placeholder:text-disabled outline-none focus:border-ink uppercase tracking-[0.08em]"
      />
      <Button onClick={redeem} loading={busy} full>
        Débloquer mon programme
      </Button>
      <button
        onClick={() => setOpen(false)}
        className="tap text-[13px] text-muted-2 hover:text-ink self-center"
      >
        Annuler
      </button>
    </div>
  );
}
