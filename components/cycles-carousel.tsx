"use client";

import { useRef, useState } from "react";

type Cycle = { label: string; name: string; weeks: string; body: string };

// Explications pédagogiques par cycle (le « pourquoi »), en plus du texte du plan.
const EXPL = [
  {
    why: "On pose les fondations. Objectif n°1 : une technique propre et l'habitude de venir. On (ré)apprend les mouvements avec des charges maîtrisées et on installe la régularité.",
    aims: ["Technique et amplitude", "Régularité", "Base cardio"],
    how: ["RPE 6–7", "Tempo maîtrisé", "Volume raisonnable"],
  },
  {
    why: "On monte d'un cran. Le corps encaisse davantage : on augmente le volume et les charges. C'est ici que les changements commencent à se voir vraiment.",
    aims: ["Plus de volume", "Densité accrue", "Progrès visibles"],
    how: ["RPE 7–8", "Séries en plus", "Surcharge progressive"],
  },
  {
    why: "Le pic. On concentre l'effort sur ton objectif pour aller chercher le résultat. La dernière semaine s'allège pour récupérer et laisser apparaître les progrès.",
    aims: ["Pic de forme", "Aller au résultat", "Récupérer en fin"],
    how: ["RPE 8–9 maîtrisé", "Focus points faibles", "Semaine de décharge"],
  },
];

// Cycle unique (offre 1 mois) : une explication autonome.
const EXPL_SINGLE = {
  why: "Un bloc complet de 4 semaines : on installe la technique et la régularité, on monte progressivement en intensité, et la dernière semaine s'allège pour récupérer et voir les progrès.",
  aims: ["Technique et régularité", "Progrès visibles", "Récupérer en fin"],
  how: ["RPE 6-8", "Surcharge progressive", "Semaine 4 allégée"],
};

// Pour un nombre de cycles variable : 1er = fondations, dernier = pic,
// intermédiaires = progression.
function explFor(i: number, total: number) {
  if (total === 1) return EXPL_SINGLE;
  if (i === 0) return EXPL[0];
  if (i === total - 1) return EXPL[2];
  return EXPL[1];
}

const DOT = ["bg-brand", "bg-ink", "bg-cardio"];

function Chips({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it}
            className="rounded-full border border-line-2 bg-surface-2 px-2.5 py-1 text-[12px] leading-none text-body"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CyclesCarousel({ cycles }: { cycles: Cycle[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }
  function go(i: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
          {cycles.length > 1 ? `Les ${cycles.length} cycles` : "Ton cycle"} · {active + 1}/{cycles.length}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 nav:hidden">glisse →</span>
      </div>

      <div
        ref={ref}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] nav:mx-0 nav:grid nav:grid-cols-3 nav:overflow-visible nav:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {cycles.map((c, i) => (
          <article
            key={i}
            className="flex w-[86%] shrink-0 snap-center flex-col gap-3 rounded-card border border-line bg-surface p-5 nav:w-auto"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2.5 rounded-full ${DOT[i % DOT.length]}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                {c.label} · {c.weeks}
              </span>
            </div>
            <h3 className="font-archivo font-bold text-[19px] leading-tight tracking-[-0.02em] text-ink">
              {c.name}
            </h3>

            <p className="text-[13.5px] leading-[1.6] text-muted">{explFor(i, cycles.length).why}</p>

            <div className="mt-auto flex flex-col gap-3 border-t border-line-2 pt-3">
              <Chips title="On vise" items={explFor(i, cycles.length).aims} />
              <Chips title="Comment" items={explFor(i, cycles.length).how} />
            </div>
          </article>
        ))}
      </div>

      {/* Points de navigation (mobile uniquement : en grille sur desktop) */}
      <div className="flex justify-center gap-2 nav:hidden">
        {cycles.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Aller au cycle ${i + 1}`}
            className={[
              "h-2 rounded-full transition-all",
              i === active ? "w-6 bg-brand" : "w-2 bg-line-4 hover:bg-muted-2",
            ].join(" ")}
          />
        ))}
      </div>
    </section>
  );
}
