"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { returnFromSupport, supportLoginAs } from "@/app/admin/actions";

// Le bandeau d'assistance, et le sélecteur de compte qui va avec.
//
// CE QU'IL DOIT FAIRE SENTIR. Qu'on n'est pas chez soi. Tant qu'on est dans le
// compte de quelqu'un d'autre, tout ce qu'on tape est enregistré à son nom :
// le bandeau est un rappel permanent, pas une décoration. D'où l'ambre, qui
// n'apparaît nulle part ailleurs dans l'application, et la position collante.
//
// COULEURS FIXES, PAS LES JETONS DE THÈME. Deux raisons. `bg-ink` vaut #f3f2ef
// en thème sombre, ce qui donnait autrefois du blanc sur blanc. Et surtout :
// en marque blanche, le bandeau ne doit PAS prendre les couleurs du compte
// visité. C'est un signal de la plateforme, il se lit pareil partout.
//
// LA CROIX NE FERME PAS. Elle replie. Un bandeau d'assistance qu'on peut faire
// disparaître laisse l'opérateur croire qu'il est chez lui, ce qui est
// exactement l'accident qu'on cherche à éviter : il reste une pastille ambre,
// toujours visible, qui redéploie.

export interface SupportAccount {
  tenantId: string;
  name: string;
  ownerUserId: string;
  email: string;
  kind: "reseller" | "coach";
  suspended: boolean;
}

const AMBRE = "#f5b544";
const AMBRE_FOND = "rgba(245,181,68,.14)";
const AMBRE_LIGNE = "rgba(245,181,68,.22)";

function Eye() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowBack() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/** Le panneau de bascule : recherche, comptes, retour. */
function Switcher({
  accounts,
  currentName,
  onClose,
  align,
}: {
  accounts: SupportAccount[];
  currentName: string;
  onClose: () => void;
  align: "left" | "right";
}) {
  const tx = usePhrase();
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const champRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    champRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    // En capture, sinon le clic sur le bouton qui a ouvert le panneau le
    // referme puis le rouvre aussitôt.
    document.addEventListener("mousedown", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick, true);
    };
  }, [onClose]);

  const resultats = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(n) || a.email.toLowerCase().includes(n));
  }, [q, accounts]);

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label={tx("Changer de compte")}
      className={`absolute top-[calc(100%+6px)] z-[60] w-[min(360px,calc(100vw-20px))] overflow-hidden rounded-card border border-line bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,.55)] ${
        align === "right" ? "right-0" : "left-0"
      }`}
    >
      <form action={returnFromSupport}>
        <button
          type="submit"
          className="tap flex w-full items-center gap-2.5 border-b border-line-2 px-3.5 py-3 text-left text-[14px] font-semibold text-ink hover:bg-surface-2"
        >
          <span className="text-muted-2">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
          </span>
          {tx("Retour à mon espace")}
        </button>
      </form>

      <div className="p-2.5">
        <span className="relative flex items-center">
          <span className="pointer-events-none absolute left-3 text-muted-2">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></svg>
          </span>
          <input
            ref={champRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx("Rechercher un compte…")}
            className="tap w-full rounded-control border border-line-4 bg-surface py-2 pl-9 pr-3 text-[14px] text-ink placeholder:text-disabled outline-none focus:border-ink"
          />
        </span>
      </div>

      <div className="max-h-[46dvh] overflow-y-auto pb-1.5">
        {resultats.length === 0 ? (
          <p className="px-3.5 py-3 text-[13px] text-muted-2">{tx("Aucun compte ne correspond.")}</p>
        ) : (
          resultats.map((a) => {
            const actuel = a.name === currentName;
            return (
              <form key={a.tenantId} action={supportLoginAs}>
                <input type="hidden" name="target_user_id" value={a.ownerUserId} />
                <button
                  type="submit"
                  disabled={actuel}
                  className={`tap flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left ${
                    actuel ? "cursor-default bg-surface-2" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-semibold text-ink">{a.name}</span>
                      {a.suspended ? (
                        <span className="shrink-0 rounded-pill bg-alert px-1.5 py-0.5 text-[10.5px] font-semibold text-alert-ink">
                          {tx("Désactivé")}
                        </span>
                      ) : null}
                    </span>
                    {a.email ? <span className="truncate text-[12.5px] text-muted-2">{a.email}</span> : null}
                  </span>
                  {actuel ? (
                    <span className="shrink-0 text-brand">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12.5l5.5 5.5L20 6.5" /></svg>
                    </span>
                  ) : null}
                </button>
              </form>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * La pastille du menu latéral : même sélecteur, autre emplacement.
 *
 * Le bandeau vit en haut de toutes les pages ; la pastille vit là où
 * l'opérateur a l'oeil quand il navigue dans un dashboard. Les deux ouvrent le
 * même panneau, et il n'y a qu'un seul code à faire vivre.
 */
export function SupportChip({
  currentName,
  accounts,
  variant = "row",
}: {
  currentName: string;
  accounts: SupportAccount[];
  /** « icon » pour le menu replié sur 76 px, où le nom n'entre pas. */
  variant?: "row" | "icon";
}) {
  const tx = usePhrase();
  const [open, setOpen] = useState(false);
  if (!accounts.length) return null;

  if (variant === "icon") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${tx("Assistance")} : ${currentName}`}
          title={`${tx("Assistance")} : ${currentName}`}
          className="tap flex size-10 items-center justify-center rounded-card border"
          style={{ borderColor: AMBRE_LIGNE, background: AMBRE_FOND, color: AMBRE }}
        >
          <Eye />
        </button>
        {open ? <Switcher accounts={accounts} currentName={currentName} onClose={() => setOpen(false)} align="left" /> : null}
      </div>
    );
  }

  return (
    <div className="relative px-1 pb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap flex w-full items-center gap-2.5 rounded-card border px-2.5 py-2 text-left"
        style={{ borderColor: AMBRE_LIGNE, background: AMBRE_FOND }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: AMBRE_FOND, color: AMBRE }}>
          <Eye />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: AMBRE }}>
            {tx("Assistance")}
          </span>
          <span className="truncate text-[14px] font-semibold text-ink">{currentName}</span>
        </span>
        <span className="shrink-0 text-muted-2">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
          </svg>
        </span>
      </button>
      {open ? <Switcher accounts={accounts} currentName={currentName} onClose={() => setOpen(false)} align="left" /> : null}
    </div>
  );
}

export function SupportBanner({
  currentName,
  actorName,
  accounts,
  client,
}: {
  /** Le compte (ou la personne) dans lequel on se trouve. */
  currentName: string;
  /** Le nom de l'espace d'origine, quand on le connaît. */
  actorName: string;
  accounts: SupportAccount[];
  /** Un coach qui assiste son client, plutôt qu'un opérateur dans un compte. */
  client: boolean;
}) {
  const tx = usePhrase();
  const [open, setOpen] = useState(false);
  const [replie, setReplie] = useState(false);
  const peutBasculer = !client && accounts.length > 0;

  if (replie) {
    return (
      <button
        type="button"
        onClick={() => setReplie(false)}
        aria-label={tx("Afficher le bandeau d'assistance")}
        className="tap fixed right-3 top-3 z-[60] flex items-center gap-2 rounded-pill px-3 py-1.5 text-[12.5px] font-semibold shadow-[0_10px_30px_-12px_rgba(0,0,0,.6)]"
        style={{ background: "#17191b", color: AMBRE, border: `1px solid ${AMBRE_LIGNE}` }}
      >
        <Eye />
        {tx("Assistance")}
      </button>
    );
  }

  return (
    <div
      className="sticky top-0 z-50 flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4"
      style={{
        background: "linear-gradient(90deg,#1c1510 0%,#17191b 48%)",
        borderBottom: `1px solid ${AMBRE_LIGNE}`,
      }}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: AMBRE_FOND, color: AMBRE }}>
        <Eye />
      </span>

      {/* Le nom du compte est le déclencheur du sélecteur : c'est l'endroit où
          l'oeil se pose pour savoir où l'on est, donc celui où l'on cherche à
          en changer. */}
      <span className="relative flex min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={() => peutBasculer && setOpen((v) => !v)}
          aria-expanded={peutBasculer ? open : undefined}
          disabled={!peutBasculer}
          className={`tap flex min-w-0 items-center gap-1.5 rounded-btn py-1 text-left ${peutBasculer ? "px-2 hover:bg-white/5" : ""}`}
        >
          <span className="hidden shrink-0 text-[13.5px] text-white/60 sm:inline">
            {client ? tx("Assistance de") : tx("Assistance en cours")}
          </span>
          <span className="truncate text-[13.5px] font-semibold" style={{ color: AMBRE }}>
            {currentName || tx("ce compte")}
          </span>
          {peutBasculer ? (
            <span className="shrink-0 text-white/45">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
            </span>
          ) : null}
        </button>
        {open && peutBasculer ? (
          <Switcher accounts={accounts} currentName={currentName} onClose={() => setOpen(false)} align="left" />
        ) : null}
      </span>

      <form action={returnFromSupport} className="shrink-0">
        <button
          type="submit"
          className="press tap inline-flex h-9 items-center gap-2 rounded-pill px-3.5 text-[13px] font-semibold sm:px-4"
          style={{ background: "#f0a92e", color: "#241a08" }}
        >
          <ArrowBack />
          <span className="hidden sm:inline">
            {client ? tx("Terminer l'assistance") : tx("Retour au compte principal")}
          </span>
          <span className="sm:hidden">{tx("Retour")}</span>
        </button>
      </form>

      {/* Replier, jamais fermer : voir l'en-tête du fichier. */}
      <button
        type="button"
        onClick={() => setReplie(true)}
        aria-label={tx("Replier le bandeau")}
        title={actorName ? `${tx("Ton espace")} : ${actorName}` : undefined}
        className="tap flex size-8 shrink-0 items-center justify-center rounded-btn text-white/45 hover:text-white"
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}
