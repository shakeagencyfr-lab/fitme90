"use client";

import { useRef, useState } from "react";

type Cycle = { label: string; name: string; weeks: string; body: string };

// Explications pédagogiques par cycle (le « pourquoi »), en plus du texte du plan.
const EXPL = [
  {
    why: "On pose les fondations. L'objectif n°1 : une technique propre et l'habitude de venir. On apprend (ou réapprend) les mouvements avec des charges maîtrisées, et on installe la régularité. C'est la base sur laquelle tout le reste se construit.",
    aims: ["Technique et amplitude", "Régularité, ne rater aucune séance", "Base cardio"],
    how: ["Charges modérées (RPE 6 à 7)", "Gestes contrôlés, tempo maîtrisé", "Volume raisonnable"],
  },
  {
    why: "On monte d'un cran. Le corps est prêt à encaisser davantage : on augmente le volume et les charges. C'est ici que les changements commencent à se voir vraiment.",
    aims: ["Plus de volume et d'intensité", "Densité de travail accrue", "Progrès visibles"],
    how: ["Charges plus lourdes (RPE 7 à 8)", "Séries et exercices en plus", "Surcharge progressive semaine après semaine"],
  },
  {
    why: "Le pic. On concentre l'effort sur ton objectif et on va chercher le résultat. La dernière semaine s'allège volontairement pour récupérer et laisser apparaître les progrès.",
    aims: ["Pic de forme vers ton objectif", "Aller chercher le résultat", "Récupérer en fin de cycle"],
    how: ["Intensité la plus haute, maîtrisée (RPE 8 à 9)", "Focus sur les points forts/faibles", "Semaine de décharge pour finir"],
  },
];

const DOT = ["bg-brand", "bg-ink", "bg-cardio"];

function List({ title, items, tone }: { title: string; items: string[]; tone: "brand" | "muted" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{title}</div>
      <ul className="flex flex-col gap-1">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2 text-[13.5px] leading-[1.5] text-body">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${tone === "brand" ? "bg-brand" : "bg-muted-2"}`} />
            {it}
          </li>
        ))}
      </ul>
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
          Les 3 cycles · {active + 1}/{cycles.length}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 sm:hidden">glisse →</span>
      </div>

      <div
        ref={ref}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] nav:mx-0 nav:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {cycles.map((c, i) => (
          <article
            key={i}
            className="flex w-[86%] shrink-0 snap-center flex-col gap-3 rounded-card border border-line bg-surface p-5 nav:w-[calc((100%-1.5rem)/3)]"
          >
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2.5 rounded-full ${DOT[i] ?? "bg-brand"}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                {c.label} · {c.weeks}
              </span>
            </div>
            <h3 className="font-archivo font-bold text-[19px] leading-tight tracking-[-0.02em] text-ink">
              {c.name}
            </h3>

            <div className="flex flex-col gap-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">Pourquoi ce cycle</div>
              <p className="text-[13.5px] leading-[1.6] text-muted">{EXPL[i]?.why}</p>
            </div>

            {c.body ? (
              <div className="flex flex-col gap-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">Le plan</div>
                <p className="text-[13.5px] leading-[1.6] text-body">{c.body}</p>
              </div>
            ) : null}

            <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line-2 pt-3">
              <List title="On vise" items={EXPL[i]?.aims ?? []} tone="brand" />
              <List title="Comment" items={EXPL[i]?.how ?? []} tone="muted" />
            </div>
          </article>
        ))}
      </div>

      {/* Points de navigation */}
      <div className="flex justify-center gap-2">
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
