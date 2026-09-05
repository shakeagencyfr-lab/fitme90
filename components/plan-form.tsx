"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { addPlan, type PlanState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { SupplyCards, ResellerRightsFields } from "@/components/free-plan-form";
import { ALL_RIGHTS, resolveSupply, type PlanAiSupply, type SupplyRights } from "@/lib/supply-rights";

/**
 * Formulaire de création d'un palier d'abonnement (facturation Lot C). Le
 * vendeur (plateforme / revendeur) fixe un prix récurrent, une capacité incluse
 * (vide = illimité) et d'éventuels frais de mise en place one-shot.
 *
 * La capacité ne compte pas la même chose selon l'étage, et le mot doit le
 * dire : la plateforme vend à des revendeurs, dont le palier plafonne les
 * COMPTES de leur réseau ; un revendeur vend à des coachs, dont le palier
 * plafonne les CLIENTS. Une seule colonne en base, deux libellés.
 *
 * `rights` : ce que le vendeur a le droit de proposer. Ce qui ne lui est pas
 * ouvert reste visible, verrouillé, avec à qui le demander (`contactName`).
 */
export function PlanForm({
  atLimit,
  unit = "clients",
  rights = ALL_RIGHTS,
  contactName = "la plateforme",
}: {
  atLimit: boolean;
  unit?: "clients" | "comptes";
  rights?: SupplyRights;
  contactName?: string;
}) {
  const tx = usePhrase();
  const comptes = unit === "comptes";
  const [state, action, pending] = useActionState(addPlan, {} as PlanState);
  const [supply, setSupply] = useState<PlanAiSupply>(resolveSupply(rights, "byok"));
  const [byok, setByok] = useState(true);
  const [credits, setCredits] = useState(false);
  // Un revendeur en crédits plateforme fournit l'IA à ses coachs : la revente
  // de crédits va avec, la case suit la fourniture.
  const creditsForced = comptes && supply === "credits";

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

      {/* Le palier porte son modèle : la fourniture d'IA se choisit ici, au
          moment de le vendre, et non compte par compte après coup. Ce que le
          palier du vendeur ne lui ouvre pas reste visible, verrouillé. */}
      <div className="flex flex-col gap-1.5">
        <MonoLabel>{tx("Fourniture de l'IA")}</MonoLabel>
        <SupplyCards
          supply={supply}
          onChange={setSupply}
          rights={rights}
          contactName={contactName}
          byokDesc={comptes ? tx("Le revendeur branche sa propre clé Anthropic et règle Anthropic directement.") : tx("Tes coachs branchent leur propre clé Anthropic et règlent Anthropic directement.")}
          creditsDesc={comptes ? tx("L'IA tourne sur ta clé, le revendeur t'achète des crédits et les revend avec sa marge.") : tx("Tu deviens revendeur d'IA : l'IA tourne sur ta chaîne, tes coachs t'achètent des crédits et tu choisis ta marge sur chaque action.")}
        />
      </div>

      {/* Inclure la marque blanche est un argument de vente pour monter en
          gamme : la case appartient au palier. Un revendeur l'a toujours, la
          question ne se pose que pour les coachs. */}
      {comptes ? (
        <ResellerRightsFields byok={byok} setByok={setByok} credits={credits || creditsForced} setCredits={setCredits} creditsForced={creditsForced} />
      ) : (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
          <input type="checkbox" name="whitelabel_included" className="mt-0.5 size-4 accent-brand" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-ink">{tx("Inclure le pack marque blanche")}</span>
            <span className="text-[12px] leading-[1.5] text-muted-2">
              {tx("Domaine personnalisé, e-mails depuis son serveur, site de présentation. Décoché, les comptes de ce palier peuvent souscrire le pack à part si tu en fixes le prix plus bas.")}
            </span>
          </span>
        </label>
      )}

      <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-muted">
        <span className="font-semibold text-body">{comptes ? tx("Comptes inclus") : tx("Clients inclus")}</span>{" "}
        {comptes
          ? tx("= le nombre de comptes coach ou salle que le revendeur pourra ouvrir sur ce palier ; laisse vide pour « illimité ». Les")
          : tx("= le nombre de comptes clients que le compte pourra gérer sur ce palier ; laisse vide pour « illimité ». Les")}<span className="font-semibold text-body"> {tx("frais de setup")}</span> {tx("s'ajoutent à la première échéance seulement : le premier mois est majoré de ce montant, puis l'abonnement continue à son tarif. Renseigne au moins un prix ; avec les deux, la page de vente affiche une bascule mensuel / annuel.")}</div>

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">{tx("Palier ajouté.")}</Alert> : null}

      <Button type="submit" loading={pending} className="self-start h-11">
        {tx("Ajouter le palier")}</Button>
    </form>
  );
}
