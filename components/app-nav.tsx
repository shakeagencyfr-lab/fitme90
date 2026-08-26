"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

// Icônes line (stroke) — cohérentes, lisibles à petite taille.
const I = {
  programme: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  agenda: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
      <path d="M7 13h2M11 13h2M15 13h2M7 16.5h2M11 16.5h2" />
    </>
  ),
  seance: (
    <>
      <path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11" />
    </>
  ),
  nutrition: (
    <>
      <path d="M12 7c1.5-3 6-3 6 1.5 0 4-4 7.5-6 9-2-1.5-6-5-6-9C6 3.5 10.5 3.5 12 7Z" />
      <path d="M12 7V4.5M12 4.5c0-1 1-1.8 2-1.5" />
    </>
  ),
  evolution: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M7 15l3.5-4 3 2.5L20 7" />
    </>
  ),
  photos: (
    <>
      <rect x="3.5" y="5.5" width="17" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l4.5-4 3 2.5 3-3L20 16" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </>
  ),
  plus: (
    <>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </>
  ),
} as const;

type IconKey = keyof typeof I;
type Item = { href: string; label: string; icon: IconKey };

// Ordre complet (sidebar desktop). Sur mobile : 5 principaux + « Plus ».
const ALL: Item[] = [
  { href: "/app", label: "Programme", icon: "programme" },
  { href: "/app/agenda", label: "Agenda", icon: "agenda" },
  { href: "/app/seance", label: "Séance", icon: "seance" },
  { href: "/app/nutrition", label: "Nutrition", icon: "nutrition" },
  { href: "/app/evolution", label: "Évolution", icon: "evolution" },
  { href: "/app/photos", label: "Photos", icon: "photos" },
  { href: "/app/profil", label: "Profil", icon: "profil" },
];
const IN_MORE = ["/app/evolution", "/app/photos"];
const PRIMARY: Item[] = ALL.filter((i) => !IN_MORE.includes(i.href));
const SECONDARY: Item[] = ALL.filter((i) => IN_MORE.includes(i.href));

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export function AppNav({ day, dayPct, cycleName }: { day: number; dayPct: number; cycleName?: string }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  const secondaryActive = SECONDARY.some((i) => isActive(i.href));

  return (
    <>
      {/* ───────── Sidebar (desktop ≥ nav) : tous les onglets ───────── */}
      <nav className="hidden nav:sticky nav:top-0 nav:flex nav:h-dvh nav:w-[228px] nav:shrink-0 nav:flex-col nav:gap-0.5 nav:overflow-auto nav:border-r nav:border-line nav:px-3.5 nav:py-6">
        <div className="flex flex-col gap-1 px-2.5 pb-4">
          <div className="font-archivo font-extrabold text-[22px] tracking-[-0.02em] text-ink">
            FitMe<span className="text-brand">90</span>
          </div>
          <div className="font-mono uppercase tracking-[0.14em] text-[10px] text-muted-2">
            Jour {day} sur 90
          </div>
        </div>

        {ALL.map((it) => {
          const on = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={[
                "tap group flex flex-row items-center justify-start gap-[11px] rounded-control px-3 py-[11px] text-[14px] font-medium transition-colors",
                on ? "bg-fill text-fillfg" : "text-body-2 hover:bg-paper",
              ].join(" ")}
            >
              <span className="transition-transform group-active:scale-90">
                <Icon>{I[it.icon]}</Icon>
              </span>
              <span className="font-semibold tracking-[-0.01em]">{it.label}</span>
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col gap-2 rounded-card bg-paper p-4">
          <div className="font-mono uppercase tracking-[0.12em] text-[10px] text-muted-2">Progression</div>
          <div className="font-archivo font-extrabold text-[34px] leading-[0.9] tracking-[-0.03em] text-ink">
            {day}
            <span className="text-[16px] text-muted-2">/90</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-[3px] bg-line">
            <div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${dayPct}%` }} />
          </div>
          {cycleName ? <div className="text-[12px] text-muted">{cycleName}</div> : null}
        </div>
      </nav>

      {/* ───────── Feuille « Plus » (mobile) ───────── */}
      {more ? (
        <>
          <button
            aria-label="Fermer"
            onClick={() => setMore(false)}
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px] nav:hidden"
          />
          <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 flex flex-col overflow-hidden rounded-card border border-line bg-surface nav:hidden">
            {SECONDARY.map((it) => {
              const on = isActive(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setMore(false)}
                  className={[
                    "tap flex items-center gap-3 border-b border-line-2 px-4 py-3.5 text-[15px] font-semibold last:border-0",
                    on ? "text-brand" : "text-body",
                  ].join(" ")}
                >
                  <Icon>{I[it.icon]}</Icon>
                  {it.label}
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      {/* ───────── Barre du bas (mobile < nav) : 5 + Plus ───────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex gap-0.5 border-t border-line bg-surface/95 px-1.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur nav:hidden">
        {PRIMARY.map((it) => {
          const on = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setMore(false)}
              className={[
                "tap group flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-control px-0.5 py-[7px] transition-colors",
                on ? "bg-paper text-brand" : "text-muted-2",
              ].join(" ")}
            >
              <span className={["transition-transform group-active:scale-90", on ? "" : "group-hover:scale-105"].join(" ")}>
                <Icon>{I[it.icon]}</Icon>
              </span>
              <span className="text-[9.5px] font-semibold tracking-[-0.01em]">{it.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          aria-label="Plus d'onglets"
          aria-expanded={more}
          className={[
            "tap group flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-control px-0.5 py-[7px] transition-colors",
            more || secondaryActive ? "bg-paper text-brand" : "text-muted-2",
          ].join(" ")}
        >
          <span className="transition-transform group-active:scale-90">
            <Icon>{I.plus}</Icon>
          </span>
          <span className="text-[9.5px] font-semibold tracking-[-0.01em]">Plus</span>
        </button>
      </nav>
    </>
  );
}
