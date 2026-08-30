"use client";

import { useActionState } from "react";
import { addOffer, type OfferState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { OFFER_DURATIONS_MONTHS } from "@/lib/config";

function labelForMonths(m: number): string {
  if (m === 12) return "1 an";
  return `${m} mois`;
}

export function OfferForm({ atLimit }: { atLimit: boolean }) {
  const [state, action, pending] = useActionState(addOffer, {} as OfferState);

  if (atLimit) {
    return (
      <Alert tone="info">
        Tu as atteint le maximum de 3 offres. Supprime une offre pour en ajouter une nouvelle.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="font-archivo font-bold text-[16px] text-ink">Nouvelle offre</div>

      <label className="flex flex-col gap-1.5">
        <MonoLabel>Intitulé</MonoLabel>
        <input
          type="text"
          name="name"
          maxLength={80}
          placeholder="Ex : Transformation 3 mois"
          className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Durée</MonoLabel>
          <select
            name="duration_months"
            defaultValue={3}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            {OFFER_DURATIONS_MONTHS.map((m) => (
              <option key={m} value={m}>
                {labelForMonths(m)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>Prix (€)</MonoLabel>
          <input
            type="text"
            inputMode="decimal"
            name="price_euros"
            placeholder="190"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
      </div>
      <span className="-mt-1 text-[12px] text-muted-2">
        Le client paiera ce montant directement sur ton compte Stripe.
      </span>

      <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
        <input type="checkbox" name="vip_chat" className="mt-0.5 size-4 accent-brand" />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold text-[14px] text-ink">Chat VIP inclus</span>
          <span className="text-[12px] text-muted-2">
            Le client de cette offre pourra t&apos;écrire (texte et photos) depuis un onglet dédié. Sans coche, l&apos;onglet n&apos;apparaît pas.
          </span>
        </span>
      </label>

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Offre ajoutée.</Alert> : null}

      <Button type="submit" loading={pending} className="self-start h-11">
        Ajouter l&apos;offre
      </Button>
    </form>
  );
}
