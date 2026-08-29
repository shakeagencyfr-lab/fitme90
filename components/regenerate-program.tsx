"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Alert, MonoLabel } from "@/components/ui";
import { MedicalWaiver } from "@/components/medical-waiver";

// Bannière « séances variées » : régénère le programme pour obtenir une séance
// DISTINCTE par jour (utile aux plans créés avant cette fonctionnalité).
export function RegenerateProgram() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [waiver, setWaiver] = useState<string[] | null>(null);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/regenerate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data.error === "medical_waiver_required") {
        setBusy(false);
        setWaiver(data.reasons ?? []);
        return;
      }
      if (!res.ok) throw new Error(data.error || "La régénération a échoué.");
      // Programme régénéré : on rafraîchit les données serveur.
      router.refresh();
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "La régénération a échoué.");
      setBusy(false);
    }
  }

  if (waiver) {
    return (
      <Card>
        <MedicalWaiver
          reasons={waiver}
          onSigned={() => {
            setWaiver(null);
            run();
          }}
          submitLabel="Signer et régénérer"
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-3 border-brand/30 bg-brand/[0.04]">
      <div className="flex flex-col gap-1">
        <MonoLabel className="text-brand">Séances variées</MonoLabel>
        <p className="text-[14px] leading-[1.6] text-body">
          Ton programme a été créé avant notre mise à jour : il propose la même séance
          chaque jour. Régénère-le pour obtenir une <strong>séance différente par jour</strong>{" "}
          (haut du corps, bas du corps, full body…), calée sur tes jours d&apos;entraînement.
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {busy ? (
        <div className="flex items-center gap-3 rounded-control bg-surface-2 px-3.5 py-3">
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          <span className="text-[13.5px] text-muted">
            Je réécris tes séances, cela prend en général moins d&apos;une minute…
          </span>
        </div>
      ) : (
        <Button onClick={run} className="self-start h-11">
          Régénérer mes séances
        </Button>
      )}
      <p className="text-[12px] text-muted-2">
        Ton historique de séances validées et ta progression sont conservés. Seul le
        contenu des entraînements et des repas est réécrit.
      </p>
    </Card>
  );
}
