"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { saveAffiliation, type AffiliationState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

export function AffiliationForm({ enabled, reward }: { enabled: boolean; reward: string | null }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(saveAffiliation, {} as AffiliationState);
  const [on, setOn] = useState(enabled);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Programme de parrainage")}</div>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          {tx("Active l'affiliation pour tes clients : chacun reçoit un lien personnel à partager. La personne qui s'inscrit via ce lien lui est rattachée, et tu récompenses le parrain.")}</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
          <input
            type="checkbox"
            name="affiliation_enabled"
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
            className="mt-0.5 size-4 accent-brand"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold text-[14px] text-ink">{tx("Activer le parrainage")}</span>
            <span className="text-[12px] text-muted-2">
              {tx("Décoché, tes clients ne voient pas d'onglet parrainage.")}</span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Récompense du parrain")}</MonoLabel>
          <input
            type="text"
            name="affiliation_reward"
            defaultValue={reward ?? ""}
            maxLength={200}
            placeholder={tx("Ex : 1 mois offert pour chaque filleul qui s'abonne")}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
          <span className="text-[12px] text-muted-2">
            {tx("Tu appliques la récompense toi-même (geste commercial, code promo…). Elle est affichée à tes clients.")}</span>
        </label>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Réglages enregistrés.")}</Alert> : null}

        <Button type="submit" loading={pending} className="self-start h-11">
          {tx("Enregistrer")}</Button>
      </form>
    </Card>
  );
}
