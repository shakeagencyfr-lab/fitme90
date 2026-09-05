"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState } from "react";
import { addPlan, type PlanState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";

/**
 * Formulaire de création d'un palier d'abonnement (facturation Lot C). Le
 * vendeur (plateforme / revendeur) fixe un prix récurrent, une capacité incluse
 * (vide = illimité) et d'éventuels frais de mise en place one-shot.
 *
 * La capacité ne compte pas la même chose selon l'étage, et le mot doit le
 * dire : la plateforme vend à des revendeurs, dont le palier plafonne les
 * COMPTES de leur réseau ; un revendeur vend à des coachs, dont le palier
 * plafonne les CLIENTS. Une seule colonne en base, deux libellés.
 */
export function PlanForm({ atLimit, unit = "clients" }: { atLimit: boolean; unit?: "clients" | "comptes" }) {
  const tx = usePhrase();
  const comptes = unit === "comptes";
  const [state, action, pending] = useActionState(addPlan, {} as PlanState);

  if (atLimit) {
    return (
      <Alert tone="info">
        {tx("Tu as atteint le maximum de paliers. Supprime un palier pour en ajouter un nouveau.")}</Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="font-archivo font-bold text-[16px] text-ink">{tx("Nouveau palier")}</div>

      <label className="flex flex-col gap-1.5">
        <MonoLabel>{tx("Intitulé")}</MonoLabel>
        <input
          type="text"
          name="name"
          maxLength={80}
          placeholder={comptes ? tx("Ex : Réseau 25 comptes") : tx("Ex : Studio 25 clients")}
          className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Prix / mois (€)")}</MonoLabel>
          <input
            type="text"
            inputMode="decimal"
            name="price_month_euros"
            placeholder="49"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Prix / an (€)")}</MonoLabel>
          <input
            type="text"
            inputMode="decimal"
            name="price_year_euros"
            placeholder="490"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{comptes ? tx("Comptes inclus") : tx("Clients inclus")}</MonoLabel>
          <input
            type="text"
            inputMode="numeric"
            name="client_limit"
            placeholder={tx("25 (vide = illimité)")}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Frais de setup (€)")}</MonoLabel>
          <input
            type="text"
            inputMode="decimal"
            name="setup_fee_euros"
            placeholder="0"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
      </div>

      {/* Inclure « Mon site » est un argument de vente pour monter en gamme :
          la case appartient donc au palier, pas à un écran d'options séparé.
          Elle n'a pas de sens quand on vend à des revendeurs, qui ne publient
          pas de page de présentation d'établissement. */}
      {comptes ? null : (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
          <input type="checkbox" name="site_included" className="mt-0.5 size-4 accent-brand" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-ink">{tx("Inclure « Mon site »")}</span>
            <span className="text-[12px] leading-[1.5] text-muted-2">
              {tx("La page de présentation publique (qui, quoi, où, quand, avis), remplie depuis la fiche Google. Décoché, les comptes de ce palier peuvent la souscrire à part si tu en fixes le prix dans Revenu IA.")}
            </span>
          </span>
        </label>
      )}

      <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-muted">
        <span className="font-semibold text-body">{comptes ? tx("Comptes inclus") : tx("Clients inclus")}</span>{" "}
        {comptes
          ? tx("= le nombre de comptes coach ou salle que le revendeur pourra ouvrir sur ce palier ; laisse vide pour « illimité ». Les")
          : tx("= le nombre de comptes clients que le compte pourra gérer sur ce palier ; laisse vide pour « illimité ». Les")}<span className="font-semibold text-body"> {tx("frais de setup")}</span> {tx("sont facturés une seule fois (utile pour les salles : paramétrage du matériel, mise en place). Renseigne au moins un prix.")}</div>

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">{tx("Palier ajouté.")}</Alert> : null}

      <Button type="submit" loading={pending} className="self-start h-11">
        {tx("Ajouter le palier")}</Button>
    </form>
  );
}
