"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { CoachBell } from "@/components/coach-bell";
import { signOutAction } from "@/app/(auth)/actions";
import type { CoachNotif } from "@/lib/notifications";

// Navigation du dashboard coach, façon « app shell » soigné : barre latérale
// verticale à partir de lg ; sur mobile, barre du haut flottante + tiroir en
// carte arrondie. Onglets regroupés par thème, item actif en pastille.

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
                  "tap group relative flex items-center gap-3 overflow-hidden rounded-control px-3.5 py-3 text-[15px] font-semibold transition-colors",
                  on ? "bg-surface-2 text-ink" : "text-body-2 hover:bg-surface-2/70 hover:text-ink",
                ].join(" ")}
              >
                {on ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand" /> : null}
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

// Bascule de thème compacte (une seule icône) : lune en clair, soleil en sombre.
function ThemeIconButton() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    // Différé (microtâche) pour satisfaire la règle set-state-in-effect.
    queueMicrotask(() => setDark(document.documentElement.classList.contains("dark")));
  }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* stockage indisponible : la bascule reste effective pour la session */
    }
    setDark(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer de thème"
      title="Changer de thème"
      className="tap flex size-9 shrink-0 items-center justify-center rounded-control border border-line-4 text-muted transition-colors hover:border-ink hover:text-ink"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

const statusCard = (
  <div className="flex flex-col gap-1 rounded-control border border-line bg-surface-2 px-3.5 py-3">
    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
        <path d="M5 19v-5M12 19V7M19 19v-9" />
      </svg>
      Statut
    </div>
    <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3FBF6A] opacity-60" />
        <span className="relative inline-flex size-2.5 rounded-full bg-[#3FBF6A]" />
      </span>
      En ligne
    </div>
  </div>
);

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
    <div className="flex items-center gap-2 border-t border-line pt-3">
      <span className="min-w-0 flex-1 truncate text-[12px] text-muted-2" title={email}>
        {email}
      </span>
      <ThemeIconButton />
      <form action={signOutAction}>
        <button
          type="submit"
          aria-label="Se déconnecter"
          title="Se déconnecter"
          className="tap flex size-9 items-center justify-center rounded-control border border-line-4 text-muted transition-colors hover:border-ink hover:text-[#C4471A]"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
            <path d="M10 12h11m0 0-3-3m3 3-3 3" />
          </svg>
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper lg:flex">
      {/* ───────── Barre latérale (desktop ≥ lg) ───────── */}
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col gap-5 border-r border-line bg-surface px-4 py-5 lg:flex">
        <div className="flex items-center justify-between gap-2">
          {brandBadge}
          <CoachBell notifs={notifs} unread={unread} align="left" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>
        <div className="flex flex-col gap-3">
          {statusCard}
          {footer}
        </div>
      </aside>

      {/* ───────── Barre du haut flottante (mobile < lg) ───────── */}
      <div className="sticky top-0 z-30 bg-paper px-3 pt-3 lg:hidden">
        <div className="flex items-center justify-between gap-2 rounded-card border border-line bg-surface px-3 py-2.5 shadow-[0_4px_16px_rgba(23,25,27,0.06)]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="tap flex size-9 items-center justify-center rounded-control text-body-2 hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Wordmark size={19} />
          <CoachBell notifs={notifs} unread={unread} />
        </div>
      </div>

      {/* ───────── Tiroir en carte arrondie (mobile) ───────── */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Fermer le menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div className="absolute inset-y-3 left-3 flex w-[300px] max-w-[87vw] flex-col gap-5 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-2xl animate-[slidein_0.2s_ease-out]">
            <div className="flex items-center justify-between gap-2">
              {brandBadge}
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="tap flex size-9 items-center justify-center rounded-control text-muted-2 hover:bg-surface-2 hover:text-ink">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
              <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <div className="flex flex-col gap-3">
              {statusCard}
              {footer}
            </div>
          </div>
        </div>
      ) : null}

      {/* ───────── Contenu ───────── */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-5 sm:px-8 sm:py-6">{children}</div>
      </main>
    </div>
  );
}
