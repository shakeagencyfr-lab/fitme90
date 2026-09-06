"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/locale-provider";
import { RESCUE_KINDS, type RescueKind } from "@/lib/rescue-circuit";

// « Séance de dépannage » : quand le client n'a pas son matériel habituel
// (voyage, hôtel, salle limitée), il choisit sa contrainte et reçoit
// IMMÉDIATEMENT une séance de remplacement en circuit, construite à partir de
// la séance du jour (mêmes groupes musculaires, mouvements praticables). Ce
// n'est plus une question posée au Coach IA : c'est calculé, donc instantané,
// gratuit, et ça se déroule au chrono comme n'importe quel circuit. Le
// programme enregistré n'est pas touché.
export function DepannageButton({
  day,
  coachEnabled = false,
}: {
  /** Jour de programme à dépanner (celui affiché). */
  day: number;
  /** Le Coach IA est-il inclus dans l'offre du client ? */
  coachEnabled?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function choisir(kind: RescueKind) {
    setOpen(false);
    router.push(`/app/seance?jour=${day}&depannage=${kind}`);
  }

  function demanderAuCoach() {
    setOpen(false);
    // `fresh` : la question ouvre son propre fil. Elle produit une longue
    // réponse ponctuelle, qui noierait la conversation en cours et en
    // chasserait le contexte utile (la fenêtre d'historique est limitée).
    window.dispatchEvent(
      new CustomEvent("fitme90:coach-ask", { detail: { message: t("rescue.askCoachMessage"), fresh: true } }),
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="tap flex items-center gap-2 rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[13.5px] font-semibold text-body transition-colors hover:border-ink"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h10" />
          <circle cx="18" cy="17" r="3" />
        </svg>
        {t("rescue.button")}
      </button>

      {open ? (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-[300px] max-w-[85vw] overflow-hidden rounded-card border border-line bg-surface shadow-[0_10px_30px_rgba(23,25,27,0.18)] animate-[popin_.18s_ease-out]">
            <div className="border-b border-line-2 px-3.5 py-2.5 text-[12px] text-muted">
              {t("rescue.hint")}
            </div>
            {RESCUE_KINDS.map((k) => (
              <button
                key={k}
                onClick={() => choisir(k)}
                className="tap flex w-full flex-col items-start gap-0.5 border-b border-line-2 px-3.5 py-3 text-left last:border-0 hover:bg-surface-2"
              >
                <span className="font-archivo font-semibold text-[14px] text-ink">{t(`rescue.${k}.label`)}</span>
                <span className="text-[12px] text-muted-2">{t(`rescue.${k}.hint`)}</span>
              </button>
            ))}
            {coachEnabled ? (
              <button
                onClick={demanderAuCoach}
                className="tap flex w-full flex-col items-start gap-0.5 border-t border-line-2 bg-surface-2 px-3.5 py-3 text-left hover:bg-paper"
              >
                <span className="font-archivo font-semibold text-[14px] text-ink">{t("rescue.askCoachLabel")}</span>
                <span className="text-[12px] text-muted-2">{t("rescue.askCoachHint")}</span>
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
