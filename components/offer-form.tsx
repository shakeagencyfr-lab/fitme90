"use client";

import { useActionState } from "react";
import { addOffer, type OfferState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { OFFER_DURATIONS_MONTHS } from "@/lib/config";

function labelForMonths(m: number): string {
  if (m === 12) return "1 an";
  return `${m} mois`;
}

/**
 * Formulaire de création d'offre. `mode` fixe le type de facturation :
 * - "one_time"     : prix unique + durée de programme (onglet Ma page).
 * - "subscription" : prix mensuel/annuel, SANS durée (onglet Abonnements) : le
 *   programme est un prix à l'usage dont les cycles évoluent tant que le client
 *   paie et ne résilie pas.
 */
export function OfferForm({ atLimit, mode }: { atLimit: boolean; mode: "one_time" | "subscription" }) {
  const [state, action, pending] = useActionState(addOffer, {} as OfferState);
  const isSub = mode === "subscription";

  if (atLimit) {
    return (
      <Alert tone="info">
        Tu as atteint le maximum de 3 offres (tous types confondus). Supprime une offre pour en ajouter une nouvelle.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="font-archivo font-bold text-[16px] text-ink">
        {isSub ? "Nouvel abonnement" : "Nouvelle offre"}
      </div>

      <input type="hidden" name="billing_type" value={mode} />

      <label className="flex flex-col gap-1.5">
        <MonoLabel>Intitulé</MonoLabel>
        <input
          type="text"
          name="name"
          maxLength={80}
          placeholder={isSub ? "Ex : Coaching illimité" : "Ex : Transformation 3 mois"}
          className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
        />
      </label>

      {isSub ? (
        <>
          {/* Pas de durée : abonnement à l'usage. On garde un cycle interne d'1 mois. */}
          <input type="hidden" name="duration_months" value={1} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Prix / mois (€)</MonoLabel>
              <input
                type="text"
                inputMode="decimal"
                name="price_month_euros"
                placeholder="49"
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Prix / an (€)</MonoLabel>
              <input
                type="text"
                inputMode="decimal"
                name="price_year_euros"
                placeholder="490"
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
              />
            </label>
          </div>
          <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-muted">
            <span className="font-semibold text-body">Prix à l&apos;usage, sans durée fixe.</span> Le programme n&apos;a pas de date de fin :
            ses cycles (~4 semaines) se régénèrent et s&apos;adaptent automatiquement à la progression du client.
            Tant qu&apos;il paie et ne résilie pas, l&apos;accompagnement continue. Renseigne au moins un prix ;
            avec les deux, le client voit un comparateur d&apos;économies mensuel / annuel.
          </div>
        </>
      ) : (
        <>
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
            Le client paiera ce montant une fois, directement sur ton compte Stripe.
          </span>
        </>
      )}

      {/* Option Chat VIP, commune aux deux types. */}
      <label className="mt-1 flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
        <input type="checkbox" name="vip_chat" className="mt-0.5 size-4 accent-brand" />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold text-[14px] text-ink">Chat VIP inclus</span>
          <span className="text-[12px] text-muted-2">
            Le client pourra t&apos;écrire (texte et photos) depuis un onglet dédié. Sans coche, l&apos;onglet n&apos;apparaît pas.
          </span>
        </span>
      </label>

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">{isSub ? "Abonnement ajouté." : "Offre ajoutée."}</Alert> : null}

      <Button type="submit" loading={pending} className="self-start h-11">
        {isSub ? "Ajouter l'abonnement" : "Ajouter l'offre"}
      </Button>
    </form>
  );
}
