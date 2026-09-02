"use client";

import { usePhrase } from "@/components/locale-provider";

import { useState } from "react";
import { Card, MonoLabel } from "@/components/ui";

// Snippet d'intégration : un iframe responsive qui s'auto-redimensionne (la page
// /embed envoie sa hauteur par postMessage). Le coach le colle sur son site.
export function EmbedSnippet({ embedUrl }: { embedUrl: string }) {
  const tx = usePhrase();
  const [copied, setCopied] = useState(false);

  const code = `<iframe src="${embedUrl}" title="Mes offres" loading="lazy" style="width:100%;border:0;min-height:560px" id="fitme-offers"></iframe>
<script>window.addEventListener("message",function(e){if(e.data&&e.data.fitmeHeight){var f=document.getElementById("fitme-offers");if(f)f.style.height=e.data.fitmeHeight+"px"}});</script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponible */
    }
  }

  return (
    <Card as="section" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Intégrer sur mon site")}</div>
        <p className="text-[13px] text-muted">
          {tx("Colle ce code dans une page de ton site : tes offres s'affichent et se mettent à jour automatiquement.")}</p>
      </div>
      <MonoLabel>{tx("Code d'intégration")}</MonoLabel>
      <pre className="overflow-x-auto rounded-control border border-line-4 bg-surface-2 px-3.5 py-3 font-plex text-[12px] leading-[1.55] text-body">
        {code}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="tap self-start rounded-btn bg-brand px-4 py-2.5 font-plex font-semibold text-[14px] text-white hover:bg-brand-hover"
      >
        {copied ? "Copié ✓" : "Copier le code"}
      </button>
    </Card>
  );
}
