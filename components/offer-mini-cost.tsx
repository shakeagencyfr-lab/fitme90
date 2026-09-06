"use client";

import { usePhrase } from "@/components/locale-provider";
import { formatEuros, planMaxCostEur, planMaxCredits, programDaysForMonths } from "@/lib/config";
import type { BestPack } from "@/lib/credits";

/**
 * Ce que coûte un plan en formule Mini : la génération du programme, une fois
 * (deux fois pour un douze mois, un bloc à la fois), et rien d'autre.
 *
 * La carte de coût n'existait que pour le Coach IA, avec ses quotas et son
 * plafond. Or c'est justement en Mini que le chiffre est simple et décisif :
 * le coach fixe un prix d'appel, il doit voir en face la seule dépense qu'il
 * aura, une fois pour toutes.
 */
export function OfferMiniCost({
  months,
  creditMode,
  programCredits,
  bestPack = null,
  unitCents = null,
  aiIncluded = false,
}: {
  months: number;
  creditMode: boolean;
  programCredits: number;
  bestPack?: BestPack | null;
  unitCents?: number | null;
  aiIncluded?: boolean;
}) {
  const tx = usePhrase();
  const days = programDaysForMonths(months);
  const credits = planMaxCredits({ programDays: days, dailyQuota: 0, programCredits });
  const eur = planMaxCostEur({ programDays: days, dailyQuota: 0 });
  // Le prix du crédit en vigueur, sinon celui du meilleur forfait : les deux
  // valent mieux que rien, et on dit lequel on a pris.
  const unite = unitCents ?? bestPack?.unitCents ?? null;
  const enEuros = unite != null ? Math.round(credits.generationCredits * unite) : null;

  return (
    <div className="flex flex-col gap-1.5 rounded-control border border-line-4 bg-surface-2 p-3.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{tx("Coût maximum de ce plan")}</span>
      {aiIncluded ? (
        <span className="text-[13px] leading-[1.6] text-body">
          {tx("L'IA de tes clients est comprise dans ton abonnement chez ton revendeur : la génération du programme ne t'est pas débitée non plus.")}
        </span>
      ) : (
        <>
          <span className="font-archivo text-[24px] font-extrabold leading-none text-ink">
            {creditMode
              ? enEuros != null
                ? `≈ ${formatEuros(enEuros)}`
                : `${credits.generationCredits.toLocaleString("fr-FR")} ${tx("crédits")}`
              : `≈ ${formatEuros(Math.round(eur.programEur * 100))}`}
            <span className="ml-1 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-2">
              {tx("par client, une seule fois")}
            </span>
          </span>
          <span className="text-[12.5px] leading-[1.6] text-muted">
            {credits.generations > 1
              ? `${credits.generations} ${tx("générations de programme (une par bloc de 3 mois), et plus rien ensuite : sans Coach IA, ce plan ne consomme rien pendant que le client s'entraîne.")}`
              : tx("Une génération de programme, et plus rien ensuite : sans Coach IA, ce plan ne consomme rien pendant que le client s'entraîne.")}
          </span>
          <span className="text-[12.5px] leading-[1.6] text-muted-2">
            {tx("Les recettes, les alternatives d'exercice et la séance de dépannage restent incluses : elles sont calculées, donc gratuites et illimitées.")}
          </span>
        </>
      )}
    </div>
  );
}
