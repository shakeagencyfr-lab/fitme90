"use client";

import { usePhrase } from "@/components/locale-provider";

import { useMemo, useState } from "react";
import { EXERCISE_LIBRARY, framesOf, normalizeExerciseName, type LibraryExercise } from "@/lib/exercise-library";
import { MuscleIllustration } from "@/components/muscle-illustration";
import { ModalLayer } from "@/components/modal-layer";

// Catalogue LECTURE SEULE de la bibliothèque intégrée : le coach voit tous les
// exercices illustrés par défaut (visuels + consignes) sans pouvoir les modifier.
// Ce sont les ressources appliquées automatiquement à ses clients.

function CatalogCard({ ex, onOpen }: { ex: LibraryExercise; onOpen: () => void }) {
  const [f] = framesOf(ex);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="tap group flex flex-col overflow-hidden rounded-card border border-line bg-surface text-left transition-colors hover:border-ink/40"
    >
      <div className="flex aspect-[3/2] w-full items-center justify-center overflow-hidden bg-surface-2 text-muted-2">
        {!f ? (
          <MuscleIllustration muscle={ex.muscle} className="h-[86%] w-auto py-1.5" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f} alt={ex.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="font-archivo text-[14px] font-bold leading-tight tracking-[-0.01em] text-ink">{ex.name}</span>
        <span className="text-[12px] text-muted-2">{ex.muscle}</span>
      </div>
    </button>
  );
}

function DetailModal({ ex, onClose }: { ex: LibraryExercise; onClose: () => void }) {
  const tx = usePhrase();
  const [a, b] = framesOf(ex);
  return (
    <ModalLayer onClose={onClose} label={ex.name} closeLabel={tx("Fermer")}>
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-xl sm:rounded-card">
        <div className="flex items-start justify-between gap-3 border-b border-line-2 px-5 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-archivo font-extrabold text-[19px] leading-tight tracking-[-0.02em] text-ink">{ex.name}</h2>
            <span className="w-fit rounded-pill bg-brand/10 px-2.5 py-0.5 text-[12px] font-semibold text-brand">{ex.muscle}</span>
          </div>
          <button onClick={onClose} aria-label={tx("Fermer")} className="tap -mr-1 flex size-9 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {!a ? (
            <div className="flex aspect-[5/3] w-full items-center justify-center bg-surface-2 py-4 text-muted-2">
              <MuscleIllustration muscle={ex.muscle} className="h-full w-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5 bg-surface-2">
              {[a, b].map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={`${ex.name} ${i === 0 ? "départ" : "arrivée"}`} className="aspect-[3/2] w-full object-cover" />
              ))}
            </div>
          )}
          <div className="flex flex-col gap-5 px-5 py-5">
            <Section title={tx("Comment faire")}>
              <ol className="flex flex-col gap-2">
                {ex.guide.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-body">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[11px] font-bold text-brand">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Section>
            <Section title={tx("Conseils clés")}>
              <ul className="flex flex-col gap-1.5">
                {ex.guide.cues.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13.5px] leading-snug text-body"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />{c}</li>
                ))}
              </ul>
            </Section>
            <Section title={tx("Erreurs à éviter")}>
              <ul className="flex flex-col gap-1.5">
                {ex.guide.mistakes.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13.5px] leading-snug text-body">
                    <svg viewBox="0 0 24 24" width="15" height="15" className="mt-0.5 shrink-0 text-alert-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
                    {m}
                  </li>
                ))}
              </ul>
            </Section>
            <p className="border-t border-line-2 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
              {tx("Ressource My Fitness App · lecture seule")}</p>
          </div>
        </div>
      </div>
    </ModalLayer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{title}</div>
      {children}
    </div>
  );
}

export function ExerciseCatalog() {
  const tx = usePhrase();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<LibraryExercise | null>(null);

  const groups = useMemo(() => {
    const nq = normalizeExerciseName(q);
    const list = nq
      ? EXERCISE_LIBRARY.filter((e) => normalizeExerciseName(e.name).includes(nq) || e.aliases.some((a) => normalizeExerciseName(a).includes(nq)) || normalizeExerciseName(e.muscle).includes(nq))
      : EXERCISE_LIBRARY;
    const byMuscle = new Map<string, LibraryExercise[]>();
    for (const e of list) {
      const arr = byMuscle.get(e.muscle) ?? [];
      arr.push(e);
      byMuscle.set(e.muscle, arr);
    }
    return Array.from(byMuscle.entries());
  }, [q]);

  const total = EXERCISE_LIBRARY.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Bibliothèque par défaut")}</div>
          <p className="text-[13px] text-muted">{total} {tx("exercices illustrés, appliqués automatiquement à tes clients (lecture seule).")}</p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tx("Rechercher un exercice…")}
          className="h-10 w-full max-w-[260px] rounded-control border border-line-4 bg-surface px-3.5 text-[14px] text-ink outline-none focus:border-ink"
        />
      </div>

      {groups.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-4 bg-surface-2 px-5 py-6 text-center text-[13.5px] text-muted-2">
          {tx("Aucun exercice ne correspond à «")} {q} ».
        </p>
      ) : (
        groups.map(([muscle, items]) => (
          <div key={muscle} className="flex flex-col gap-2.5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{muscle}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((ex) => (
                <CatalogCard key={ex.key} ex={ex} onOpen={() => setOpen(ex)} />
              ))}
            </div>
          </div>
        ))
      )}

      {open ? <DetailModal ex={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
