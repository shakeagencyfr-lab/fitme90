"use client";

import { usePhrase } from "@/components/locale-provider";
import { LangSwitch } from "@/components/lang-switch";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { CoachBell } from "@/components/coach-bell";
import { PageTransition } from "@/components/page-transition";
import { AdminSearch, type SearchDest } from "@/components/admin-search";
import { signOutAction } from "@/app/(auth)/actions";
import type { CoachNotif } from "@/lib/notifications";
import type { TenantKind } from "@/lib/hierarchy";
import type { CostView } from "@/lib/ai-supply";
import { themeProps } from "@/components/tenant-theme";
import type { TenantTheme } from "@/lib/theme";

// Navigation du dashboard coach, façon « app shell » soigné : barre latérale
// verticale à partir de lg ; sur mobile, barre du haut flottante + tiroir en
// carte arrondie. Onglets regroupés par thème, item actif en pastille.

// `kinds` restreint l'item à certains niveaux ; absent = visible par tous.
/**
 * `kinds` : les étages qui voient l'entrée ; `views` : les façons de voir ses
 * coûts qui la justifient. « Mes crédits » ne parle qu'à qui achète des
 * crédits : un compte en clé personnelle, ou dont l'IA est comprise, n'y
 * trouverait qu'un solde à zéro et rien à acheter.
 */
type Item = { href: string; label: string; icon: ReactNode; kinds?: TenantKind[]; views?: CostView[] };

function I({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d.split("||").map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

// Regroupement par INTENTION, pas par nature technique. « Réglages » était
// devenu un fourre-tout de six entrées dont trois parlaient d'IA sans qu'on
// sache laquelle faisait quoi : configuration, consommation et crédits sont
// maintenant côte à côte sous un seul titre.
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Pilotage",
    items: [
      // Écran de synthèse : le chiffre d'abord, le détail ensuite dans les
      // onglets qui suivent.
      { href: "/admin/tableau-de-bord", label: "Tableau de bord", icon: <I d="M4 13h6V4H4z||M14 20h6v-9h-6z||M4 20h6v-4H4z||M14 8h6V4h-6z" /> },
      { href: "/admin", label: "Clients", kinds: ["coach"], icon: <I d="M16 19a4 4 0 0 0-8 0||M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7||M20 19a3.5 3.5 0 0 0-4-3.4||M8 15.6A3.5 3.5 0 0 0 4 19" /> },
      { href: "/admin/prospects", label: "Prospects", kinds: ["coach"], icon: <I d="M15 19a4 4 0 0 0-8 0||M11 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7||M18 8v6||M21 11h-6" /> },
      { href: "/admin/reservations", label: "Réservations", kinds: ["coach"], icon: <I d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 17.5z||M5 10h14||M9 3v4||M15 3v4||M9.5 14.5l1.8 1.8 3.4-3.6" /> },
      { href: "/admin/reseau", label: "Mon réseau", kinds: ["platform", "reseller"], icon: <I d="M12 3v4||M6 21v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3||M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4" /> },
    ],
  },
  {
    label: "Vendre",
    items: [
      { href: "/admin/plans", label: "Plans", kinds: ["coach"], icon: <I d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5z||M4 10h16" /> },
      { href: "/admin/paliers", label: "Paliers", kinds: ["platform", "reseller"], icon: <I d="M12 4l8 4-8 4-8-4z||M4 12l8 4 8-4||M4 16l8 4 8-4" /> },
      { href: "/admin/codes", label: "Codes promo", kinds: ["coach"], icon: <I d="M4 9V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a2 2 0 0 0 0 4v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a2 2 0 0 0 0-4||M14 6v12" /> },
      { href: "/admin/affiliation", label: "Affiliation", kinds: ["coach"], icon: <I d="M8.7 13.3 15.3 16.7||M15.3 7.3 8.7 10.7||M6 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5||M18 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5||M18 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" /> },
      { href: "/admin/shop", label: "Boutique", kinds: ["coach"], icon: <I d="M6 8h12l-1 12H7z||M9 8V6a3 3 0 0 1 6 0v2" /> },
    ],
  },
  {
    label: "Ma marque",
    items: [
      { href: "/admin/marque-blanche", label: "Marque blanche", icon: <I d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z||M9 20V4" /> },
      { href: "/admin/site", label: "Mon site", kinds: ["coach"], icon: <I d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z||M4 9h16||M7 7h.01" /> },
      { href: "/admin/fiche-google", label: "Fiche Google", kinds: ["coach"], icon: <I d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z||M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5" /> },
      { href: "/admin/exercices", label: "Exercices", kinds: ["coach"], icon: <I d="M6.5 9.5v5||M17.5 9.5v5||M4 11v2||M20 11v2||M6.5 12h11" /> },
    ],
  },
  {
    label: "Intelligence artificielle",
    items: [
      { href: "/admin/config", label: "Ma méthode", kinds: ["coach"], icon: <I d="M12 4l1.4 3.6L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4z||M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8L15.5 17.5l1.8-.7z" /> },
      { href: "/admin/consommation", label: "Consommation", icon: <I d="M4 19h16||M7 19V11||M12 19V6||M17 19v-5" /> },
      { href: "/admin/credits", label: "Mes crédits", kinds: ["coach", "reseller"], views: ["credits"], icon: <I d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20||M12 7v10||M9.5 9.5a2.5 2 0 0 1 5 0c0 2.5-5 1.5-5 4a2.5 2 0 0 0 5 0" /> },
      { href: "/admin/ia-revenu", label: "Revenu IA", kinds: ["platform", "reseller"], icon: <I d="M12 3v18||M8 7h6a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 0 0 5h7" /> },
    ],
  },
  {
    label: "Mon compte",
    items: [
      { href: "/admin/abonnement", label: "Mon abonnement", kinds: ["coach", "reseller"], icon: <I d="M4 8a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z||M4 10h9||M15 13h2.5" /> },
      { href: "/admin/notifications", label: "Notifications", kinds: ["coach"], icon: <I d="M12 4a5 5 0 0 0-5 5v3.5L5.5 15h13L17 12.5V9a5 5 0 0 0-5-5||M10 18a2 2 0 0 0 4 0" /> },
      { href: "/admin/integrations", label: "Intégrations", icon: <I d="M9 7V4||M15 7V4||M7 7h10v4a5 5 0 0 1-10 0z||M12 16v4" /> },
      // Nom de la plateforme, nom de la personne, mot de passe. L'entrée
      // manquait : le nom choisi à la création n'était plus modifiable.
      { href: "/admin/compte", label: "Mon compte", icon: <I d="M16 19a4 4 0 0 0-8 0||M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7||M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20" /> },
    ],
  },
];

/** Groupes filtrés pour un niveau de tenant et sa vue des coûts (items sans `kinds` ni `views` = tous). */
function groupsForKind(kind: TenantKind, view: CostView, hidden: string[]): { label: string; items: Item[] }[] {
  return GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter(
      (it) => (!it.kinds || it.kinds.includes(kind)) && (!it.views || it.views.includes(view)) && !hidden.includes(it.href),
    ),
  })).filter((g) => g.items.length > 0);
}

/** Écrans indexés par la palette ⌘K, tirés du menu lui-même. */
function searchDestinations(kind: TenantKind, view: CostView, hidden: string[]): SearchDest[] {
  return groupsForKind(kind, view, hidden).flatMap((g) => g.items.map((it) => ({ href: it.href, label: it.label, group: g.label })));
}

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavList({
  pathname,
  kind,
  view,
  hidden,
  onNavigate,
  collapsed = false,
}: {
  pathname: string;
  kind: TenantKind;
  view: CostView;
  hidden: string[];
  onNavigate?: () => void;
  /** Rail d'icônes : les libellés disparaissent, les titres de groupe aussi. */
  collapsed?: boolean;
}) {
  const tx = usePhrase();
  const groups = groupsForKind(kind, view, hidden);
  return (
    <nav className={collapsed ? "flex flex-col gap-2" : "flex flex-col gap-5"}>
      {groups.map((g, gi) => (
        <div key={tx(g.label)} className={collapsed ? "flex flex-col gap-1.5" : "flex flex-col gap-1"}>
          {collapsed ? (
            // Le titre de groupe ne tient pas sur 72 px : un filet le remplace
            // et garde le rythme visuel des familles d'onglets.
            gi > 0 ? <div className="mx-auto my-1 h-px w-7 bg-line" aria-hidden /> : null
          ) : (
            <div className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx(g.label)}</div>
          )}
          {g.items.map((it) => {
            const on = isActive(pathname, it.href);
            const label = tx(it.label);
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={onNavigate}
                aria-current={on ? "page" : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                className={[
                  "tap group relative flex items-center overflow-hidden rounded-control font-semibold transition-colors",
                  collapsed ? "h-11 w-11 justify-center self-center" : "gap-3 px-3.5 py-3 text-[15px]",
                  on ? "bg-surface-2 text-ink" : "text-body-2 hover:bg-surface-2/70 hover:text-ink",
                ].join(" ")}
              >
                {on ? <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand" /> : null}
                <span className={on ? "text-brand" : "text-muted-2 group-hover:text-ink"}>{it.icon}</span>
                {collapsed ? null : label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Mémorise l'état replié du rail d'un écran à l'autre. */
const RAIL_KEY = "admin-rail";

function useRail(): [boolean, () => void] {
  const [rail, setRail] = useState(false);
  useEffect(() => {
    // Lecture différée : le serveur ne connaît pas localStorage, lire pendant
    // le rendu ferait diverger le HTML hydraté.
    queueMicrotask(() => {
      try {
        setRail(localStorage.getItem(RAIL_KEY) === "1");
      } catch {
        /* stockage indisponible : on reste déployé */
      }
    });
  }, []);
  const toggle = () => {
    setRail((v) => {
      const next = !v;
      try {
        localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {
        /* stockage indisponible : la bascule vaut pour la session */
      }
      return next;
    });
  };
  return [rail, toggle];
}

const BURGER = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

/**
 * Replier : double chevron posé à DROITE de l'en-tête quand le menu est
 * déployé. Le geste et sa direction se lisent au même endroit, comme sur le
 * menu de référence.
 */
function CollapseButton({ onToggle }: { onToggle: () => void }) {
  const tx = usePhrase();
  const label = tx("Replier le menu");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded
      title={label}
      className="tap flex size-9 shrink-0 items-center justify-center rounded-control text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 6l-5 6 5 6M18 6l-5 6 5 6" />
      </svg>
    </button>
  );
}

/** Déplier : hamburger centré sous la pastille de marque, en mode rail. */
function ExpandButton({ onToggle }: { onToggle: () => void }) {
  const tx = usePhrase();
  const label = tx("Déployer le menu");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={false}
      title={label}
      className="tap flex size-9 shrink-0 items-center justify-center rounded-control text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {BURGER}
    </button>
  );
}

/**
 * Épingler : n'apparaît que pendant le survol d'un rail replié. Le rail se
 * déploie alors PAR-DESSUS le contenu, sans le décaler ; ce bouton transforme
 * ce coup d'oeil en état durable.
 */
function PinButton({ onToggle }: { onToggle: () => void }) {
  const tx = usePhrase();
  return (
    <button
      type="button"
      onClick={onToggle}
      className="tap flex w-full items-center gap-3 rounded-control px-3.5 py-3 text-[15px] font-semibold text-body-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <span className="text-muted-2">{BURGER}</span>
      {tx("Garder ouvert")}
    </button>
  );
}

// Bascule de thème compacte (une seule icône) : lune en clair, soleil en sombre.
function ThemeIconButton() {
  const tx = usePhrase();
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
      aria-label={tx("Changer de thème")}
      title={tx("Changer de thème")}
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

const CARD_CLASS =
  "tap lift flex flex-col gap-1 rounded-control border border-line bg-surface-2 px-3.5 py-3 hover:border-ink/40";
const CARD_LABEL = "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2";
const SPARK = (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3l1.6 4L18 8.5l-4 3 1 4.5-3-2.4-3 2.4 1-4.5-4-3L10.4 7z" />
  </svg>
);

// Carte « conso IA du mois » (BYOK) : coût estimé cumulé depuis le 1er du mois.
// En BYOK le coach paie sa propre facture Anthropic, donc ce qui l'intéresse
// est un montant.
/** Même information réduite à la largeur du rail : icône + chiffre, rien d'autre. */
function RailCard({ href, title, value, alert = false }: { href: string; title: string; value: string; alert?: boolean }) {
  return (
    <Link
      href={href}
      title={title}
      aria-label={title}
      className="tap lift flex flex-col items-center gap-1 rounded-control border border-line bg-surface-2 px-1 py-2 hover:border-ink/40"
    >
      <span className="text-brand">{SPARK}</span>
      <span
        className={`font-archivo text-[12px] font-extrabold leading-none tabular-nums ${alert ? "text-[#C4471A]" : "text-ink"}`}
      >
        {value}
      </span>
    </Link>
  );
}

function UsageCard({ costUsd, calls }: { costUsd: number; calls: number }) {
  const tx = usePhrase();
  return (
    <Link href="/admin/compte" className={CARD_CLASS}>
      <div className={CARD_LABEL}>
        {SPARK}
        {tx("Conso IA · ce mois")}</div>
      <div className="flex items-baseline gap-2 text-ink">
        <span className="font-archivo text-[20px] font-extrabold leading-none tracking-[-0.02em]">
          ${costUsd.toFixed(2)}
        </span>
        <span className="text-[11px] text-muted-2">{calls} {tx("appel")}{calls > 1 ? "s" : ""}</span>
      </div>
    </Link>
  );
}

/**
 * Même emplacement, autre compteur : en modèle CRÉDITS le coach n'a aucune
 * facture Anthropic, il a un solde qui descend. Afficher un montant en dollars
 * n'aurait aucun sens pour lui, on montre donc ce qui lui reste. Le solde vire
 * au rouge à zéro : c'est le moment où l'IA de ses clients s'arrête.
 */
function WalletCard({ credits }: { credits: number }) {
  const tx = usePhrase();
  const empty = credits <= 0;
  return (
    <Link href="/admin/credits" className={CARD_CLASS}>
      <div className={CARD_LABEL}>
        {SPARK}
        {tx("Crédits · restants")}</div>
      <div className="flex items-baseline gap-2">
        <span
          className={`font-archivo text-[20px] font-extrabold leading-none tracking-[-0.02em] tabular-nums ${empty ? "text-[#C4471A]" : "text-ink"}`}
        >
          {credits}
        </span>
        <span className="text-[11px] text-muted-2">{tx("crédit")}{credits > 1 ? "s" : ""} IA</span>
      </div>
    </Link>
  );
}

/**
 * L'IA est comprise dans l'abonnement : ni facture, ni solde. Le seul chiffre
 * qui reste vrai pour ce coach est le nombre d'appels du mois.
 */
function IncludedCard({ calls }: { calls: number }) {
  const tx = usePhrase();
  return (
    <Link href="/admin/consommation" className={CARD_CLASS}>
      <div className={CARD_LABEL}>
        {SPARK}
        {tx("IA · ce mois")}</div>
      <div className="flex items-baseline gap-2 text-ink">
        <span className="font-archivo text-[20px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{calls}</span>
        <span className="text-[11px] text-muted-2">{calls > 1 ? tx("appels, compris dans ton abonnement") : tx("appel, compris dans ton abonnement")}</span>
      </div>
    </Link>
  );
}

/**
 * Marque réduite à une pastille carrée pour le rail : le logo s'il existe,
 * sinon l'initiale sur un fond aux couleurs de la marque.
 */
function BrandTile({ name, logoUrl }: { name: string | null; logoUrl: string | null }) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logoUrl} alt={name ?? ""} className="size-9 rounded-control object-contain" />;
  }
  const initial = (name ?? "My Fitness App").trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden
      className="flex size-9 items-center justify-center rounded-control bg-brand font-archivo text-[17px] font-extrabold text-white"
    >
      {initial}
    </span>
  );
}

export function AdminShell({
  children,
  notifs,
  unread,
  email,
  kind,
  aiCostUsd = 0,
  aiCalls = 0,
  aiView = "usd",
  hiddenHrefs = [],
  wallet = null,
  brandName = null,
  brandLogoUrl = null,
  brandLogoDarkUrl = null,
  brandTheme = null,
}: {
  children: ReactNode;
  notifs: CoachNotif[];
  unread: number;
  email: string;
  kind: TenantKind;
  aiCostUsd?: number;
  aiCalls?: number;
  /** Ce que ce compte a le droit de voir : des dollars, des crédits, ou rien. */
  aiView?: CostView;
  /**
   * Écrans retirés du menu pour CE compte, au-delà de son étage et de sa vue :
   * « Revenu IA » pour un revendeur qui ne fournit pas l'IA, par exemple.
   */
  hiddenHrefs?: string[];
  /** Solde de crédits, renseigné UNIQUEMENT quand le compte achète des crédits. */
  wallet?: { credits: number } | null;
  /** Marque du tenant PARENT (revendeur pour un coach, plateforme pour un
   *  revendeur). Le dashboard porte CETTE marque — jamais My Fitness App pour un coach. */
  brandName?: string | null;
  brandLogoUrl?: string | null;
  /** Variante du logo pour fond sombre : un logo clair y disparaîtrait. */
  brandLogoDarkUrl?: string | null;
  /** Thème du parent : couleurs, polices, apparence de tout le dashboard. */
  brandTheme?: TenantTheme | null;
}) {
  const tx = usePhrase();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rail, toggleRail] = useRail();
  // Survol d'un rail replié : on déploie le temps du regard, sans rien figer.
  const [peek, setPeek] = useState(false);
  // Largeur pleine : soit le menu est épinglé ouvert, soit on le survole.
  const wide = !rail || peek;
  const dests = searchDestinations(kind, aiView, hiddenHrefs);

  // Le survol n'a de sens qu'avec un vrai pointeur. Sur un écran tactile, un
  // simple effleurement déclenche mouseenter et laisserait le panneau déployé
  // par-dessus le contenu sans moyen évident de le refermer.
  const hoverPeek = (on: boolean) => {
    if (typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches) return;
    setPeek(on);
  };

  // Replier depuis le panneau déployé : le pointeur est encore dessus, donc
  // sans cette remise à zéro le coup d'oeil reprendrait aussitôt la main et le
  // clic n'aurait aucun effet visible.
  const collapse = () => {
    setPeek(false);
    toggleRail();
  };
  // Le même emplacement, trois chiffres possibles. Un compte qui achète des
  // crédits lit son solde ; un compte dont l'IA est comprise lit ses appels ;
  // seul un compte sur sa propre clé lit des dollars. Un montant en dollars
  // chez les deux premiers trahirait la marge de leur fournisseur.
  const credits = wallet?.credits ?? 0;
  const usageCard =
    aiView === "credits" ? (
      <WalletCard credits={credits} />
    ) : aiView === "included" ? (
      <IncludedCard calls={aiCalls} />
    ) : (
      <UsageCard costUsd={aiCostUsd} calls={aiCalls} />
    );
  const railUsageCard =
    aiView === "credits" ? (
      <RailCard
        href="/admin/credits"
        title={`${tx("Crédits · restants")} : ${credits}`}
        value={String(credits)}
        alert={credits <= 0}
      />
    ) : aiView === "included" ? (
      <RailCard href="/admin/consommation" title={`${tx("IA · ce mois")} : ${aiCalls}`} value={String(aiCalls)} />
    ) : (
      <RailCard
        href="/admin/compte"
        title={`${tx("Conso IA · ce mois")} : $${aiCostUsd.toFixed(2)}`}
        value={`$${aiCostUsd.toFixed(2)}`}
      />
    );


  // La marque seule. `min-w-0` + `truncate` : sur 264 px, un nom long doit se
  // couper proprement au lieu de pousser la cloche par-dessus le logotype.
  const brandMark = (
    <span className="flex min-w-0 items-center">
      {brandLogoUrl ? (
        <>
          {/* Hauteur pilotée par le thème du parent (« Taille du logo »).
              Deux <img> plutôt qu'un choix en JavaScript : le thème sombre est
              posé avant l'hydratation, une bascule côté client ferait clignoter
              le mauvais logo au premier rendu. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogoUrl}
            alt={brandName ?? ""}
            className={`w-auto max-w-[130px] object-contain ${brandLogoDarkUrl ? "dark:hidden" : ""}`}
            style={{ height: "var(--wl-logo-h)" }}
          />
          {brandLogoDarkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogoDarkUrl}
              alt={brandName ?? ""}
              className="hidden w-auto max-w-[130px] object-contain dark:block"
              style={{ height: "var(--wl-logo-h)" }}
            />
          ) : null}
        </>
      ) : brandName ? (
        <span className="truncate font-archivo text-[19px] font-extrabold tracking-[-0.02em] text-ink">{brandName}</span>
      ) : (
        <Wordmark size={19} />
      )}
    </span>
  );

  // Avec la pastille « Admin » : gardée pour le tiroir mobile, où la cloche
  // n'est pas dans la même rangée et où la place ne manque pas.
  const brandBadge = (
    <div className="flex min-w-0 items-center gap-2.5">
      {brandMark}
      <span className="shrink-0 rounded-pill border border-line-4 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
        {tx("Admin")}</span>
    </div>
  );

  const signOutButton = (
    <form action={signOutAction}>
        <button
          type="submit"
          aria-label={tx("Se déconnecter")}
          title={tx("Se déconnecter")}
          className="tap flex size-9 items-center justify-center rounded-control border border-line-4 text-muted transition-colors hover:border-ink hover:text-[#C4471A]"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
            <path d="M10 12h11m0 0-3-3m3 3-3 3" />
          </svg>
        </button>
    </form>
  );

  // Déployé : l'adresse e-mail puis les trois boutons sur une ligne.
  // Replié : les boutons empilés, l'adresse ne tiendrait pas sur 72 px.
  const footer = (
    <div className="flex items-center gap-2 border-t border-line pt-3">
      <span className="min-w-0 flex-1 truncate text-[12px] text-muted-2" title={email}>
        {email}
      </span>
      <ThemeIconButton />
      <LangSwitch compact />
      {signOutButton}
    </div>
  );

  const railFooter = (
    <div className="flex flex-col items-center gap-2 border-t border-line pt-3">
      <ThemeIconButton />
      {signOutButton}
    </div>
  );

  return (
    <div className="min-h-dvh bg-paper lg:flex" {...themeProps(brandTheme)}>
      {/* ───────── Barre latérale (desktop ≥ lg) ─────────
          Trois états :
            déployée   264 px, chevron « à droite pour replier
            rail       76 px, icônes seules, hamburger sous la pastille
            coup d'oeil  le rail survolé se déploie PAR-DESSUS le contenu, sans
                       le décaler ; « Garder ouvert » fige ce coup d'oeil.
          L'emprise de l'aside ne change pas pendant le coup d'oeil : c'est le
          panneau intérieur, en position absolue, qui s'élargit. Sinon toute la
          page se décalerait au moindre passage de souris. */}
      <aside className={`sticky top-0 z-40 hidden h-dvh shrink-0 lg:block ${rail ? "w-[76px]" : "w-[264px]"}`}>
        <div
          onMouseEnter={() => hoverPeek(true)}
          onMouseLeave={() => hoverPeek(false)}
          className={[
            "flex h-dvh flex-col gap-5 border-r border-line bg-surface py-5",
            "transition-[width,padding] duration-300 ease-out motion-reduce:transition-none",
            wide ? "w-[264px] px-4" : "w-[76px] px-3",
            rail ? "absolute inset-y-0 left-0 z-40" : "",
            rail && peek ? "shadow-[0_24px_60px_-18px_rgba(23,25,27,0.35)]" : "",
          ].join(" ")}
        >
          {wide ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                {brandMark}
                {rail ? null : <CollapseButton onToggle={collapse} />}
              </div>
              {/* Pendant le coup d'oeil, la première ligne du menu propose de
                  garder le panneau ouvert : le geste est là où le regard est. */}
              {rail ? <PinButton onToggle={toggleRail} /> : null}
              {/* Notifications et recherche sont des LIGNES de menu, pas des
                  icônes tassées dans l'en-tête : le compteur de non-lus se lit
                  d'un coup d'oeil et le champ de recherche montre son
                  raccourci. */}
              <CoachBell notifs={notifs} unread={unread} align="left" variant="row" />
              <AdminSearch destinations={dests} kind={kind} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <BrandTile name={brandName} logoUrl={brandLogoUrl} />
              <ExpandButton onToggle={toggleRail} />
              {/* Replié, la ligne redevient ce qu'elle peut être sur 76 px :
                  une cloche et une loupe. */}
              <CoachBell notifs={notifs} unread={unread} align="left" variant="icon" />
              <AdminSearch destinations={dests} kind={kind} variant="icon" />
            </div>
          )}

          <div className={wide ? "min-h-0 flex-1 overflow-y-auto" : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden"}>
            <NavList pathname={pathname} kind={kind} view={aiView} hidden={hiddenHrefs} collapsed={!wide} />
          </div>

          <div className="flex flex-col gap-3">
            {wide ? usageCard : railUsageCard}
            {wide ? footer : railFooter}
          </div>
        </div>
      </aside>

      {/* ───────── Barre du haut flottante (mobile < lg) ───────── */}
      {/* Flottante pour de vrai : pas de bandeau opaque derrière la carte,
          le contenu passe dessous et se devine à travers le flou. */}
      <div className="pointer-events-none sticky top-0 z-30 px-3 pt-3 lg:hidden">
        <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-card border border-line bg-surface/80 px-3 py-2.5 shadow-[0_4px_16px_rgba(23,25,27,0.06)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={tx("Ouvrir le menu")}
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
          <button aria-label={tx("Fermer le menu")} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div className="absolute inset-y-3 left-3 flex w-[300px] max-w-[87vw] flex-col gap-5 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-2xl animate-[slidein_0.2s_ease-out]">
            <div className="flex items-center justify-between gap-2">
              {brandBadge}
              <button onClick={() => setOpen(false)} aria-label={tx("Fermer")} className="tap flex size-9 items-center justify-center rounded-control text-muted-2 hover:bg-surface-2 hover:text-ink">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <AdminSearch destinations={dests} kind={kind} />
            <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
              <NavList pathname={pathname} kind={kind} view={aiView} hidden={hiddenHrefs} onNavigate={() => setOpen(false)} />
            </div>
            <div className="flex flex-col gap-3">
              {usageCard}
              {footer}
            </div>
          </div>
        </div>
      ) : null}

      {/* ───────── Contenu ───────── */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1080px] px-4 py-5 sm:px-8 sm:py-6">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
