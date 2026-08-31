"use client";

import { useEffect, useRef, useState } from "react";
import { MuscleIllustration } from "@/components/muscle-illustration";

// Fiche exercice en modale : image(s) + groupe musculaire + étapes + conseils +
// erreurs. Les données viennent de /api/exercise/guide (coach > bibliothèque > IA).

interface Guide {
  name: string;
  muscle: string | null;
  frames: string[];
  steps: string[];
  cues: string[];
  mistakes: string[];
  note: string | null;
  source: "coach" | "library" | "ai" | "none";
}

const SOURCE_LABEL: Record<Guide["source"], string> = {
  coach: "Fiche de ton coach",
  library: "Bibliothèque My Fitness App",
  ai: "Fiche générée pour toi",
  none: "",
};

export function ExerciseModal({ name, onClose }: { name: string | null; onClose: () => void }) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(false);
  const [frame, setFrame] = useState(0);
  const reqId = useRef(0);

  // Chargement à l'ouverture (ou changement d'exercice). Tous les setState sont
  // dans la tâche asynchrone (jamais synchrones dans le corps de l'effet).
  useEffect(() => {
    if (!name) return;
    const id = ++reqId.current;
    (async () => {
      setGuide(null);
      setLoading(true);
      setFrame(0);
      try {
        const res = await fetch("/api/exercise/guide", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (id === reqId.current) setGuide(data.guide as Guide);
      } catch {
        if (id === reqId.current) setGuide(null);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    })();
  }, [name]);

  // Alternance des deux images (départ / arrivée) pour un effet de mouvement.
  const nFrames = guide?.frames.length ?? 0;
  useEffect(() => {
    if (nFrames < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % nFrames), 1100);
    return () => clearInterval(t);
  }, [nFrames]);

  // Fermeture à la touche Échap.
  useEffect(() => {
    if (!name) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [name, onClose]);

  if (!name) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-label={name}>
      <button aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[16px] border border-line bg-surface shadow-xl sm:rounded-card">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 border-b border-line-2 px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-archivo font-extrabold text-[19px] leading-tight tracking-[-0.02em] text-ink">
              {guide?.name || name}
            </h2>
            {guide?.muscle ? (
              <span className="w-fit rounded-pill bg-brand/10 px-2.5 py-0.5 text-[12px] font-semibold text-brand">
                {guide.muscle}
              </span>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="tap -mr-1 flex size-9 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Visuel */}
          {nFrames > 0 ? (
            <div className="relative aspect-[3/2] w-full bg-surface-2">
              {guide!.frames.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={guide!.name}
                  className="absolute inset-0 h-full w-full object-contain transition-opacity duration-500"
                  style={{ opacity: nFrames < 2 || i === frame ? 1 : 0 }}
                />
              ))}
            </div>
          ) : (
            // Pas de photo (fiche IA) : illustration du groupe musculaire ciblé.
            <div className="flex aspect-[3/2] w-full items-center justify-center bg-surface-2 py-4 text-muted-2">
              <MuscleIllustration muscle={guide?.muscle ?? name} className="h-full w-auto" />
            </div>
          )}

          <div className="flex flex-col gap-5 px-5 py-5">
            {loading ? (
              <p className="text-[14px] text-muted-2">Chargement de la fiche…</p>
            ) : (
              <>
                {/* Consignes libres du coach */}
                {guide?.note ? (
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-body">{guide.note}</p>
                ) : null}

                {guide && guide.steps.length > 0 ? (
                  <Section title="Comment faire">
                    <ol className="flex flex-col gap-2">
                      {guide.steps.map((s, i) => (
                        <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-body">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[11px] font-bold text-brand">
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </Section>
                ) : null}

                {guide && guide.cues.length > 0 ? (
                  <Section title="Conseils clés">
                    <ul className="flex flex-col gap-1.5">
                      {guide.cues.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13.5px] leading-snug text-body">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {guide && guide.mistakes.length > 0 ? (
                  <Section title="Erreurs à éviter">
                    <ul className="flex flex-col gap-1.5">
                      {guide.mistakes.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13.5px] leading-snug text-body">
                          <svg viewBox="0 0 24 24" width="15" height="15" className="mt-0.5 shrink-0 text-alert-ink" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {guide && guide.source === "none" ? (
                  <p className="text-[13.5px] leading-relaxed text-muted">
                    Fiche détaillée bientôt disponible pour cet exercice. Demande à ton coach en cas de doute sur l&apos;exécution.
                  </p>
                ) : null}

                {guide && SOURCE_LABEL[guide.source] ? (
                  <p className="border-t border-line-2 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                    {SOURCE_LABEL[guide.source]}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
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
