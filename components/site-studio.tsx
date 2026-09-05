"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { usePhrase } from "@/components/locale-provider";
import { SiteCms } from "@/components/site-cms";
import { SITE_PREVIEW_TYPE, isSitePreviewReady, type SiteDraft } from "@/lib/site-preview";
import type { SiteSettings } from "@/lib/site";
import type { GoogleLink } from "@/components/site-google-card";

/** Hauteur de la fenêtre : seule la vue en grand en dépend. */
function souscrireFenetre(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/**
 * Studio « Mon site » : le CMS à gauche, la page telle qu'elle sera à droite.
 *
 * Même disposition que le studio de marque blanche, avec une différence qui
 * change tout à l'usage : ici l'aperçu suit la FRAPPE. On n'y règle pas trois
 * couleurs à valider, on y écrit ; relire son accroche au fil des mots est le
 * geste même du travail, et l'enregistrer pour la voir en casserait le rythme.
 *
 * L'aperçu vise une route privée (/apercu-site) et non la page publique, de
 * sorte que le coach travaille avant d'avoir publié quoi que ce soit.
 */
export function SiteStudio({
  settings,
  host,
  landingSlug,
  google,
  serpReady,
  previewVersion,
}: {
  settings: SiteSettings;
  host: string;
  landingSlug: string;
  google: GoogleLink | null;
  serpReady: boolean;
  /** Change à chaque enregistrement : force l'iframe à relire l'état serveur. */
  previewVersion: number;
}) {
  const tx = usePhrase();
  const router = useRouter();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [plein, setPlein] = useState(false);

  // Le brouillon courant, remonté par le CMS à chaque frappe.
  const [draft, setDraft] = useState<SiteDraft | null>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const pret = useRef(false);

  useEffect(() => {
    if (!plein) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlein(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [plein]);

  // L'iframe annonce qu'elle est prête ; on lui envoie alors le brouillon en
  // cours, sinon un rechargement repartirait de l'état enregistré et le coach
  // verrait son travail disparaître de l'aperçu.
  //
  // Le brouillon est recopié dans une ref DEPUIS UN EFFET, jamais pendant le
  // rendu : l'écouteur de message est posé une seule fois et doit pourtant
  // lire la dernière valeur, ce qu'une variable capturée à la fermeture ne
  // permettrait pas.
  const dernier = useRef<SiteDraft | null>(null);
  useEffect(() => {
    dernier.current = draft;
  }, [draft]);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!isSitePreviewReady(e.data)) return;
      pret.current = true;
      if (dernier.current) {
        frame.current?.contentWindow?.postMessage(
          { type: SITE_PREVIEW_TYPE, draft: dernier.current },
          window.location.origin,
        );
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Un rechargement de l'iframe (enregistrement, bouton rafraîchir) invalide
  // le « prêt » précédent : la nouvelle page le réannoncera.
  useEffect(() => {
    pret.current = false;
  }, [previewVersion, device]);

  /**
   * Envoi tempéré à 120 ms.
   *
   * Une frappe rapide produit une dizaine d'événements par seconde ; envoyer
   * chacun d'eux ferait re-rendre la page entière autant de fois pour un
   * résultat que l'oeil ne distingue pas. On envoie donc le dernier état d'une
   * rafale, ce qui reste largement en dessous du seuil de perception.
   */
  useEffect(() => {
    if (!draft) return;
    const t = setTimeout(() => {
      if (!pret.current) return;
      frame.current?.contentWindow?.postMessage(
        { type: SITE_PREVIEW_TYPE, draft },
        window.location.origin,
      );
    }, 120);
    return () => clearTimeout(t);
  }, [draft]);

  const VUES = useMemo(
    () =>
      ({
        desktop: { largeur: 1280, hauteur: 820 },
        mobile: { largeur: 390, hauteur: 780 },
      }) as const,
    [],
  );
  const vue = VUES[device];

  const cadre = useRef<HTMLDivElement | null>(null);
  const [dispo, setDispo] = useState(0);
  const hFenetre = useSyncExternalStore(souscrireFenetre, () => window.innerHeight, () => 0);

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
  }, [mesurer, plein]);

  /**
   * L'aperçu rend une VRAIE largeur d'écran, puis la réduit.
   *
   * Un iframe large de 430 pixels EST un écran de 430 pixels : la page y
   * basculerait en disposition mobile, et le bouton « Bureau » montrerait la
   * même chose que « Mobile ». L'iframe fait donc la largeur qu'elle annonce,
   * et c'est une mise à l'échelle CSS qui la fait tenir dans la colonne.
   */
  const budget = plein && hFenetre > 0 ? hFenetre - 150 : Number.POSITIVE_INFINITY;
  const echelle = Math.min(1, dispo > 0 ? dispo / vue.largeur : 1, budget / vue.hauteur);
  const decalage = echelle > 0 ? Math.max(0, (dispo / echelle - vue.largeur) / 2) : 0;

  const publicUrl = settings.enabled && settings.webSlug ? `/web/${settings.webSlug}` : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
      <div className="flex flex-col gap-5">
        <SiteCms
          settings={settings}
          host={host}
          landingSlug={landingSlug}
          google={google}
          serpReady={serpReady}
          onDraft={setDraft}
        />
      </div>

      {/* Colonne aperçu : à sa place d'habitude, par-dessus la fenêtre en
          grand. Le sous-arbre est le même dans les deux cas, seules les classes
          changent, donc l'iframe n'est jamais démontée et le brouillon envoyé
          n'est pas perdu en passant en plein écran. */}
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
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
                {tx("Aperçu live")}
              </span>
              <span className="font-mono text-[10px] text-muted-2">{vue.largeur} px</span>
              {!settings.enabled ? (
                <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                  {tx("Non publié")}
                </span>
              ) : null}
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
                    {d === "desktop" ? tx("Bureau") : tx("Mobile")}
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
                  {plein ? <path d="M9 4v5H4M15 20v-5h5M9 20v-5H4M15 4v5h5" /> : <path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" />}
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

          <div
            ref={cadre}
            className="overflow-hidden rounded-control bg-[#0a0b0c]"
            style={{ height: Math.round(vue.hauteur * echelle) }}
          >
            <iframe
              ref={frame}
              key={`${device}-${previewVersion}`}
              src={`/apercu-site?preview=${previewVersion}`}
              title={tx("Aperçu de mon site")}
              className="border-0 bg-white"
              style={{
                width: vue.largeur,
                height: vue.hauteur,
                transform: `scale(${echelle}) translateX(${decalage}px)`,
                transformOrigin: "top left",
              }}
            />
          </div>

          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-line-4 bg-surface px-4 text-[13.5px] font-semibold text-ink hover:border-ink"
            >
              {tx("Ouvrir la page publique ↗")}
            </a>
          ) : (
            <span className="px-1 text-[12px] leading-[1.5] text-muted-2">
              {tx("Tu regardes un aperçu privé. Publie ton site pour lui donner une adresse visible.")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
