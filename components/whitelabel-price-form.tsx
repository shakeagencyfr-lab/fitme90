"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { saveWhitelabelPrice, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

// Le revendeur fixe le prix mensuel de son upsell marque blanche (domaine perso
// + SMTP) proposé à ses coachs. Vide = option non proposée.
export function WhitelabelPriceForm({ initialCents }: { initialCents: number | null }) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveWhitelabelPrice, {} as ResellerAiState);
  const [euros, setEuros] = useState(initialCents != null ? (initialCents / 100).toString() : "");

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Upsell marque blanche")}</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          {tx("Un abonnement mensuel que tes coachs peuvent souscrire pour débloquer leur")}{" "}
          <span className="text-body">{tx("domaine personnalisé")}</span> {tx("(CNAME) et l'envoi d'e-mails depuis")} <span className="text-body">{tx("leur")}</span> {tx("serveur (SMTP). Laisse vide pour ne pas le proposer.")}</p>
      </div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Prix / mois (€)")}</MonoLabel>
          <input
            name="price_euros"
            value={euros}
            onChange={(e) => setEuros(e.target.value)}
            placeholder="19"
            className="h-10 w-32 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
          />
        </label>
        <Button type="submit" loading={saving} className="h-10">{tx("Enregistrer")}</Button>
        {state.error ? <div className="w-full"><Alert>{state.error}</Alert></div> : null}
        {state.ok ? <div className="w-full"><Alert tone="info">{tx("Enregistré.")}</Alert></div> : null}
      </form>
    </Card>
  );
}
