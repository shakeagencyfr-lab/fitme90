"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";
import { formatEuros, monthlyEquivalentCents } from "@/lib/config";

interface Props {
  /** Séances validées / dues depuis le début (chiffres réels du client). */
  done: number;
  due: number;
  /** Évolution du poids depuis le départ, en kg (null si inconnue). */
  weightDelta: number | null;
  offerName: string;
  twelveMonthCents: number;
  alreadyPaidCents: number;
  dueCents: number;
  /** Jours restants sur le 3 mois (0 en période de consultation). */
  daysLeft: number;
}

/**
 * Semaine 10 : le client voit ses résultats, on lui propose de prolonger sur
 * 12 mois en déduisant ce qu'il a déjà payé. Il ne rachète pas, il continue.
 */
export function UpgradeCard(p: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const perMonth = monthlyEquivalentCents(p.twelveMonthCents, 12);

  async function go() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/coach/upgrade", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; applied?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || "Bascule indisponible.");
      if (data.applied) {
        router.replace("/app?upgrade=1");
        router.refresh();
        return;
      }
      if (!data.url) throw new Error("Paiement indisponible.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bascule indisponible.");
      setBusy(false);
    }
  }

  const proof: string[] = [];
  if (p.due > 0) proof.push(`${p.done} séance${p.done > 1 ? "s" : ""} validée${p.done > 1 ? "s" : ""} sur ${p.due}`);
  if (p.weightDelta != null && p.weightDelta !== 0) {
    proof.push(`${p.weightDelta > 0 ? "+" : ""}${p.weightDelta.toFixed(1)} kg depuis le départ`);
  }

  return (
    <Card className="relative flex flex-col gap-4 overflow-hidden border-brand/40">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-brand" />
      <div className="flex flex-col gap-1">
        <MonoLabel className="text-brand">Ton bloc 2 est prêt</MonoLabel>
        <h2 className="font-archivo font-extrabold text-[22px] leading-[1.1] tracking-[-0.02em] text-ink">
          {p.daysLeft > 0 ? `Il te reste ${p.daysLeft} jours. Et après ?` : "Ton programme est terminé. Et après ?"}
        </h2>
        {proof.length ? (
          <p className="text-[14px] leading-[1.6] text-body">{proof.join(" · ")}. Ce que tu as construit, on ne le laisse pas retomber.</p>
        ) : null}
      </div>

      <p className="text-[14px] leading-[1.6] text-muted">
        Passe sur <span className="font-semibold text-ink">{p.offerName}</span> : ton programme continue, sans repartir de
        zéro. Le bloc 2 est construit sur tes vrais résultats, puis l&apos;orientation change en cours d&apos;année
        (volume, force, pic). Coach IA toute l&apos;année.
      </p>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-1 rounded-control border border-line-4 bg-surface-2 px-4 py-3">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">Il te reste à régler</span>
          <span className="font-archivo text-[28px] font-extrabold leading-none tracking-[-0.02em] text-ink">
            {formatEuros(p.dueCents)}
          </span>
        </div>
        <span className="pb-1 text-[12.5px] leading-[1.5] text-muted">
          {formatEuros(p.twelveMonthCents)} pour 12 mois, moins tes {formatEuros(p.alreadyPaidCents)} déjà payés.
          {perMonth > 0 ? ` Soit ${formatEuros(perMonth)}/mois sur l'année.` : ""}
        </span>
      </div>

      {error ? <Alert>{error}</Alert> : null}
      <Button onClick={go} loading={busy} className="h-[50px] self-start px-6 text-[15.5px]">
        Continuer sur 12 mois
      </Button>
    </Card>
  );
}
