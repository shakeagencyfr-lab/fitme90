import { tx } from "@/lib/i18n/request";
import { formatEurPrecise } from "@/lib/config";

/**
 * Barème des crédits IA, tel qu'un coach doit le comprendre en trois secondes.
 *
 * La règle est simple, mais elle était noyée dans un paragraphe. Elle tient en
 * deux lignes :
 *
 *   une action        = 1 crédit, quelle qu'elle soit
 *   une génération    = N crédits, N fixé par la plateforme
 *
 * Le point important est le « quelle qu'elle soit ». Un coach n'a pas à se
 * demander si une recette coûte plus qu'un message, ni à surveiller quelle
 * fonctionnalité ses clients utilisent : tout ce qui n'est pas une génération
 * de programme vaut un crédit. C'est ce qui rend son budget prévisible.
 *
 * Quand on connaît le prix auquel il achète ses crédits, chaque ligne porte
 * aussi son équivalent en euros. C'est la seule colonne qui l'intéresse
 * vraiment : un nombre de crédits ne veut rien dire tant qu'on ne sait pas ce
 * qu'il coûte.
 */
export function CreditScale({
  programCredits,
  unitCents = null,
  className = "",
}: {
  /** Crédits que coûte une génération de programme. */
  programCredits: number;
  /** Prix d'achat d'un crédit, en centimes. null si on ne le connaît pas. */
  unitCents?: number | null;
  className?: string;
}) {
  const euros = (credits: number) =>
    unitCents == null ? null : formatEurPrecise((credits * unitCents) / 100);

  const lignes: { quoi: string; detail: string; credits: number }[] = [
    {
      quoi: tx("Une action"),
      detail: tx("message du Coach IA, recette, alternative d'exercice, analyse de photo"),
      credits: 1,
    },
    {
      quoi: tx("Une génération de programme"),
      detail: tx("le plan complet d'un client, ou un nouveau bloc de 3 mois"),
      credits: programCredits,
    },
  ];

  return (
    <div className={`overflow-hidden rounded-card border border-line ${className}`}>
      {lignes.map((l, i) => (
        <div
          key={l.quoi}
          className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3.5 ${
            i > 0 ? "border-t border-line-2" : ""
          }`}
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-archivo text-[15px] font-bold text-ink">{l.quoi}</span>
            <span className="text-[12.5px] leading-[1.5] text-muted-2">{l.detail}</span>
          </span>
          <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
            <span className="font-archivo text-[19px] font-extrabold tracking-[-0.02em] text-brand">
              {l.credits}
            </span>
            <span className="text-[13px] text-muted">
              {l.credits > 1 ? tx("crédits") : tx("crédit")}
            </span>
            {euros(l.credits) ? (
              <span className="font-mono text-[11.5px] text-muted-2">≈ {euros(l.credits)}</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * La phrase qui accompagne le barème. Séparée du tableau parce qu'elle change
 * selon l'étage : un coach subit le nombre, un revendeur le subit aussi quand
 * il achète ses crédits, la plateforme le décide.
 */
export function CreditScaleNote({ programCredits, unitCents = null }: { programCredits: number; unitCents?: number | null }) {
  return (
    <p className="text-[12.5px] leading-[1.6] text-muted-2">
      {tx("Toutes les actions coûtent la même chose : tu n'as pas à surveiller laquelle tes clients utilisent.")}{" "}
      {tx("Seule la génération de programme compte double, et son tarif de")} {programCredits}{" "}
      {tx("crédits est fixé par la plateforme, identique pour tout le monde.")}
      {unitCents == null
        ? ` ${tx("Le prix du crédit, lui, est celui de ton revendeur.")}`
        : ` ${tx("Le prix du crédit est celui de ton revendeur :")} ${formatEurPrecise(unitCents / 100)} ${tx("chez toi.")}`}
    </p>
  );
}
