"use client";

import { useState } from "react";

// Affiche le lien de parrainage du client avec un bouton copier (et partage
// natif si disponible). Le lien mène à l'inscription brandée du coach.
export function ReferralLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* presse-papier indisponible */
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Rejoins-moi", text: "Rejoins mon coaching 👇", url });
      } catch {
        /* partage annulé */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 font-mono text-[12.5px] text-body outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="tap shrink-0 rounded-btn bg-brand px-4 text-[13.5px] font-semibold text-white hover:bg-brand-hover"
        >
          {copied ? "Copié !" : "Copier"}
        </button>
      </div>
      <button
        type="button"
        onClick={share}
        className="tap inline-flex h-10 items-center justify-center gap-2 rounded-btn border border-line-4 bg-surface px-4 text-[13.5px] font-semibold text-ink hover:border-ink"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
        Partager mon lien
      </button>
    </div>
  );
}
