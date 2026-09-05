"use client";

import { usePhrase } from "@/components/locale-provider";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PREVIEW_FRAME_ATTR } from "@/lib/theme-preview";
import { useRouter } from "next/navigation";
import { BrandingForm } from "@/components/branding-form";
import { BrandIdentityForm } from "@/components/brand-identity-form";
import { ThemeStudio } from "@/components/theme-studio";
import { TemplateSelector } from "@/components/template-selector";
import { BusinessTypeForm } from "@/components/business-type-form";
import { SubdomainForm } from "@/components/subdomain-form";
import { CustomDomainCard } from "@/components/custom-domain-card";
import type { CustomDomainInfo } from "@/lib/custom-domain";
import type { Branding } from "@/lib/branding";
import type { BusinessType, LandingTemplate } from "@/lib/offers";

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
  /** Domaine perso verrouillé (pack marque blanche absent) ? */
  domainLocked?: boolean;
  customDomainInfo: CustomDomainInfo;
  /** Étage configuré : décide de ce que l'adresse personnalisée sert vraiment. */
  kind: "platform" | "reseller" | "coach";
  /** Ce que le thème habille à cet étage, dit en clair. */
  themeAudience: string;
  /** Coach indépendant ou salle : choisit le discours de la page publique.
   *  null au niveau plateforme, qui n'a pas de page de vente client. */
  businessType: BusinessType | null;
}

/** Hauteur de la fenêtre : seule la vue en grand en dépend. */
function souscrireFenetre(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
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
  kind,
  businessType,
  themeAudience,
}: Props) {
  const tx = usePhrase();
  const router = useRouter();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  /**
   * Aperçu en grand, par-dessus la page.
   *
   * Élargir la colonne d'aperçu revenait à rétrécir le configurateur, qui est
   * l'écran de travail : on réglait un problème en en créant un autre. Le
   * panneau garde donc sa place habituelle, et vient couvrir la fenêtre quand
   * on le demande. C'est le MÊME panneau qui change de cadre, pas un second :
   * l'iframe n'est jamais démontée, donc la page ne se recharge pas et
   * l'aperçu vivant ne perd pas le brouillon en cours.
   */
  const [plein, setPlein] = useState(false);

  useEffect(() => {
    if (!plein) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlein(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plein]);

  /**
   * L'aperçu rend une VRAIE largeur d'écran, puis la réduit.
   *
   * La colonne d'aperçu fait environ 430 pixels. Un iframe qui l'occupe en
   * largeur est un écran de 430 pixels de large : la page publique y bascule
   * en disposition mobile, et le bouton « Bureau » montrait donc la même chose
   * que le bouton « Mobile ». Le coach ne pouvait pas voir sa page de bureau.
   *
   * L'iframe fait maintenant la largeur qu'il annonce, 1280 ou 390 pixels, et
   * c'est une mise à l'échelle CSS qui le fait tenir dans la colonne. Le
   * document à l'intérieur croit être sur cet écran-là, donc il choisit la
   * bonne disposition ; on ne fait que le regarder de plus loin.
   */
  const VUES = {
    desktop: { largeur: 1280, hauteur: 820 },
    mobile: { largeur: 390, hauteur: 780 },
  } as const;
  const vue = VUES[device];

  const cadre = useRef<HTMLDivElement | null>(null);
  const [dispo, setDispo] = useState(0);
  const hFenetre = useSyncExternalStore(souscrireFenetre, () => window.innerHeight, () => 0);

  // La largeur disponible dépend de la fenêtre et du menu latéral rétractable :
  // un calcul unique au montage se tromperait dès le premier redimensionnement.
  const mesurer = useCallback(() => {
    const l = cadre.current?.clientWidth;
    if (l && l > 0) setDispo(l);
  }, []);

  useEffect(() => {
    mesurer();
    const el = cadre.current;
    if (!el || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", mesurer);
      return () => window.removeEventListener("resize", mesurer);
    }
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mesurer, previewUrl, plein]);

  /**
   * L'échelle tient dans TROIS limites, et prend la plus contraignante.
   *
   * La largeur disponible, d'abord. La hauteur ensuite, sans quoi l'aperçu en
   * grand déborderait sous le bas de la fenêtre. Et jamais plus de 1 : un
   * écran agrandi au-delà de sa taille réelle donne une fausse idée des tailles
   * de texte, sur mobile comme sur bureau.
   */
  const budget = plein && hFenetre > 0 ? hFenetre - 150 : Number.POSITIVE_INFINITY;
  const echelle = Math.min(1, dispo > 0 ? dispo / vue.largeur : 1, budget / vue.hauteur);
  // Centrage quand le cadre est plus large que la vue simulée. Le décalage est
  // exprimé AVANT mise à l'échelle, puisque `transform` applique l'un puis
  // l'autre sur le même repère.
  const decalage = echelle > 0 ? Math.max(0, (dispo / echelle - vue.largeur) / 2) : 0;

  const src = previewUrl ? `${previewUrl}?preview=${previewVersion}` : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      {/* Colonne configuration */}
      <div className="flex flex-col gap-5">
        <BrandingForm branding={branding} namePlaceholder={namePlaceholder} />
        <BrandIdentityForm identity={branding.identity} namePlaceholder={namePlaceholder} />
        <ThemeStudio
          current={branding.theme}
          logoUrl={branding.logoUrl}
          brandName={branding.identity.appName?.trim() || namePlaceholder}
          audience={themeAudience}
        />
        {businessType ? <BusinessTypeForm current={businessType} /> : null}
        {template ? <TemplateSelector current={template} accent={accent} /> : null}
        <SubdomainForm current={subdomain} slug={slug} siteHost={siteHost} rootDomain={rootDomain} kind={kind} />
        {domainLocked ? (
          <div className="flex items-start gap-2.5 rounded-card border border-line bg-surface-2 p-4">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 shrink-0 text-muted-2" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <div>
              <div className="font-archivo text-[14.5px] font-bold text-ink">{tx("Domaine personnalisé")}</div>
              <p className="mt-0.5 text-[12.5px] leading-[1.55] text-muted">
                {tx("Ton propre nom de domaine fait partie du")} <span className="text-body">{tx("pack marque blanche")}</span> {tx(": souscris-le plus bas, ou demande à ton revendeur de l'inclure dans ton palier.")}</p>
            </div>
          </div>
        ) : (
          <CustomDomainCard info={customDomainInfo} />
        )}
      </div>

      {/* Colonne aperçu live : à sa place d'habitude, par-dessus la fenêtre en
          grand. Le sous-arbre est identique dans les deux cas, seules les
          classes changent, donc l'iframe n'est jamais démontée. */}
      <div
        className={
          plein
            ? "fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-3 backdrop-blur-[2px] sm:p-6"
            : "lg:sticky lg:top-6 lg:self-start"
        }
      >
        <div
          className={[
            "flex flex-col gap-3 rounded-card border border-line bg-surface p-3.5",
            plein ? "max-h-full w-full max-w-[1500px] shadow-2xl" : "",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Aperçu live")}</span>
              {previewUrl ? (
                <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-muted-2">{previewUrl}</span>
              ) : null}
              {/* La largeur simulée, sinon une page réduite de moitié passe pour
                  une page mal fichue. */}
              <span className="font-mono text-[10px] text-muted-2">{vue.largeur} px</span>
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
                onClick={() => setPlein((p) => !p)}
                aria-pressed={plein}
                aria-label={plein ? tx("Réduire l'aperçu") : tx("Agrandir l'aperçu")}
                title={plein ? tx("Réduire l'aperçu") : tx("Agrandir l'aperçu")}
                className="tap flex size-8 items-center justify-center rounded-control border border-line-4 text-muted hover:border-ink hover:text-ink"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {plein ? (
                    <path d="M9 4v5H4M15 20v-5h5M9 20v-5H4M15 4v5h5" />
                  ) : (
                    <path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" />
                  )}
                </svg>
              </button>
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
            <div
              ref={cadre}
              className="overflow-hidden rounded-control bg-[#0a0b0c]"
              style={{ height: Math.round(vue.hauteur * echelle) }}
            >
              <iframe
                {...{ [PREVIEW_FRAME_ATTR]: "" }}
                key={`${device}-${previewVersion}`}
                src={src}
                title={tx("Aperçu de la page publique")}
                className="border-0 bg-white"
                style={{
                  width: vue.largeur,
                  height: vue.hauteur,
                  transform: `scale(${echelle}) translateX(${decalage}px)`,
                  transformOrigin: "top left",
                }}
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
