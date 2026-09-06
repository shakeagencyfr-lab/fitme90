"use client";

import { useLocale, usePhrase } from "@/components/locale-provider";
import { MonoLabel } from "@/components/ui";
import { OFFER_FORMULAS, formulaCopy, type OfferFormula } from "@/lib/offer-formulas";

/**
 * Le choix de formule d'un plan : Mini ou Max, deux cartes, aucune cochée par
 * défaut à la création.
 *
 * C'est volontaire. Le réglage décide de ce que le plan coûtera au coach
 * pendant des mois ; une case pré-cochée le fait décider à sa place. Ici, tant
 * qu'il n'a pas choisi, rien n'est choisi, et le serveur refuse le plan.
 */
export function OfferFormulaPicker({
  value,
  onChange,
  required = false,
}: {
  value: OfferFormula | null;
  onChange: (f: OfferFormula) => void;
  /** true à la création : aucune formule par défaut, le choix est obligatoire. */
  required?: boolean;
}) {
  const tx = usePhrase();
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <MonoLabel>{tx("Formule")}</MonoLabel>
        {required && !value ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-brand">{tx("à choisir")}</span>
        ) : null}
      </div>
      <input type="hidden" name="formule" value={value ?? ""} />
      <div className="grid gap-2 sm:grid-cols-2">
        {OFFER_FORMULAS.map((f) => {
          const c = formulaCopy(f, locale);
          const on = value === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => onChange(f)}
              aria-pressed={on}
              className={[
                "tap flex flex-col items-start gap-1.5 rounded-control border p-3.5 text-left transition-colors",
                on ? "border-brand bg-brand/[0.06] ring-1 ring-brand/25" : "border-line-4 bg-surface-2 hover:border-ink",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <span
                  className={[
                    "inline-flex size-4 shrink-0 items-center justify-center rounded-full border",
                    on ? "border-brand bg-brand text-white" : "border-line-4 bg-surface",
                  ].join(" ")}
                  aria-hidden
                >
                  {on ? (
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l5 5L19 7" />
                    </svg>
                  ) : null}
                </span>
                <span className="font-archivo font-extrabold text-[17px] text-ink">{c.name}</span>
              </span>
              <span className="text-[13px] font-semibold text-body">{c.tagline}</span>
              <span className="text-[12.5px] leading-[1.55] text-muted">{c.body}</span>
              <span className={["text-[12.5px] leading-[1.55]", on ? "text-brand" : "text-muted-2"].join(" ")}>{c.cost}</span>
              <span className="text-[12px] leading-[1.5] text-muted-2">{c.fit}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
