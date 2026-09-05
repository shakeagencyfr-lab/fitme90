"use client";

import { useActionState, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { editFreePlan, type PlanState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import type { Plan } from "@/lib/plans";
import { ALL_RIGHTS, resolveSupply, supplyAllowed, type PlanAiSupply, type SupplyRights } from "@/lib/supply-rights";

/**
 * Le palier gratuit du vendeur : la case qui l'ouvre, et ce qu'il contient.
 *
 * Il ne se crée pas et ne se supprime pas : il existe pour tout vendeur, et
 * la question n'est jamais « en ai-je un ? » mais « est-ce que je le propose,
 * et avec quoi dedans ? ». D'où une carte à part, avant les paliers payants,
 * et une seule case en tête.
 *
 * `sells` dit à qui on vend : la plateforme vend à des revendeurs (qui auront
 * des coachs sous eux, d'où les droits à ouvrir), un revendeur vend à des
 * coachs (d'où la marque blanche à inclure ou non).
 *
 * `rights` dit ce que le vendeur a le droit de proposer ; `contactName`, à
 * qui demander le reste.
 */
export function FreePlanForm({
  plan,
  sells,
  rights = ALL_RIGHTS,
  contactName = "la plateforme",
}: {
  plan: Plan;
  sells: "resellers" | "coaches";
  rights?: SupplyRights;
  contactName?: string;
}) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(editFreePlan, {} as PlanState);
  const [active, setActive] = useState(plan.is_active);
  const [supply, setSupply] = useState<PlanAiSupply>(resolveSupply(rights, plan.ai_supply));
  const [byok, setByok] = useState(plan.coach_byok_allowed);
  const [credits, setCredits] = useState(plan.coach_credits_allowed);
  // Un revendeur en crédits plateforme fournit l'IA à ses coachs : la revente
  // de crédits va avec, la case suit la fourniture.
  const creditsForced = sells === "resellers" && supply === "credits";
  const creditsOn = credits || creditsForced;

  return (
    <Card as="section" className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="active"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="mt-1 size-4 accent-brand"
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-archivo font-bold text-[16px] text-ink">{tx("Proposer un palier gratuit")}</span>
            <span className="text-[13px] leading-[1.55] text-muted">
              {sells === "resellers"
                ? tx("« Démarrez gratuitement » apparaît sur ta page de vente : un revendeur ouvre son espace, avec la marque blanche complète et son premier compte coach offert, sans rien payer.")
                : tx("« Démarrez gratuitement » apparaît sur ta page de vente : un coach ouvre son espace et suit son premier client sans rien payer. Décoché, il lui faut une formule payante pour inscrire qui que ce soit.")}
            </span>
          </span>
        </label>

        {active ? (
          <div className="flex flex-col gap-4 border-t border-line pt-4">
            <div className="flex flex-col gap-1.5">
              <MonoLabel>{tx("Fourniture de l'IA sur ce palier")}</MonoLabel>
              <SupplyCards
                supply={supply}
                onChange={setSupply}
                rights={rights}
                contactName={contactName}
                byokDesc={tx("Tes clients branchent leur propre clé Anthropic et règlent leur consommation directement. Rien d'autre à faire.")}
                creditsDesc={tx("Tu deviens revendeur d'IA : l'IA tourne sur ta chaîne, tes clients t'achètent des crédits et tu choisis ta marge sur chaque action. Tu choisis aussi combien leur en offrir pour démarrer.")}
              />
            </div>

            {supply === "credits" ? (
              <label className="flex flex-col gap-1.5">
                <MonoLabel>{tx("Crédits IA offerts pour démarrer")}</MonoLabel>
                <input
                  type="text"
                  inputMode="numeric"
                  name="starter_credits"
                  defaultValue={String(plan.starter_credits)}
                  placeholder="50"
                  className="h-10 w-40 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
                />
                <span className="text-[12px] leading-[1.5] text-muted-2">
                  {tx("Versés une seule fois, à l'ouverture du compte. Un compte qui résilie puis revient ne les touche pas deux fois.")}
                </span>
              </label>
            ) : null}

            {sells === "coaches" ? (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
                <input type="checkbox" name="whitelabel_included" defaultChecked={plan.whitelabel_included} className="mt-0.5 size-4 accent-brand" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-semibold text-ink">{tx("Inclure le pack marque blanche")}</span>
                  <span className="text-[12px] leading-[1.5] text-muted-2">
                    {tx("Domaine personnalisé, e-mails depuis son serveur, site de présentation. Décoché, le coach garde ta marque et peut souscrire le pack à part si tu en fixes le prix.")}
                  </span>
                </span>
              </label>
            ) : (
              <ResellerRightsFields byok={byok} setByok={setByok} credits={creditsOn} setCredits={setCredits} creditsForced={creditsForced} />
            )}
          </div>
        ) : null}

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Palier gratuit enregistré.")}</Alert> : null}

        <Button type="submit" loading={saving} className="h-10 self-start">{tx("Enregistrer")}</Button>
      </form>
    </Card>
  );
}

/**
 * Les deux fournitures possibles, toujours affichées. Celle que le palier du
 * vendeur ne lui ouvre pas reste visible mais verrouillée : il doit savoir
 * que ça existe, et à qui le demander. Un choix qui disparaît n'invite
 * personne à monter en gamme. Le serveur vérifie de toute façon.
 */
export function SupplyCards({
  supply,
  onChange,
  rights,
  contactName,
  byokDesc,
  creditsDesc,
}: {
  supply: PlanAiSupply;
  onChange: (s: PlanAiSupply) => void;
  rights: SupplyRights;
  contactName: string;
  byokDesc: string;
  creditsDesc: string;
}) {
  const tx = usePhrase();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(
        [
          ["byok", tx("Clé personnelle (BYOK)"), byokDesc],
          ["credits", tx("Crédits IA"), creditsDesc],
        ] as const
      ).map(([val, title, desc]) => {
        const locked = !supplyAllowed(rights, val);
        return (
          <label
            key={val}
            className={[
              "tap flex flex-col gap-0.5 rounded-control border px-3.5 py-2.5 transition-colors",
              locked ? "cursor-not-allowed border-line-4 bg-surface-2" : "cursor-pointer",
              !locked && supply === val ? "border-brand bg-brand/[0.06]" : locked ? "" : "border-line-4 hover:border-ink/40",
            ].join(" ")}
          >
            <input type="radio" name="ai_supply" value={val} checked={supply === val} disabled={locked} onChange={() => onChange(val)} className="sr-only" />
            <span className={`text-[14px] font-semibold ${locked ? "text-muted" : "text-ink"}`}>{title}</span>
            <span className="text-[12px] leading-[1.5] text-muted-2">{desc}</span>
            {locked ? (
              val === "credits" ? (
                <span className="mt-1 text-[12px] font-medium leading-[1.5] text-brand">
                  {tx("Pas compris dans ton palier. Ça t'intéresse ? Contacte")} {contactName}.
                </span>
              ) : (
                <span className="mt-1 text-[12px] font-medium leading-[1.5] text-[#C4471A]">{tx("Ton palier ne le permet pas : tu fournis l'IA.")}</span>
              )
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

/**
 * Plateforme -> revendeur : les deux droits que le palier ouvre. Ce sont ces
 * deux cases qui décident de tout ce que le revendeur pourra faire ensuite
 * (lib/supply-rights.ts) ; leur description doit le dire.
 */
export function ResellerRightsFields({
  byok,
  setByok,
  credits,
  setCredits,
  creditsForced,
}: {
  byok: boolean;
  setByok: (v: boolean) => void;
  credits: boolean;
  setCredits: (v: boolean) => void;
  creditsForced: boolean;
}) {
  const tx = usePhrase();
  return (
    <div className="flex flex-col gap-2">
      <MonoLabel>{tx("Ce que le revendeur pourra proposer à ses coachs")}</MonoLabel>
      <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
        <input type="checkbox" checked={byok} onChange={(e) => setByok(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
        <input type="hidden" name="coach_byok_allowed" value={byok ? "on" : "off"} />
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-ink">{tx("Des coachs en clé personnelle")}</span>
          <span className="text-[12px] leading-[1.5] text-muted-2">
            {tx("Chaque coach branche sa propre clé Anthropic. Décoché, le revendeur fournit l'IA à tout son réseau.")}
          </span>
        </span>
      </label>
      <label className={`flex items-start gap-2.5 rounded-control border border-line-4 bg-surface-2 p-3.5 ${creditsForced ? "cursor-default" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={credits}
          disabled={creditsForced}
          onChange={(e) => setCredits(e.target.checked)}
          className="mt-0.5 size-4 accent-brand"
        />
        <input type="hidden" name="coach_credits_allowed" value={credits ? "on" : "off"} />
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-ink">{tx("La revente de crédits IA à ses coachs")}</span>
          <span className="text-[12px] leading-[1.5] text-muted-2">
            {tx("Le revendeur fournit l'IA à ses coachs et la leur revend en crédits, avec sa marge. Décoché, il ne voit rien des crédits : ses coachs branchent chacun leur clé.")}
          </span>
          {creditsForced ? (
            <span className="text-[12px] font-medium text-brand">
              {tx("Un revendeur en crédits plateforme fournit l'IA à ses coachs : la revente va avec ce palier.")}
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}
