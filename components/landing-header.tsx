"use client";

import Link from "next/link";
import { useState } from "react";

const NAV = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#methode", label: "Comment ça marche" },
  { href: "#garanties", label: "Garanties" },
  { href: "#tarifs", label: "Tarifs" },
];

function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0b0c]/85 backdrop-blur-md safe-top">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="#top" onClick={close} className="font-archivo text-[21px] font-extrabold tracking-[-0.02em] text-white">
          FitMe<span className="text-brand">90</span>
        </Link>

        {/* Nav bureau */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="text-[14px] font-medium text-white/70 transition-colors hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/connexion" className="hidden text-[14px] font-medium text-white/70 transition-colors hover:text-white md:inline">
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="tap inline-flex items-center gap-1.5 rounded-btn bg-brand px-4 py-2.5 text-[14px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
          >
            Commencer
            <Arrow className="h-4 w-4" />
          </Link>

          {/* Bouton menu mobile */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            aria-controls="menu-mobile"
            className="tap flex size-11 items-center justify-center rounded-control border border-white/15 text-white md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Panneau menu mobile */}
      {open ? (
        <div id="menu-mobile" className="border-t border-white/10 bg-[#0a0b0c] md:hidden">
          <nav className="mx-auto flex w-full max-w-[1120px] flex-col px-5 py-2 sm:px-8">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={close}
                className="tap flex items-center border-b border-white/5 py-3 text-[15px] font-medium text-white/80 transition-colors hover:text-white"
              >
                {n.label}
              </a>
            ))}
            <div className="flex flex-col gap-2.5 py-4">
              <Link
                href="/connexion"
                onClick={close}
                className="tap inline-flex h-12 items-center justify-center rounded-btn border border-white/20 bg-white/5 text-[15px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/10"
              >
                Connexion
              </Link>
              <Link
                href="/inscription"
                onClick={close}
                className="tap inline-flex h-12 items-center justify-center gap-1.5 rounded-btn bg-brand text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
              >
                Créer mon programme
                <Arrow className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
