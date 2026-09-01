"use client";

import { useActionState, useState } from "react";
import { addOffer, type OfferState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { OFFER_DURATIONS_MONTHS, PRODUCTS, monthlyEquivalentCents, formatEuros, type OfferDurationMonths } from "@/lib/config";

/**
 * Formulaire de création d'un plan vendu au client. Le coach choisit d'abord
 * le PRODUIT (3 mois ou 12 mois : c'est lui qui fixe la structure du programme
 * et l'IA spécialisée), puis le mode de paiement (unique ou mensuel), le prix
 * et les inclusions (Chat VIP, Coach IA).
 */
export function OfferForm({ atLimit }: { atLimit: boolean }) {
  const [state, action, pending] = useActionState(addOffer, {} as OfferState);
  const [months, setMonths] = useState<OfferDurationMonths>(12);
  const [billing, setBilling] = useState<"one_time" | "subscription">("one_time");
  const [price, setPrice] = useState("");
  const isSub = billing === "subscription";
  const product = PRODUCTS[months];
  const priceCents = Math.round((Number(price.replace(",", ".")) || 0) * 100);
  const perMonth = monthlyEquivalentCents(priceCents, months);

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

      {/* Choix du produit : la durée fixe la structure du programme. */}
      <input type="hidden" name="duration_months" value={months} />
      <div className="flex flex-col gap-1.5">
        <MonoLabel>Produit</MonoLabel>
        <div className="grid grid-cols-2 gap-2">
          {OFFER_DURATIONS_MONTHS.map((m) => {
            const p = PRODUCTS[m];
            const on = months === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                aria-pressed={on}
                className={[
                  "tap flex flex-col items-start gap-0.5 rounded-control border px-3.5 py-3 text-left transition-colors",
                  on ? "border-brand bg-brand/[0.06] ring-1 ring-brand/25" : "border-line-4 hover:border-ink",
                ].join(" ")}
              >
                <span className="font-semibold text-[14px] text-ink">{m} mois</span>
                <span className="text-[12px] text-muted-2">{p.promise}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[12px] leading-relaxed text-muted-2">
          {months === 3
            ? "Un sprint de 3 cycles avec une ligne d'arrivée : le client voit la différence en 12 semaines."
            : "4 blocs de 3 mois : chaque bloc est reconstruit à partir de ce que le client a réellement fait dans le précédent (bases, volume, force, pic)."}
        </span>
      </div>

      {/* Choix du mode de paiement */}
      <input type="hidden" name="billing_type" value={billing} />
      <div className="flex flex-col gap-1.5">
        <MonoLabel>Paiement</MonoLabel>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["one_time", "Paiement unique", "Le client paie une fois"],
            ["subscription", "Mensuel", "Prix par mois, sans engagement"],
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
          placeholder={`Ex : ${product.name}`}
          className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
        />
      </label>

      {isSub ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Prix / mois (€)</MonoLabel>
              <input type="text" inputMode="decimal" name="price_month_euros" placeholder={months === 12 ? "49" : "69"}
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink" />
            </label>
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Prix / an (€), optionnel</MonoLabel>
              <input type="text" inputMode="decimal" name="price_year_euros" placeholder="490"
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink" />
            </label>
          </div>
          <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-muted">
            <span className="font-semibold text-body">Mensuel, sans engagement.</span> Le client règle chaque mois, sur ton
            compte Stripe, et peut arrêter quand il veut. Le programme suit la structure du produit « {months} mois » et
            continue d&apos;évoluer par blocs tant que l&apos;abonnement est actif. Avec un prix annuel en plus, le client voit
            un comparateur d&apos;économies.
          </div>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>Prix (€)</MonoLabel>
            <input
              type="text"
              inputMode="decimal"
              name="price_euros"
              placeholder={months === 12 ? "490" : "190"}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full max-w-[240px] rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
            />
          </label>
          <span className="-mt-1 text-[12px] leading-relaxed text-muted-2">
            Le client paiera ce montant une fois, directement sur ton compte Stripe.
            {perMonth > 0 ? (
              <>
                {" "}Sur sa page, il verra aussi l&apos;équivalent :{" "}
                <span className="text-body">{formatEuros(perMonth)}/mois</span>.
                {months === 12
                  ? " Pour que le 12 mois soit évident, vise 2,5 à 3 fois le prix de ton 3 mois, pas 4."
                  : ""}
              </>
            ) : null}
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
