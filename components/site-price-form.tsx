"use client";

import { useActionState, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { saveSitePrice, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

/**
 * Le revendeur fixe le prix mensuel de l'option « Mon site » proposée à ses
 * coachs et salles. Vide = option non proposée à la carte.
 *
 * Ce prix ne concerne QUE les coachs dont le palier n'inclut pas déjà le site :
 * l'écran le dit, sinon un revendeur qui l'a inclus partout croit facturer deux
 * fois la même chose.
 */
export function SitePriceForm({ initialCents, includedPlans }: { initialCents: number | null; includedPlans: string[] }) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveSitePrice, {} as ResellerAiState);
  const [euros, setEuros] = useState(initialCents != null ? (initialCents / 100).toString() : "");

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Option « Mon site »")}</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          {tx("Une page de présentation publique à l'adresse de ton coach ou de ta salle : qui, quoi, où, quand, les avis, et une introduction aux programmes en ligne. Elle se remplit toute seule depuis la fiche Google.")}
        </p>
      </div>

      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Prix / mois (€)")}</MonoLabel>
          <input
            name="price_euros"
            value={euros}
            onChange={(e) => setEuros(e.target.value)}
            placeholder="15"
            className="h-10 w-32 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
          />
        </label>
        <Button type="submit" loading={saving} className="h-10">{tx("Enregistrer")}</Button>
        {state.error ? <div className="w-full"><Alert>{state.error}</Alert></div> : null}
        {state.ok ? <div className="w-full"><Alert tone="info">{tx("Enregistré.")}</Alert></div> : null}
      </form>

      {/* Deux façons de la vendre, et elles ne se remplacent pas. Sans cette
          note, le revendeur qui a coché l'option sur un palier se demande
          pourquoi il doit aussi remplir un prix. */}
      <p className="text-[12.5px] leading-[1.6] text-muted-2">
        {includedPlans.length > 0 ? (
          <>
            {tx("Déjà incluse, sans supplément, dans")}{" "}
            <span className="text-body">{includedPlans.join(", ")}</span>
            {tx(". Ce prix ne s'applique qu'aux comptes des autres paliers, à qui l'option est proposée à la carte. Laisse vide pour ne la vendre qu'avec les paliers.")}
          </>
        ) : (
          tx("Tu peux aussi l'inclure sans supplément dans un palier, depuis l'onglet Paliers : c'est un argument de vente pour monter en gamme. Ce prix ne concerne alors que les comptes des autres paliers.")
        )}
      </p>
    </Card>
  );
}
