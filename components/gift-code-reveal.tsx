"use client";

import { useState } from "react";

// Affiche le code cadeau en grand avec un bouton « copier ».
export function GiftCodeReveal({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible : l'utilisateur copie à la main */
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-brand/40 bg-brand/10 p-6">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">Code cadeau</span>
      <div className="select-all font-archivo text-[clamp(28px,8vw,40px)] font-extrabold tracking-[0.14em] text-white">
        {code}
      </div>
      <button
        type="button"
        onClick={copy}
        className="tap inline-flex h-10 items-center justify-center rounded-btn bg-brand px-5 text-[14px] font-semibold text-white hover:bg-brand-hover"
      >
        {copied ? "Copié ✓" : "Copier le code"}
      </button>
    </div>
  );
}
