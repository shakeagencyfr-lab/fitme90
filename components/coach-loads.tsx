"use client";

import { useState } from "react";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

// Bouton « Suggère-moi mes charges » : demande au coach des charges pour la
// prochaine séance à partir des séances déjà validées. Réponse affichée en place.
export function CoachLoadSuggestion() {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message:
            "À partir de mes séances déjà validées, propose-moi les charges (ou le RPE visé si je débute) pour chaque exercice de ma prochaine séance. Sois concret et prudent.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Indisponible.");
      setAnswer(data.answer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Indisponible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <MonoLabel className="text-brand">Charges</MonoLabel>
        <div className="font-archivo font-semibold text-[15px] text-ink">
          Le coach cale tes charges
        </div>
        <p className="text-[13px] text-muted leading-relaxed">
          À partir de ce que tu as noté dans tes séances validées, le coach te
          propose les charges (ou le RPE visé si tu débutes).
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {answer ? (
        <div className="rounded-control bg-paper px-4 py-3 text-[14px] text-body leading-relaxed whitespace-pre-wrap">
          {answer}
        </div>
      ) : null}
      <Button variant="outline" onClick={ask} loading={busy} className="self-start h-11">
        {answer ? "Refaire une suggestion" : "Suggère-moi mes charges"}
      </Button>
    </Card>
  );
}
