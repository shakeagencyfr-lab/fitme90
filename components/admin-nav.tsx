"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS: [href: string, label: string][] = [
  ["/admin", "Clients"],
  ["/admin/offres", "Ma page"],
  ["/admin/exercices", "Exercices"],
  ["/admin/abonnements", "Abonnements"],
  ["/admin/codes", "Codes"],
  ["/admin/integrations", "Intégrations"],
  ["/admin/config", "Configuration IA"],
  ["/admin/shop", "Boutique"],
  ["/admin/notifications", "Notifications"],
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

// Navigation du dashboard coach : menu hamburger sur mobile (liste déroulante
// propre), bande d'onglets classique à partir de `sm`.
export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = LINKS.find(([href]) => isActive(pathname, href))?.[1] ?? "Menu";

  return (
    <>
      {/* ───────── Mobile (< sm) : bouton hamburger + panneau ───────── */}
      <div className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Ouvrir le menu"
          className="tap flex w-full items-center justify-between gap-3 rounded-btn border border-line-4 bg-surface px-4 py-2.5"
        >
          <span className="font-archivo font-bold text-[15px] text-ink">{current}</span>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="text-body-2" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>

        {open ? (
          <>
            <button aria-label="Fermer" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px]" />
            <div className="absolute left-0 right-0 top-full z-50 mt-2 flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-lg">
              {LINKS.map(([href, label]) => {
                const on = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={[
                      "tap border-b border-line-2 px-4 py-3 text-[15px] font-semibold last:border-0",
                      on ? "bg-fill text-fillfg" : "text-body hover:bg-surface-2",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}
      </div>

      {/* ───────── Desktop (≥ sm) : bande d'onglets ───────── */}
      <nav className="hidden gap-1 text-[14px] sm:flex sm:flex-wrap">
        {LINKS.map(([href, label]) => {
          const on = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={[
                "tap shrink-0 rounded-btn px-3 py-1.5 font-medium",
                on ? "bg-fill text-fillfg" : "text-body-2 hover:bg-surface-2 hover:text-ink",
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
