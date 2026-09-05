"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
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
export function PlanForm({
  atLimit,
  unit = "clients",
  byokAllowed = true,
}: {
  atLimit: boolean;
  unit?: "clients" | "comptes";
  /** Un revendeur sans le droit de laisser ses coachs en clé perso ne vend que des paliers qui fournissent l'IA. */
  byokAllowed?: boolean;
}) {
  const tx = usePhrase();
  const comptes = unit === "comptes";
  const [state, action, pending] = useActionState(addPlan, {} as PlanState);
  const [supply, setSupply] = useState<"byok" | "credits">(byokAllowed ? "byok" : "credits");
  const [byok, setByok] = useState(true);
  const [credits, setCredits] = useState(false);

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
          moment de le vendre, et non compte par compte après coup. */}
      <div className="flex flex-col gap-1.5">
        <MonoLabel>{tx("Fourniture de l'IA")}</MonoLabel>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["byok", tx("Clé personnelle (BYOK)"), comptes ? tx("Le revendeur branche sa propre clé Anthropic et règle Anthropic directement.") : tx("Le coach branche sa propre clé Anthropic et règle Anthropic directement.")],
              ["credits", tx("Crédits IA"), comptes ? tx("L'IA tourne sur ta clé, le revendeur t'achète des crédits et les revend avec sa marge.") : tx("L'IA tourne sur ta chaîne, le coach t'achète des crédits.")],
            ] as const
          ).map(([val, title, desc]) => {
            const locked = val === "byok" && !byokAllowed;
            return (
              <label
                key={val}
                className={[
                  "tap flex flex-col gap-0.5 rounded-control border px-3.5 py-2.5 transition-colors",
                  locked ? "cursor-not-allowed border-line-4 opacity-60" : "cursor-pointer",
                  !locked && supply === val ? "border-brand bg-brand/[0.06]" : "border-line-4 hover:border-ink/40",
                ].join(" ")}
              >
                <input type="radio" name="ai_supply" value={val} checked={supply === val} disabled={locked} onChange={() => setSupply(val)} className="sr-only" />
                <span className="text-[14px] font-semibold text-ink">{title}</span>
                <span className="text-[12px] leading-[1.5] text-muted-2">{desc}</span>
                {locked ? <span className="text-[12px] font-medium text-[#C4471A]">{tx("Ton palier ne le permet pas : tu fournis l'IA.")}</span> : null}
              </label>
            );
          })}
        </div>
      </div>

      {/* Inclure la marque blanche est un argument de vente pour monter en
          gamme : la case appartient au palier. Un revendeur l'a toujours, la
          question ne se pose que pour les coachs. */}
      {comptes ? (
        <div className="flex flex-col gap-2">
          <MonoLabel>{tx("Ce que le revendeur pourra proposer à ses coachs")}</MonoLabel>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
            <input type="checkbox" checked={byok} onChange={(e) => setByok(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
            <input type="hidden" name="coach_byok_allowed" value={byok ? "on" : "off"} />
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-ink">{tx("Des coachs en clé personnelle")}</span>
              <span className="text-[12px] leading-[1.5] text-muted-2">{tx("Chaque coach branche sa propre clé Anthropic.")}</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
            <input type="checkbox" name="coach_credits_allowed" checked={credits} onChange={(e) => setCredits(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-ink">{tx("La revente de crédits IA à ses coachs")}</span>
              <span className="text-[12px] leading-[1.5] text-muted-2">{tx("Le revendeur fournit l'IA et prend sa marge sur chaque crédit. Une ligne de plus sur ton palier, et une belle opportunité pour lui.")}</span>
            </span>
          </label>
        </div>
      ) : (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
          <input type="checkbox" name="whitelabel_included" className="mt-0.5 size-4 accent-brand" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-ink">{tx("Inclure le pack marque blanche")}</span>
            <span className="text-[12px] leading-[1.5] text-muted-2">
              {tx("Domaine personnalisé, e-mails depuis son serveur, site de présentation. Décoché, les comptes de ce palier peuvent souscrire le pack à part si tu en fixes le prix dans Revenu IA.")}
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
