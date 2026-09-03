"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LangSwitch } from "@/components/lang-switch";

export interface NavLink {
  href: string;
  label: string;
}

/**
 * Menu mobile des pages publiques.
 *
 * Il remplace la bascule de langue, qui occupait la barre du haut sur
 * téléphone alors que presque personne n'y touche : elle redescend ici, au
 * calme, sous les liens qui comptent vraiment.
 *
 * Le panneau prend tout l'écran plutôt que de dérouler un tiroir : sur un
 * téléphone, la moitié d'un menu déroulant tombe sous le pouce et l'autre
 * moitié laisse voir la page qui continue de défiler derrière. Ici le fond de
 * page est verrouillé tant que le menu est ouvert, et les lignes arrivent en
 * cascade pour que l'ouverture se lise comme un geste, pas comme un saut.
 */
export function MobileNav({
  brand,
  links,
  login,
  cta,
  tone = "dark",
  bg,
  radius = 12,
  uppercase = false,
  langLabel = "Langue",
  className = "",
}: {
  /** Marque du site, reprise en tête du panneau : le menu couvre la barre du
   *  haut, et une page sans son nom pendant la navigation désoriente. */
  brand?: ReactNode;
  links: readonly NavLink[];
  login?: NavLink;
  cta?: NavLink;
  tone?: "light" | "dark";
  /** Fond du panneau : celui du template, pour que le menu soit la page. */
  bg: string;
  /** Rayon des boutons (0 pour Volt, 999 pour Sage et Aurora). */
  radius?: number;
  uppercase?: boolean;
  langLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panel = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  const dark = tone === "dark";
  const ink = dark ? "#fff" : "#17191b";
  const line = dark ? "rgba(255,255,255,0.12)" : "rgba(23,25,27,0.10)";

  // Fermeture au clavier, et fond de page verrouillé pendant l'ouverture.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Le focus entre dans le panneau à l'ouverture et revient sur le bouton à la
  // fermeture : sans ça, la tabulation continue derrière le menu. `touched`
  // évite de voler le focus au chargement de la page, où le menu est fermé
  // sans que personne ne l'ait jamais ouvert.
  const touched = useRef(false);
  useEffect(() => {
    if (open) {
      touched.current = true;
      panel.current?.focus();
    } else if (touched.current) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, [open]);

  // Le menu ne doit pas survivre à un passage en grand écran : le visiteur
  // aurait un panneau plein écran verrouillé sur une page qui a déjà sa barre
  // de navigation complète.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Le panneau part dans <body> plutôt que de rester dans l'en-tête. Un en-tête
  // collant crée son propre contexte d'empilement : le menu y restait prisonnier
  // et passait sous la barre d'action fixe du bas de page, quel que soit son
  // z-index.
  const rows: NavLink[] = [...links, ...(login ? [login] : [])];

  return (
    <div className={className}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Ouvrir le menu"
        className="tap flex size-10 items-center justify-center"
      >
        <span className="relative block h-[14px] w-[22px]" aria-hidden>
          {/* Deux traits qui pivotent en croix : une seule transformation,
              donc un mouvement continu même sur un téléphone modeste. */}
          <span
            className="absolute left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-300 [transition-timing-function:var(--ease-out-soft)] motion-reduce:transition-none"
            style={{
              top: 2,
              transform: open ? "translateY(5px) rotate(45deg)" : "none",
            }}
          />
          <span
            className="absolute left-0 block h-[2px] w-full rounded-full bg-current transition-transform duration-300 [transition-timing-function:var(--ease-out-soft)] motion-reduce:transition-none"
            style={{
              top: 12,
              transform: open ? "translateY(-5px) rotate(-45deg)" : "none",
            }}
          />
        </span>
      </button>

      {open
        ? createPortal(
            <div
              id={panelId}
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              tabIndex={-1}
              className="nav-veil fixed inset-0 z-[60] outline-none"
              style={{ background: bg }}
            >
              <div className="nav-panel flex h-dvh flex-col overflow-y-auto px-5 pb-[max(32px,env(safe-area-inset-bottom))]">
                {/* Même hauteur que la barre du haut : la marque ne bouge pas
                d'un pixel entre la page et le menu. */}
                <div className="flex min-h-[68px] shrink-0 items-center justify-between gap-4 py-3.5">
                  <span className="min-w-0 truncate">{brand}</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Fermer le menu"
                    className="tap -mr-2 flex size-10 shrink-0 items-center justify-center"
                    style={{ color: ink }}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <nav className="flex flex-col pt-3">
                  {rows.map((l, i) => (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="nav-row group flex items-center justify-between border-b py-4"
                      style={{
                        borderColor: line,
                        animationDelay: `${60 + i * 55}ms`,
                      }}
                    >
                      <span
                        className={[
                          "font-archivo font-extrabold tracking-[-0.02em]",
                          uppercase
                            ? "text-[26px] uppercase tracking-[0.01em]"
                            : "text-[28px]",
                        ].join(" ")}
                        style={{ color: ink }}
                      >
                        {l.label}
                      </span>
                      <span
                        className="transition-transform duration-300 [transition-timing-function:var(--ease-out-soft)] group-hover:translate-x-1 motion-reduce:transition-none"
                        style={{ color: "var(--color-brand)" }}
                        aria-hidden
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="20"
                          height="20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 12h13M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </a>
                  ))}
                </nav>

                <div className="flex flex-1 flex-col gap-5 pt-7">
                  {cta ? (
                    <Link
                      href={cta.href}
                      onClick={() => setOpen(false)}
                      className="nav-row press tap flex h-[52px] items-center justify-center bg-brand px-5 font-archivo text-[15px] font-bold text-white hover:bg-brand-hover"
                      style={{
                        borderRadius: radius,
                        animationDelay: `${80 + rows.length * 55}ms`,
                      }}
                    >
                      {cta.label}
                    </Link>
                  ) : null}

                  <div
                    className="nav-row mt-auto flex items-center justify-between border-t pt-5"
                    style={{
                      borderColor: line,
                      animationDelay: `${120 + rows.length * 55}ms`,
                    }}
                  >
                    <span
                      className="font-mono text-[11px] uppercase tracking-[0.14em]"
                      style={{
                        color: dark
                          ? "rgba(255,255,255,0.4)"
                          : "rgba(23,25,27,0.45)",
                      }}
                    >
                      {langLabel}
                    </span>
                    <LangSwitch compact tone={dark ? "dark" : "auto"} />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
