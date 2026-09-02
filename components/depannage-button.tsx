"use client";

import { useState } from "react";
import { useT } from "@/components/locale-provider";

// « Séance de dépannage » : quand le client n'a pas son matériel habituel
// (voyage, hôtel, salle limitée), il choisit sa contrainte et le coach lui
// propose une version alternative de la séance du jour, sans toucher au
// programme. On passe par un événement écouté par le widget coach.
const OPTION_KEYS = ["none", "hotel", "dumbbells"] as const;
export function DepannageButton() {
  const t = useT();
  const OPTIONS = OPTION_KEYS.map((k) => ({ key: k, label: t(`rescue.${k}.label`), hint: t(`rescue.${k}.hint`), message: t(`rescue.${k}.message`) }));
  const [open, setOpen] = useState(false);

  function ask(message: string) {
    setOpen(false);
    window.dispatchEvent(new CustomEvent("fitme90:coach-ask", { detail: { message } }));
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
          <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-[280px] max-w-[80vw] overflow-hidden rounded-card border border-line bg-surface shadow-[0_10px_30px_rgba(23,25,27,0.18)] animate-[popin_.18s_ease-out]">
            <div className="border-b border-line-2 px-3.5 py-2.5 text-[12px] text-muted">
              {t("rescue.hint")}
            </div>
            {OPTIONS.map((o) => (
              <button
                key={o.label}
                onClick={() => ask(o.message)}
                className="tap flex w-full flex-col items-start gap-0.5 border-b border-line-2 px-3.5 py-3 text-left last:border-0 hover:bg-surface-2"
              >
                <span className="font-archivo font-semibold text-[14px] text-ink">{o.label}</span>
                <span className="text-[12px] text-muted-2">{o.hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
