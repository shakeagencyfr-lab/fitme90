"use client";

import { usePhrase } from "@/components/locale-provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandingForm } from "@/components/branding-form";
import { TemplateSelector } from "@/components/template-selector";
import { SubdomainForm } from "@/components/subdomain-form";
import { CustomDomainCard } from "@/components/custom-domain-card";
import type { CustomDomainInfo } from "@/lib/custom-domain";
import type { Branding } from "@/lib/branding";
import type { LandingTemplate } from "@/lib/offers";

interface Props {
  branding: Branding;
  namePlaceholder: string;
  template: LandingTemplate | null;
  accent: string;
  slug: string | null;
  subdomain: string | null;
  siteHost: string;
  rootDomain: string;
  previewUrl: string | null;
  /** Jeton recalculé à chaque rendu serveur : force le rechargement de l'aperçu. */
  previewVersion: number;
  /** Domaine perso verrouillé (option marque blanche non débloquée) ? */
  domainLocked?: boolean;
  customDomainInfo: CustomDomainInfo;
}

// Studio « marque blanche » : configuration à gauche, aperçu live à droite.
// L'aperçu est un iframe de la vraie page publique ; il se recharge à chaque
// enregistrement (les formulaires appellent router.refresh() → nouveau
// previewVersion → nouvelle URL d'iframe).
export function WhiteLabelStudio({
  branding,
  namePlaceholder,
  template,
  accent,
  slug,
  subdomain,
  siteHost,
  rootDomain,
  previewUrl,
  previewVersion,
  domainLocked = false,
  customDomainInfo,
}: Props) {
  const tx = usePhrase();
  const router = useRouter();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const src = previewUrl ? `${previewUrl}?preview=${previewVersion}` : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      {/* Colonne configuration */}
      <div className="flex flex-col gap-5">
        <BrandingForm branding={branding} namePlaceholder={namePlaceholder} />
        {template ? <TemplateSelector current={template} accent={accent} /> : null}
        <SubdomainForm current={subdomain} slug={slug} siteHost={siteHost} rootDomain={rootDomain} />
        {domainLocked ? (
          <div className="flex items-start gap-2.5 rounded-card border border-line bg-surface-2 p-4">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 shrink-0 text-muted-2" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <div>
              <div className="font-archivo text-[14.5px] font-bold text-ink">{tx("Domaine personnalisé")}</div>
              <p className="mt-0.5 text-[12.5px] leading-[1.55] text-muted">
                {tx("Débloque l'option")} <span className="text-body">{tx("marque blanche")}</span> {tx("(domaine perso + e-mails) auprès de ton revendeur pour brancher ton propre domaine.")}</p>
            </div>
          </div>
        ) : (
          <CustomDomainCard info={customDomainInfo} />
        )}
      </div>

      {/* Colonne aperçu live (sticky) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Aperçu live")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded-control border border-line-4 p-0.5">
                {(["desktop", "mobile"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
                    aria-pressed={device === d}
                    className={[
                      "rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-colors",
                      device === d ? "bg-surface-2 text-ink" : "text-muted-2 hover:text-ink",
                    ].join(" ")}
                  >
                    {d === "desktop" ? "Bureau" : "Mobile"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => router.refresh()}
                aria-label={tx("Rafraîchir l'aperçu")}
                title={tx("Rafraîchir l'aperçu")}
                className="tap flex size-8 items-center justify-center rounded-control border border-line-4 text-muted hover:border-ink hover:text-ink"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 12a9 9 0 1 1-2.64-6.36M21 4v5h-5" />
                </svg>
              </button>
            </div>
          </div>

          {src ? (
            <div className="flex justify-center overflow-hidden rounded-control bg-[#0a0b0c]">
              <iframe
                key={`${device}-${previewVersion}`}
                src={src}
                title={tx("Aperçu de la page publique")}
                className={[
                  "h-[600px] border-0 bg-white transition-[width] duration-300",
                  device === "mobile" ? "w-[390px]" : "w-full",
                ].join(" ")}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-control border border-dashed border-line-4 px-6 text-center text-[13px] text-muted-2">
              {tx("Choisis d'abord ton adresse personnalisée pour prévisualiser ta page.")}</div>
          )}

          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-line-4 bg-surface px-4 text-[13.5px] font-semibold text-ink hover:border-ink"
            >
              {tx("Ouvrir dans un nouvel onglet ↗")}</a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
