"use client";

import { useActionState, useState } from "react";
import { saveResellerCredits, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { actionCreditMargin, programCreditMargin, type CreditMargin } from "@/lib/config";

interface Props {
  initialActionPriceCents: number;
  initialProgramPriceCents: number;
}

// Tarification en crédits du revendeur d'IA. DEUX types de crédits, chacun avec
// son prix de vente ; en dessous, le coût Anthropic et la marge, en direct.
export function ResellerCreditPricingForm({ initialActionPriceCents, initialProgramPriceCents }: Props) {
  const [state, action, saving] = useActionState(saveResellerCredits, {} as ResellerAiState);
  const [actionCents, setActionCents] = useState<number>(initialActionPriceCents);
  const [programCents, setProgramCents] = useState<number>(initialProgramPriceCents);

  const actionM = actionCreditMargin(actionCents);
  const programM = programCreditMargin(programCents);

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Tarification en crédits</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          Deux types de crédits, chacun avec son prix de revente. Le{" "}
          <span className="text-body">crédit IA</span> couvre toutes les actions courantes (modèle
          Haiku, peu coûteux) ; le <span className="text-body">crédit programme IA</span> couvre la
          génération d&apos;un programme (modèle Opus, plus cher). Tu fixes les prix, la marge se
          calcule toute seule.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <PriceInput
            name="ai_credit_price_cents"
            label="Prix d'1 crédit IA (€)"
            hint="1 action = chat, recette ou régénération d'exercice."
            cents={actionCents}
            onCents={setActionCents}
          />
          <PriceInput
            name="ai_program_credit_price_cents"
            label="Prix d'1 crédit programme IA (€)"
            hint="1 génération de programme complète (Opus)."
            cents={programCents}
            onCents={setProgramCents}
          />
        </div>

        {/* Aperçu coût / prix / marge des deux crédits */}
        <div className="overflow-x-auto rounded-control border border-line-4">
          <table className="w-full min-w-[460px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                {["Type de crédit", "Ton coût (Anthropic)", "Le client paie", "Ta marge"].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Crédit IA (1 action)" model="Haiku" m={actionM} />
              <Row label="Crédit programme IA" model="Opus" m={programM} />
            </tbody>
          </table>
        </div>
        <p className="text-[12px] leading-[1.6] text-muted-2">
          Coût estimé d&apos;après les tarifs publics Anthropic, converti en euros à titre indicatif.
          La marge réelle dépend du taux de change et de l&apos;usage.
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

function PriceInput({
  name,
  label,
  hint,
  cents,
  onCents,
}: {
  name: string;
  label: string;
  hint: string;
  cents: number;
  onCents: (c: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <MonoLabel>{label}</MonoLabel>
      <input
        type="number"
        min={0}
        step="0.01"
        value={(cents / 100).toString()}
        onChange={(e) => onCents(Math.max(0, Math.round((Number(e.target.value) || 0) * 100)))}
        className="w-full max-w-[200px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
      />
      <input type="hidden" name={name} value={cents} />
      <span className="text-[12px] text-muted-2">{hint}</span>
    </label>
  );
}

function Row({ label, model, m }: { label: string; model: string; m: CreditMargin }) {
  const positive = m.marginEur >= 0;
  return (
    <tr className="border-b border-line-2 last:border-0">
      <td className="px-3.5 py-3">
        <span className="font-semibold text-ink">{label}</span>
        <span className="ml-2 rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-2">
          {model}
        </span>
      </td>
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
