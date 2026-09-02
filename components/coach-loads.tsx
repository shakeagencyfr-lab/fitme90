"use client";

import { useState } from "react";
import { useT } from "@/components/locale-provider";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

// Bouton « Suggère-moi mes charges » : demande au coach des charges pour la
// prochaine séance à partir des séances déjà validées. Réponse affichée en place.
export function CoachLoadSuggestion() {
  const t = useT();
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
            t("loads.prompt"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.unavailable"));
      const text = Array.isArray(data.messages) ? data.messages.join("\n\n") : data.answer;
      setAnswer(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.unavailable"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <MonoLabel className="text-brand">{t("loads.title")}</MonoLabel>
        <div className="font-archivo font-semibold text-[15px] text-ink">{t("loads.headline")}</div>
        <p className="text-[13px] text-muted leading-relaxed">
          {t("loads.body")}
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {answer ? (
        <div className="rounded-control bg-paper px-4 py-3 text-[14px] text-body leading-relaxed whitespace-pre-wrap">
          {answer}
        </div>
      ) : null}
      <Button variant="outline" onClick={ask} loading={busy} className="self-start h-11">
        {answer ? t("loads.again") : t("loads.cta")}
      </Button>
    </Card>
  );
}
