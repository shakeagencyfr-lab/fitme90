"use client";

import { usePhrase } from "@/components/locale-provider";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TenantKind } from "@/lib/hierarchy";

// Recherche du dashboard : une ligne dans le menu, une palette au clavier.
//
// Deux populations d'un même index :
//   - les ÉCRANS, connus à l'avance et filtrés côté client, donc instantanés
//   - les PERSONNES (clients, prospects), cherchées côté serveur au-delà de
//     deux caractères, car un coach peut en avoir des centaines
//
// La saisie est débattue de 220 ms : sans ça, taper « seb » lance trois
// requêtes dont deux dont on jette le résultat.

export interface SearchDest {
  href: string;
  label: string;
  group: string;
}

interface PersonHit {
  id: string;
  name: string;
  email: string;
  kind: "client" | "prospect";
}

const ICON = {
  screen: (
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z" />
  ),
  person: (
    <>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <path d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
    </>
  ),
} as const;

function Row({
  active,
  onSelect,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors",
        active ? "bg-surface-2" : "hover:bg-surface-2/70",
      ].join(" ")}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-brand/10 text-brand">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon}
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[12px] text-muted-2">{sub}</span>
      </span>
    </button>
  );
}

export function AdminSearch({
  destinations,
  kind,
  variant = "row",
}: {
  destinations: SearchDest[];
  kind: TenantKind;
  /** row : champ pleine largeur dans le menu. icon : loupe seule (rail replié). */
  variant?: "row" | "icon";
}) {
  const tx = usePhrase();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<PersonHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Raccourci clavier. `metaKey` sur Mac, `ctrlKey` ailleurs : les deux, pour
  // ne pas obliger l'utilisateur à savoir sur quoi il tape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // Différé en microtâche : un setState synchrone dans le corps d'un effet
    // est refusé par le compilateur React.
    queueMicrotask(() => {
      if (open) inputRef.current?.focus();
      else {
        setQ("");
        setPeople([]);
        setCursor(0);
      }
    });
  }, [open]);

  // Personnes : côté serveur, débattu, et seulement au-delà de deux caractères.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || kind !== "coach") {
      queueMicrotask(() => setPeople([]));
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { people?: PersonHit[] };
        setPeople(data.people ?? []);
      } catch {
        /* requête annulée ou réseau : la liste des écrans reste utilisable */
      }
    }, 220);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q, kind]);

  const screens = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return destinations;
    // Accents ignorés : « Marque blanche » doit sortir sur « marque ».
    const norm = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const t = norm(term);
    return destinations.filter((d) => norm(d.label).includes(t) || norm(d.group).includes(t));
  }, [destinations, q]);

  const results = useMemo(
    () => [
      ...screens.map((d) => ({ key: `s:${d.href}`, href: d.href, title: d.label, sub: d.group, icon: ICON.screen })),
      ...people.map((p) => ({
        key: `p:${p.id}`,
        href: p.kind === "client" ? `/admin/clients/${p.id}` : "/admin/prospects",
        title: p.name || p.email,
        sub: p.kind === "client" ? p.email : `${tx("Prospect")} · ${p.email}`,
        icon: ICON.person,
      })),
    ],
    [screens, people, tx],
  );

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(0, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) go(hit.href);
    }
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tx("Rechercher")}
        title={`${tx("Rechercher")} (⌘K)`}
        className="tap flex size-9 items-center justify-center rounded-control text-muted-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap group flex w-full items-center gap-3 rounded-control border border-line-3 bg-surface-2/60 px-3.5 py-2.5 text-left transition-colors hover:border-line-4 hover:bg-surface-2"
      >
        <span className="text-muted-2 group-hover:text-ink">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
        </span>
        <span className="flex-1 text-[14.5px] text-muted-2">{tx("Rechercher")}</span>
        <kbd className="shrink-0 rounded-[6px] border border-line-3 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-2">⌘K</kbd>
      </button>
    );

  return (
    <>
      {trigger}
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
          <button aria-label={tx("Fermer")} onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-ink/40 backdrop-blur-[2px]" />
          <div className="relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-2xl animate-[popin_0.16s_ease-out]">
            <div className="flex items-center gap-3 border-b border-line-2 px-4 py-3">
              <span className="text-muted-2">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4 4" />
                </svg>
              </span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onInputKey}
                placeholder={kind === "coach" ? tx("Un écran, un client, un prospect…") : tx("Un écran du dashboard…")}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-2"
              />
              <kbd className="shrink-0 rounded-[6px] border border-line-3 px-1.5 py-0.5 font-mono text-[10.5px] text-muted-2">esc</kbd>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13.5px] text-muted-2">{tx("Aucun résultat.")}</p>
              ) : (
                results.map((r, i) => (
                  <Row key={r.key} active={i === cursor} onSelect={() => go(r.href)} icon={r.icon} title={r.title} sub={r.sub} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
