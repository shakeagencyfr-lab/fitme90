"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand";
import { useT } from "@/components/locale-provider";
import type { TFn } from "@/lib/i18n";

// Icônes line (stroke), cohérentes, lisibles à petite taille.
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
  shop: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </>
  ),
  profil: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </>
  ),
  reservation: (
    <>
      <path d="M5 7.5A1.5 1.5 0 0 1 6.5 6h11A1.5 1.5 0 0 1 19 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z" />
      <path d="M5 10.5h14M9 4v4M15 4v4M9.5 14.5l1.8 1.8 3.4-3.6" />
    </>
  ),
  parrainage: (
    <>
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8 11 16 7M8 13l8 4" />
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

// Onglets rangés dans « Plus » sur mobile (le reste va dans la barre du bas).
const IN_MORE = ["/app/evolution", "/app/shop", "/app/chat", "/app/parrainage", "/app/reservation"];

// Construit la liste des onglets selon les options activées (boutique, chat VIP,
// parrainage).
function buildItems(t: TFn, shopEnabled: boolean, vipEnabled: boolean, affiliationEnabled: boolean, bookingEnabled: boolean): Item[] {
  return [
    { href: "/app", label: t("nav.program"), icon: "programme" },
    { href: "/app/agenda", label: t("nav.agenda"), icon: "agenda" },
    { href: "/app/seance", label: t("nav.session"), icon: "seance" },
    { href: "/app/nutrition", label: t("nav.nutrition"), icon: "nutrition" },
    { href: "/app/evolution", label: t("nav.evolution"), icon: "evolution" },
    ...(vipEnabled ? [{ href: "/app/chat", label: t("nav.vipChat"), icon: "chat" } as Item] : []),
    ...(bookingEnabled ? [{ href: "/app/reservation", label: t("nav.booking"), icon: "reservation" } as Item] : []),
    ...(shopEnabled ? [{ href: "/app/shop", label: t("nav.shop"), icon: "shop" } as Item] : []),
    ...(affiliationEnabled ? [{ href: "/app/parrainage", label: t("nav.referral"), icon: "parrainage" } as Item] : []),
    { href: "/app/profil", label: t("nav.profile"), icon: "profil" },
  ];
}

// Repères pour le tutoriel guidé (surbrillance des onglets).
const TOUR: Record<string, string> = {
  "/app": "programme",
  "/app/agenda": "agenda",
  "/app/seance": "seance",
  "/app/nutrition": "nutrition",
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

// Pastille de comptage (non-lus), lisible et compacte (99+ au-delà).
function CountBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 font-mono text-[10px] font-bold leading-none text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

// Point de notification superposé sur une icône (barre du bas / onglet compact).
function Dot() {
  return (
    <span className="absolute -right-1.5 -top-1 size-[9px] rounded-full bg-brand ring-2 ring-surface" />
  );
}

export function AppNav({
  day,
  dayPct,
  programDays = 90,
  cycleName,
  shopEnabled = false,
  vipEnabled = false,
  affiliationEnabled = false,
  bookingEnabled = false,
  vipUnread = 0,
  brandName = null,
  brandLogoUrl = null,
}: {
  day: number;
  dayPct: number;
  /** Durée totale du programme (jours), selon l'offre du client. */
  programDays?: number;
  cycleName?: string;
  shopEnabled?: boolean;
  vipEnabled?: boolean;
  affiliationEnabled?: boolean;
  bookingEnabled?: boolean;
  vipUnread?: number;
  brandName?: string | null;
  brandLogoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const t = useT();
  const ALL = buildItems(t, shopEnabled, vipEnabled, affiliationEnabled, bookingEnabled);
  const PRIMARY = ALL.filter((i) => !IN_MORE.includes(i.href));
  const SECONDARY = ALL.filter((i) => IN_MORE.includes(i.href));
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  const secondaryActive = SECONDARY.some((i) => isActive(i.href));
  // Non-lus rattachés à l'onglet Chat VIP (0 si l'option n'est pas active).
  const unreadFor = (href: string) => (href === "/app/chat" ? vipUnread : 0);
  // Le bouton « Plus » (mobile) doit signaler un non-lu caché dedans.
  const secondaryUnread = SECONDARY.reduce((n, i) => n + unreadFor(i.href), 0);

  return (
    <>
      {/* ───────── Sidebar (desktop ≥ nav) : tous les onglets ───────── */}
      <nav className="hidden nav:sticky nav:top-0 nav:flex nav:h-dvh nav:w-[228px] nav:shrink-0 nav:flex-col nav:gap-0.5 nav:overflow-auto nav:border-r nav:border-line nav:px-3.5 nav:py-6">
        <div className="flex flex-col gap-1.5 px-2.5 pb-4">
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brandLogoUrl} alt={brandName ?? "Logo"} className="h-9 w-auto max-w-[170px] object-contain" />
          ) : brandName ? (
            <div className="font-archivo font-extrabold text-[20px] leading-tight tracking-[-0.02em] text-ink">{brandName}</div>
          ) : (
            <Wordmark size={19} />
          )}
          <div className="font-mono uppercase tracking-[0.14em] text-[10px] text-muted-2">
            {day >= 1 ? t("access.active", { day, total: programDays }) : t("access.scheduled", { days: 1 - day })}
          </div>
        </div>

        {ALL.map((it) => {
          const on = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              data-tour={TOUR[it.href]}
              className={[
                "tap group flex flex-row items-center justify-start gap-[11px] rounded-control px-3 py-[11px] text-[14px] font-medium transition-colors",
                on ? "bg-fill text-fillfg" : "text-body-2 hover:bg-paper",
              ].join(" ")}
            >
              <span className="relative transition-transform group-active:scale-90">
                <Icon>{I[it.icon]}</Icon>
              </span>
              <span className="font-semibold tracking-[-0.01em]">{it.label}</span>
              <span className="ml-auto">
                <CountBadge n={unreadFor(it.href)} />
              </span>
            </Link>
          );
        })}

        <div className="mt-auto flex justify-center py-3">
          <ThemeToggle />
        </div>

        <div className="flex flex-col gap-2 rounded-card bg-paper p-4">
          <div className="font-mono uppercase tracking-[0.12em] text-[10px] text-muted-2">{t("nav.progress")}</div>
          <div className="font-archivo font-extrabold text-[34px] leading-[0.9] tracking-[-0.03em] text-ink">
            {Math.max(0, day)}
            <span className="text-[16px] text-muted-2">/{programDays}</span>
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
            aria-label={t("common.close")}
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
                  <span className="ml-auto">
                    <CountBadge n={unreadFor(it.href)} />
                  </span>
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
              data-tour={TOUR[it.href]}
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
          aria-label={t("nav.more")}
          aria-expanded={more}
          className={[
            "tap group flex min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-control px-0.5 py-[7px] transition-colors",
            more || secondaryActive ? "bg-paper text-brand" : "text-muted-2",
          ].join(" ")}
        >
          <span className="relative transition-transform group-active:scale-90">
            <Icon>{I.plus}</Icon>
            {secondaryUnread > 0 && !more ? <Dot /> : null}
          </span>
          <span className="text-[9.5px] font-semibold tracking-[-0.01em]">{t("nav.more")}</span>
        </button>
      </nav>
    </>
  );
}
