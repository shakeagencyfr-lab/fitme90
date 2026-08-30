"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { CoachBell } from "@/components/coach-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/(auth)/actions";
import type { CoachNotif } from "@/lib/notifications";

// Navigation du dashboard coach, façon « app shell » : barre latérale verticale
// à partir de lg, tiroir coulissant sur mobile. Les onglets sont regroupés par
// thème pour rester lisibles quand ils se multiplient.

type Item = { href: string; label: string; icon: ReactNode };

function I({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split("||").map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Pilotage",
    items: [
      { href: "/admin", label: "Clients", icon: <I d="M16 19a4 4 0 0 0-8 0||M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7||M20 19a3.5 3.5 0 0 0-4-3.4||M8 15.6A3.5 3.5 0 0 0 4 19" /> },
      { href: "/admin/abonnements", label: "Abonnements", icon: <I d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5z||M4 10h16" /> },
      { href: "/admin/codes", label: "Codes", icon: <I d="M4 9V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-4||M14 6v12" /> },
    ],
  },
  {
    label: "Contenu",
    items: [
      { href: "/admin/offres", label: "Ma page", icon: <I d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z||M4 9h16||M8 4v5" /> },
      { href: "/admin/exercices", label: "Exercices", icon: <I d="M6.5 9.5v5||M17.5 9.5v5||M4 11v2||M20 11v2||M6.5 12h11" /> },
      { href: "/admin/shop", label: "Boutique", icon: <I d="M6 8h12l-1 12H7z||M9 8V6a3 3 0 0 1 6 0v2" /> },
    ],
  },
  {
    label: "Réglages",
    items: [
      { href: "/admin/config", label: "Configuration IA", icon: <I d="M12 4l1.4 3.6L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4z||M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8L15.5 17.5l1.8-.7z" /> },
      { href: "/admin/integrations", label: "Intégrations", icon: <I d="M9 7V4||M15 7V4||M7 7h10v4a5 5 0 0 1-10 0z||M12 16v4" /> },
      { href: "/admin/notifications", label: "Notifications", icon: <I d="M12 4a5 5 0 0 0-5 5v3.5L5.5 15h13L17 12.5V9a5 5 0 0 0-5-5||M10 18a2 2 0 0 0 4 0" /> },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((g) => (
        <div key={g.label} className="flex flex-col gap-1">
          <div className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{g.label}</div>
          {g.items.map((it) => {
            const on = isActive(pathname, it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                className={[
                  "tap group relative flex items-center gap-3 rounded-control px-3 py-2.5 text-[14.5px] font-semibold transition-colors",
                  on ? "bg-surface-2 text-ink" : "text-body-2 hover:bg-surface-2 hover:text-ink",
                ].join(" ")}
              >
                {on ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand" /> : null}
                <span className={on ? "text-brand" : "text-muted-2 group-hover:text-ink"}>{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  children,
  notifs,
  unread,
  email,
}: {
  children: ReactNode;
  notifs: CoachNotif[];
  unread: number;
  email: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const brandBadge = (
    <div className="flex items-center gap-2.5">
      <Wordmark size={20} />
      <span className="rounded-pill border border-line-4 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
        Admin
      </span>
    </div>
  );

  const footer = (
    <div className="flex flex-col gap-3 border-t border-line pt-3">
      <div className="truncate px-1 text-[12px] text-muted-2" title={email}>
        {email}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <form action={signOutAction} className="ml-auto">
          <button
            type="submit"
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="tap flex h-9 items-center gap-1.5 rounded-btn border border-line-4 bg-surface px-3 text-[13px] font-semibold text-body-2 hover:border-ink hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
              <path d="M10 12h11m0 0-3-3m3 3-3 3" />
            </svg>
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper lg:flex">
      {/* ───────── Barre latérale (desktop ≥ lg) ───────── */}
      <aside className="sticky top-0 hidden h-dvh w-[262px] shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="flex items-center justify-between gap-2">
          {brandBadge}
          <CoachBell notifs={notifs} unread={unread} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>
        {footer}
      </aside>

      {/* ───────── Barre du haut (mobile < lg) ───────── */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="tap flex size-10 items-center justify-center rounded-btn border border-line-4 bg-surface text-body-2 hover:border-ink"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        {brandBadge}
        <CoachBell notifs={notifs} unread={unread} />
      </div>

      {/* ───────── Tiroir (mobile) ───────── */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Fermer le menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/30 backdrop-blur-[1px]" />
          <div className="absolute inset-y-0 left-0 flex w-[280px] max-w-[86vw] flex-col gap-6 border-r border-line bg-surface px-4 py-5 shadow-xl animate-[slidein_0.18s_ease-out]">
            <div className="flex items-center justify-between gap-2">
              {brandBadge}
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="tap flex size-9 items-center justify-center rounded-control text-muted-2 hover:text-ink">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            {footer}
          </div>
        </div>
      ) : null}

      {/* ───────── Contenu ───────── */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1080px] px-5 py-6 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
