"use client";

import { useActionState, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { saveBookingPrice, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

/** Le revendeur fixe le prix mensuel de son pack réservation vendu à part. Vide = pas vendu à part. */
export function BookingPriceForm({ initialCents, includedPlans }: { initialCents: number | null; includedPlans: string[] }) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveBookingPrice, {} as ResellerAiState);
  const [euros, setEuros] = useState(initialCents != null ? (initialCents / 100).toString() : "");

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Vendu à part, en supplément mensuel")}</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          {tx("La prise de rendez-vous en présentiel depuis l'espace client : plannings (plusieurs pour une salle), prestations à durée et prix, paiement en ligne sur le Stripe du coach, rappels, et le Coach IA qui réserve en direct pour les clients en formule Max.")}
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Prix / mois (€)")}</MonoLabel>
          <input
            name="price_euros"
            value={euros}
            onChange={(e) => setEuros(e.target.value)}
            placeholder="29"
            className="h-10 w-32 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
          />
        </label>
        <Button type="submit" loading={saving} className="h-10">
          {tx("Enregistrer")}
        </Button>
        {state.error ? (
          <div className="w-full">
            <Alert>{state.error}</Alert>
          </div>
        ) : null}
        {state.ok ? (
          <div className="w-full">
            <Alert tone="info">{tx("Enregistré.")}</Alert>
          </div>
        ) : null}
      </form>
      <p className="text-[12.5px] leading-[1.6] text-muted-2">
        {includedPlans.length > 0 ? (
          <>
            {tx("Déjà inclus, sans supplément, dans")} <span className="text-body">{includedPlans.join(", ")}</span>
            {tx(". Ce prix ne s'applique qu'aux comptes des autres paliers, à qui le pack est proposé à la carte. Laisse vide pour ne le vendre qu'avec les paliers.")}
          </>
        ) : (
          tx("Tu peux aussi l'inclure sans supplément dans un palier, avec la case « Inclure le pack réservation » plus haut. Ce prix ne concerne alors que les comptes des autres paliers. Vide, et sans palier qui l'inclut, aucun de tes coachs n'y a accès.")
        )}
      </p>
    </Card>
  );
}
