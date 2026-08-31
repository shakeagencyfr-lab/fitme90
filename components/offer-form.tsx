"use client";

import { useActionState, useState } from "react";
import { addOffer, type OfferState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { OFFER_DURATIONS_MONTHS } from "@/lib/config";

function labelForMonths(m: number): string {
  return m === 12 ? "1 an" : `${m} mois`;
}

/**
 * Formulaire unifié de création d'un plan vendu au client. Le coach choisit
 * d'abord le type (paiement unique OU abonnement), puis le prix et les
 * inclusions (Chat VIP, Coach IA) — des upsells activables par plan.
 */
export function OfferForm({ atLimit }: { atLimit: boolean }) {
  const [state, action, pending] = useActionState(addOffer, {} as OfferState);
  const [billing, setBilling] = useState<"one_time" | "subscription">("one_time");
  const isSub = billing === "subscription";

  if (atLimit) {
    return (
      <Alert tone="info">
        Tu as atteint le maximum de 3 plans (tous types confondus). Supprime un plan pour en ajouter un nouveau.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
      <div className="font-archivo font-bold text-[16px] text-ink">Nouveau plan</div>

      {/* Choix du type */}
      <input type="hidden" name="billing_type" value={billing} />
      <div className="flex flex-col gap-1.5">
        <MonoLabel>Type de plan</MonoLabel>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["one_time", "Paiement unique", "Le client paie une fois"],
            ["subscription", "Abonnement", "Prix récurrent, à l'usage"],
          ] as const).map(([val, title, desc]) => {
            const on = billing === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setBilling(val)}
                aria-pressed={on}
                className={[
                  "tap flex flex-col items-start gap-0.5 rounded-control border px-3.5 py-3 text-left transition-colors",
                  on ? "border-brand bg-brand/[0.06] ring-1 ring-brand/25" : "border-line-4 hover:border-ink",
                ].join(" ")}
              >
                <span className="font-semibold text-[14px] text-ink">{title}</span>
                <span className="text-[12px] text-muted-2">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

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
          <input type="hidden" name="duration_months" value={1} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Prix / mois (€)</MonoLabel>
              <input type="text" inputMode="decimal" name="price_month_euros" placeholder="49"
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink" />
            </label>
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Prix / an (€)</MonoLabel>
              <input type="text" inputMode="decimal" name="price_year_euros" placeholder="490"
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink" />
            </label>
          </div>
          <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-muted">
            <span className="font-semibold text-body">Prix à l&apos;usage, sans durée fixe.</span> Le programme n&apos;a pas de date de fin :
            ses cycles (~4 semaines) se régénèrent et s&apos;adaptent à la progression du client. Renseigne au moins un prix ;
            avec les deux, le client voit un comparateur d&apos;économies.
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Durée</MonoLabel>
              <select name="duration_months" defaultValue={3}
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink">
                {OFFER_DURATIONS_MONTHS.map((m) => (
                  <option key={m} value={m}>{labelForMonths(m)}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Prix (€)</MonoLabel>
              <input type="text" inputMode="decimal" name="price_euros" placeholder="190"
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink" />
            </label>
          </div>
          <span className="-mt-1 text-[12px] text-muted-2">
            Le client paiera ce montant une fois, directement sur ton compte Stripe.
          </span>
        </>
      )}

      {/* Inclusions (upsells par plan) */}
      <div className="flex flex-col gap-2">
        <MonoLabel>Inclusions</MonoLabel>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
          <input type="checkbox" name="coach_ai" defaultChecked className="mt-0.5 size-4 accent-brand" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold text-[14px] text-ink">Coach IA inclus</span>
            <span className="text-[12px] text-muted-2">
              L&apos;assistant IA (entraîné sur ta méthode) accompagne le client au quotidien. Décoché, le client n&apos;y a pas accès.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
          <input type="checkbox" name="vip_chat" className="mt-0.5 size-4 accent-brand" />
          <span className="flex flex-col gap-0.5">
            <span className="font-semibold text-[14px] text-ink">Chat VIP avec toi</span>
            <span className="text-[12px] text-muted-2">
              Le client pourra t&apos;écrire (texte et photos) depuis un onglet dédié. Sans coche, l&apos;onglet n&apos;apparaît pas.
            </span>
          </span>
        </label>
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Plan ajouté.</Alert> : null}

      <Button type="submit" loading={pending} className="self-start h-11">
        Ajouter le plan
      </Button>
    </form>
  );
}
