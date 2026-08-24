"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sept entrées (README). Nav latérale desktop (sticky 228px) ou barre basse
// fixe mobile (bascule à 860 px via la classe `nav:` = 860px du thème).
const NAV: [href: string, label: string, glyph: string][] = [
  ["/app", "Programme", "▦"],
  ["/app/agenda", "Agenda", "▤"],
  ["/app/seance", "Séance", "◈"],
  ["/app/nutrition", "Nutrition", "◍"],
  ["/app/evolution", "Évolution", "◔"],
  ["/app/photos", "Photos", "▧"],
  ["/app/profil", "Profil", "◐"],
];

export function AppNav({ day, dayPct, cycleName }: { day: number; dayPct: number; cycleName?: string }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <nav className="nav:sticky nav:top-0 nav:h-dvh nav:w-[228px] nav:shrink-0 nav:flex-col nav:gap-0.5 nav:overflow-auto nav:border-r nav:border-b-0 nav:px-3.5 nav:py-6 fixed bottom-0 left-0 right-0 z-40 flex gap-0.5 border-t border-line bg-surface px-1.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="nav:flex hidden flex-col gap-1 px-2.5 pb-4">
        <div className="font-archivo font-extrabold text-[22px] tracking-[-0.02em] text-ink">
          FitMe<span className="text-brand">90</span>
        </div>
        <div className="font-mono uppercase tracking-[0.14em] text-[10px] text-muted-2">
          Jour {day} sur 90
        </div>
      </div>

      {NAV.map(([href, label, glyph]) => {
        const on = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "tap flex items-center rounded-control",
              "nav:gap-[11px] nav:px-3 nav:py-[11px] nav:text-[14px] nav:font-medium nav:flex-row nav:justify-start",
              "flex-1 flex-col justify-center gap-[3px] px-0.5 py-[9px] min-w-0",
              on
                ? "nav:bg-ink nav:text-white bg-paper text-ink"
                : "nav:text-body-2 text-muted-2",
            ].join(" ")}
          >
            <span aria-hidden className="font-mono text-[15px] leading-none">{glyph}</span>
            <span className="nav:text-[14px] text-[9.5px] font-semibold tracking-[-0.01em]">
              {label}
            </span>
          </Link>
        );
      })}

      <div className="nav:flex hidden mt-auto flex-col gap-2 rounded-card bg-paper p-4">
        <div className="font-mono uppercase tracking-[0.12em] text-[10px] text-muted-2">
          Progression
        </div>
        <div className="font-archivo font-extrabold text-[34px] leading-[0.9] tracking-[-0.03em] text-ink">
          {day}
          <span className="text-[16px] text-muted-2">/90</span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-line">
          <div className="h-full bg-brand" style={{ width: `${dayPct}%` }} />
        </div>
        {cycleName ? <div className="text-[12px] text-muted">{cycleName}</div> : null}
      </div>
    </nav>
  );
}
