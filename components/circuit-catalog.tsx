"use client";

import { useMemo, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { ModalLayer } from "@/components/modal-layer";
import { framesOf, libraryEntry } from "@/lib/exercise-library";
import { MuscleIllustration } from "@/components/muscle-illustration";

// Catalogue LECTURE SEULE des circuits de la plateforme. Le coach voit ce que
// son Coach IA peut servir à ses clients : le thème, le matériel, les zones
// ménagées, et le détail des blocs. Il ne peut pas les modifier, mais il peut
// s'en inspirer pour écrire les siens juste en dessous.

export interface CatalogBlock {
  title: string;
  exercises: { key: string; name: string }[];
}

export interface CatalogCircuit {
  id: string;
  title: string;
  goal: string;
  theme: string;
  themeKey: string;
  gear: string;
  gearKey: string;
  levels: string[];
  impact: string;
  avoid: string[];
  safeFor: string[];
  blocks: CatalogBlock[];
}

const TOUT = "tout";

function Badge({ children, tone = "neutre" }: { children: React.ReactNode; tone?: "neutre" | "brand" | "alert" | "ok" }) {
  const tones = {
    neutre: "bg-surface-2 text-muted",
    brand: "bg-brand/10 text-brand",
    alert: "bg-alert text-alert-ink",
    ok: "bg-ok/10 text-ok",
  } as const;
  return <span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function Detail({ c, onClose }: { c: CatalogCircuit; onClose: () => void }) {
  const tx = usePhrase();
  return (
    <ModalLayer onClose={onClose} label={c.title} closeLabel={tx("Fermer")}>
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-xl sm:rounded-card">
        <div className="flex items-start justify-between gap-3 border-b border-line-2 px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-archivo text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-ink">{c.title}</h2>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{c.theme}</Badge>
              <Badge>{c.gear}</Badge>
            </div>
          </div>
          <button onClick={onClose} aria-label={tx("Fermer")} className="tap -mr-1 flex size-9 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <p className="text-[14.5px] leading-[1.6] text-body">{c.goal}</p>
          {c.safeFor.length ? (
            <p className="text-[13px] text-ok">{tx("Écrit pour :")} {c.safeFor.join(", ")}.</p>
          ) : null}
          {c.avoid.length ? (
            <p className="text-[13px] text-muted">{tx("Jamais proposé à un client qui a déclaré :")} {c.avoid.join(", ")}.</p>
          ) : null}
          {c.blocks.map((b, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-card border border-line-2 p-3.5">
              <span className="font-archivo text-[14px] font-bold text-ink">{b.title}</span>
              <div className="flex flex-col gap-1.5">
                {b.exercises.map((e) => {
                  const entry = libraryEntry(e.name, e.key);
                  const [f] = entry ? framesOf(entry) : [];
                  return (
                    <div key={e.key} className="flex items-center gap-2.5">
                      {f ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f} alt="" loading="lazy" className="size-9 shrink-0 rounded-control border border-line-3 object-cover" />
                      ) : (
                        // Une fiche sans photo montre l'illustration de son
                        // groupe musculaire, jamais un carré vide.
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-line-3 bg-surface-2 text-muted-2">
                          <MuscleIllustration muscle={entry?.muscle ?? null} className="h-[80%] w-auto" />
                        </span>
                      )}
                      <span className="text-[13.5px] text-body">{e.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-[12.5px] text-muted-2">
            {tx("Les tours et la durée d'effort ne sont pas figés : ils suivent le niveau du client, son cycle en cours et la durée de sa séance.")}</p>
        </div>
      </div>
    </ModalLayer>
  );
}

export function CircuitCatalog({
  circuits,
  themes,
  gears,
}: {
  circuits: CatalogCircuit[];
  themes: { key: string; label: string }[];
  gears: { key: string; label: string }[];
}) {
  const tx = usePhrase();
  const [theme, setTheme] = useState(TOUT);
  const [gear, setGear] = useState(TOUT);
  const [open, setOpen] = useState<CatalogCircuit | null>(null);

  const shown = useMemo(
    () => circuits.filter((c) => (theme === TOUT || c.themeKey === theme) && (gear === TOUT || c.gearKey === gear)),
    [circuits, theme, gear],
  );

  const pill = (actif: boolean) =>
    `tap rounded-pill border px-3 py-1.5 text-[13px] font-semibold ${
      actif ? "border-ink bg-ink text-surface" : "border-line-4 bg-surface text-muted hover:border-ink/40"
    }`;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setTheme(TOUT)} className={pill(theme === TOUT)}>{tx("Tous les thèmes")}</button>
        {themes.map((t) => (
          <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={pill(theme === t.key)}>{t.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setGear(TOUT)} className={pill(gear === TOUT)}>{tx("Tout le matériel")}</button>
        {gears.map((g) => (
          <button key={g.key} type="button" onClick={() => setGear(g.key)} className={pill(gear === g.key)}>{g.label}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-[14px] text-muted">{tx("Aucun circuit avec ces filtres.")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpen(c)}
              className="tap flex flex-col gap-2 rounded-card border border-line bg-surface p-3.5 text-left transition-colors hover:border-ink/40"
            >
              <span className="font-archivo text-[15px] font-bold leading-tight tracking-[-0.01em] text-ink">{c.title}</span>
              <span className="line-clamp-2 text-[13px] leading-[1.5] text-muted">{c.goal}</span>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                <Badge tone="brand">{c.theme}</Badge>
                <Badge>{c.gear}</Badge>
                {c.safeFor.length ? <Badge tone="ok">{tx("adapté")}</Badge> : null}
              </div>
            </button>
          ))}
        </div>
      )}

      {open ? <Detail c={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
