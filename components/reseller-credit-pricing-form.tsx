"use client";

import { useActionState, useState } from "react";
import { saveResellerCredits, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { actionCreditMargin, programCreditMargin, type CreditMargin } from "@/lib/config";

interface Props {
  initialPriceCents: number;
  initialProgramCredits: number;
}

// Tarification en crédits du revendeur d'IA. Deux réglages seulement :
//  1) le prix de vente d'1 crédit ; 2) le nb de crédits pour un programme.
// En dessous, un aperçu coût Anthropic / prix client / marge, recalculé en direct.
export function ResellerCreditPricingForm({ initialPriceCents, initialProgramCredits }: Props) {
  const [state, action, saving] = useActionState(saveResellerCredits, {} as ResellerAiState);
  const [priceCents, setPriceCents] = useState<number>(initialPriceCents);
  const [programCredits, setProgramCredits] = useState<number>(initialProgramCredits);

  const priceEur = priceCents / 100;
  const actionM = actionCreditMargin(priceCents);
  const programM = programCreditMargin(priceCents, programCredits);

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Tarification en crédits</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          <span className="text-body">1 crédit = 1 action</span> (message Coach IA, régénération de
          recette ou d&apos;exercice). La génération d&apos;un programme est un livrable premium
          (modèle Opus) : tu choisis combien de crédits elle coûte. Tu ne règles que ces deux points,
          la marge se calcule toute seule.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <MonoLabel>Prix de vente d&apos;1 crédit (€)</MonoLabel>
            <input
              type="number"
              name="ai_credit_price_cents_display"
              min={0}
              step="0.01"
              value={(priceCents / 100).toString()}
              onChange={(e) => setPriceCents(Math.max(0, Math.round((Number(e.target.value) || 0) * 100)))}
              className="w-full max-w-[200px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
            />
            <input type="hidden" name="ai_credit_price_cents" value={priceCents} />
            <span className="text-[12px] text-muted-2">Ce que paie un coach pour 1 action de ses clients.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>Crédits par génération de programme</MonoLabel>
            <input
              type="number"
              name="ai_program_credits"
              min={0}
              max={1000}
              value={programCredits}
              onChange={(e) => setProgramCredits(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-full max-w-[200px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
            />
            <span className="text-[12px] text-muted-2">Ex : 5 crédits = {(priceEur * programCredits).toFixed(2)} € pour un programme.</span>
          </label>
        </div>

        {/* Aperçu coût / prix / marge */}
        <div className="overflow-x-auto rounded-control border border-line-4">
          <table className="w-full min-w-[440px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                {["Action", "Ton coût (Anthropic)", "Le client paie", "Ta marge"].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="1 action = 1 crédit" m={actionM} />
              <Row label={`1 programme = ${programCredits} crédit${programCredits > 1 ? "s" : ""}`} m={programM} />
            </tbody>
          </table>
        </div>
        <p className="text-[12px] leading-[1.6] text-muted-2">
          Coût estimé d&apos;après les tarifs publics Anthropic (action sur Haiku, programme sur Opus),
          converti en euros à titre indicatif. La marge réelle dépend du taux de change et de l&apos;usage.
        </p>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Tarification enregistrée.</Alert> : null}

        <Button type="submit" loading={saving} className="self-start h-11">
          Enregistrer la tarification
        </Button>
      </form>
    </Card>
  );
}

function Row({ label, m }: { label: string; m: CreditMargin }) {
  const positive = m.marginEur >= 0;
  return (
    <tr className="border-b border-line-2 last:border-0">
      <td className="px-3.5 py-3 font-semibold text-ink">{label}</td>
      <td className="px-3.5 py-3 tabular-nums text-body">≈ {m.costEur.toFixed(2)} €</td>
      <td className="px-3.5 py-3 tabular-nums text-body">{m.priceEur.toFixed(2)} €</td>
      <td className="px-3.5 py-3 tabular-nums">
        <span className={positive ? "font-semibold text-brand" : "font-semibold text-[#C4471A]"}>
          {positive ? "+" : ""}
          {m.marginEur.toFixed(2)} €
        </span>
        {m.priceEur > 0 ? (
          <span className="ml-1.5 text-[12px] text-muted-2">({Math.round(m.marginPct)} %)</span>
        ) : null}
      </td>
    </tr>
  );
}
