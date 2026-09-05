"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { saveResellerCredits, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { actionCreditMargin, programGenerationMargin, formatEuros, formatEurPrecise } from "@/lib/config";

interface Props {
  initialPriceCents: number;
  initialProgramCredits: number;
  /** Prix auquel CE fournisseur achète lui-même le crédit (revendeur en crédits plateforme), sinon null. */
  buyPriceCents?: number | null;
  /** Ce fournisseur définit-il lui-même l'unité (nombre de crédits par
   *  génération), ou la reçoit-il de son propre fournisseur ? */
  canSetCredits?: boolean;
  /** Libellé de l'acheteur : « tes coachs » (revendeur) ou « tes revendeurs » (plateforme). */
  buyerLabel?: string;
}

/**
 * Tarification du crédit IA par un fournisseur. UN SEUL crédit : le prix de
 * revente, et le nombre de crédits que coûte une génération de programme. Le
 * coût réel et la marge se recalculent en direct, pour qu'un réglage à perte
 * ne passe jamais inaperçu.
 */
export function ResellerCreditPricingForm({
  initialPriceCents,
  initialProgramCredits,
  buyPriceCents = null,
  buyerLabel = "tes coachs",
  canSetCredits = true,
}: Props) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveResellerCredits, {} as ResellerAiState);
  const [cents, setCents] = useState<number>(initialPriceCents);
  // Imposé par le fournisseur : l'état ne bouge pas, il n'y a rien à régler.
  const [programCredits, setProgramCredits] = useState<number>(initialProgramCredits);

  // Coût du crédit : celui du fournisseur (prix d'achat) s'il en a un, sinon
  // le coût Anthropic estimé d'une action.
  const unit = actionCreditMargin(cents);
  const costEur = buyPriceCents != null ? buyPriceCents / 100 : unit.costEur;
  const marginEur = unit.priceEur - costEur;
  const marginPct = unit.priceEur > 0 ? Math.round((marginEur / unit.priceEur) * 100) : 0;
  const program = programGenerationMargin(programCredits, cents);
  const programCost = buyPriceCents != null ? (programCredits * buyPriceCents) / 100 : program.costEur;
  const programMargin = program.priceEur - programCost;

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Tarification du crédit IA")}</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          {tx("Un seul crédit IA. Chaque message au Coach IA en consomme")} <span className="text-body">1</span>
          {canSetCredits
            ? tx(" ; une génération de programme en consomme le nombre que tu fixes ici.")
            : tx(" ; une génération en consomme le nombre fixé par ton fournisseur.")}{" "}
          {tx("Tu choisis le prix de revente à")} {buyerLabel}{tx(", la marge se calcule toute seule.")}</p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Prix de revente d'1 crédit IA (€)")}</MonoLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={(cents / 100).toString()}
              onChange={(e) => setCents(Math.max(0, Math.round((Number(e.target.value) || 0) * 100)))}
              className="w-full max-w-[200px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
            />
            <input type="hidden" name="ai_credit_price_cents" value={cents} />
            <span className="text-[12px] text-muted-2">
              {buyPriceCents != null
                ? `Tu l'achètes ${formatEuros(buyPriceCents)} à ton fournisseur.`
                : "1 crédit = 1 message au Coach IA. Recettes et alternatives d'exercice sont calculées, donc gratuites."}
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Crédits consommés par génération de programme")}</MonoLabel>
            {canSetCredits ? (
              <>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={programCredits}
                  onChange={(e) => setProgramCredits(Math.max(1, Math.min(500, Math.trunc(Number(e.target.value) || 1))))}
                  className="w-full max-w-[200px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
                />
                <input type="hidden" name="ai_program_credits" value={programCredits} />
                <span className="text-[12px] text-muted-2">
                  {tx("Un programme de 12 mois compte 4 générations (une par bloc de 3 mois).")}</span>
              </>
            ) : (
              <>
                {/* Pas un champ : ton fournisseur te débite ce nombre, tu ne
                    peux pas en revendre un autre sans perdre la différence. */}
                <div className="flex h-[46px] w-full max-w-[200px] items-center rounded-control border border-line-4 bg-surface px-3.5 text-[15px] text-muted">
                  {programCredits}
                </div>
                <span className="text-[12px] leading-[1.5] text-muted-2">
                  {tx("Fixé par ton fournisseur : c'est ce qu'il te débite pour une génération. Tu choisis ton prix de revente, pas la quantité.")}</span>
              </>
            )}
          </label>
        </div>

        <div className="overflow-x-auto rounded-control border border-line-4">
          <table className="w-full min-w-[460px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                {["", "Ton coût", "L'acheteur paie", "Ta marge"].map((h, i) => (
                  <th key={i} className="px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label={tx("1 crédit IA (1 action)")} cost={costEur} price={unit.priceEur} margin={marginEur} pct={marginPct} />
              <Row
                label={`1 génération de programme (${programCredits} crédits)`}
                cost={programCost}
                price={program.priceEur}
                margin={programMargin}
                pct={program.priceEur > 0 ? Math.round((programMargin / program.priceEur) * 100) : 0}
              />
            </tbody>
          </table>
        </div>
        <p className="text-[12px] leading-[1.6] text-muted-2">
          {buyPriceCents != null
            ? `Ton coût est ton prix d'achat du crédit. Sur une génération, ton fournisseur t'en débite ${programCredits}, le nombre qu'il a fixé.`
            : "Coût MESURÉ sur la conso réelle (table ai_calls), converti en euros à titre indicatif. Les crédits partent tous en messages de chat : recettes et alternatives d'exercice ne passent plus par un modèle. Une génération de programme coûte bien plus qu'un message : vérifie qu'elle reste rentable au nombre de crédits choisi."}
        </p>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Tarification enregistrée.")}</Alert> : null}

        <Button type="submit" loading={saving} className="self-start h-11">
          {tx("Enregistrer la tarification")}</Button>
      </form>
    </Card>
  );
}

function Row({ label, cost, price, margin, pct }: { label: string; cost: number; price: number; margin: number; pct: number }) {
  const positive = margin >= 0;
  return (
    <tr className="border-b border-line-2 last:border-0">
      <td className="px-3.5 py-3 font-semibold text-ink">{label}</td>
      <td className="px-3.5 py-3 tabular-nums text-body">≈ {formatEurPrecise(cost)}</td>
      <td className="px-3.5 py-3 tabular-nums text-body">{price.toFixed(2)} €</td>
      <td className="px-3.5 py-3 tabular-nums">
        <span className={positive ? "font-semibold text-brand" : "font-semibold text-[#C4471A]"}>
          {positive ? "+" : ""}
          {formatEurPrecise(margin).replace("€", "").trim()} €
        </span>
        {price > 0 ? <span className="ml-1.5 text-[12px] text-muted-2">({pct} %)</span> : null}
      </td>
    </tr>
  );
}
