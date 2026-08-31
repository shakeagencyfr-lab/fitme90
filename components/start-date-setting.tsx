"use client";

import { useActionState, useState } from "react";
import { updateStartDate, type ProfilState } from "@/app/app/profil/actions";
import { Card, Button, Alert, MonoLabel } from "@/components/ui";

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function StartDateSetting({ current }: { current: string }) {
  const [state, action, pending] = useActionState(updateStartDate, {} as ProfilState);
  // Initialiseur paresseux : calcul de la fenêtre une fois, hors du rendu pur.
  const [{ min, max }] = useState(() => ({
    min: iso(Date.now() - 30 * 86_400_000),
    max: iso(Date.now() + 60 * 86_400_000),
  }));

  return (
    <Card as="section" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <MonoLabel>Date de début du programme</MonoLabel>
        <p className="text-[13px] text-muted">
          Le décompte de ton programme et ton calendrier partent de cette date. La
          modifier recale l&apos;agenda, les séances et la nutrition.
        </p>
      </div>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Date de début mise à jour.</Alert> : null}
      <form action={action} className="flex flex-wrap items-end gap-3">
        <input
          type="date"
          name="start_date"
          defaultValue={current || undefined}
          min={min}
          max={max}
          className="tap rounded-control border border-line-3 bg-surface-2 px-3.5 text-ink outline-none focus:border-ink"
        />
        <Button type="submit" loading={pending} className="h-11">
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
