"use client";

import { useRef, useState } from "react";
import { blockDef, blocksForMonths } from "@/lib/templates";
import { CYCLES_PER_BLOCK } from "@/lib/config";
import { useLocale } from "@/components/locale-provider";
import { pick, translate, type Locale, type LocalText } from "@/lib/i18n";

type Cycle = { label: string; name: string; weeks: string; body: string };

// Explications pédagogiques par cycle (le « pourquoi »), en plus du texte du plan.
interface Expl { why: string; aims: string[]; how: string[] }
const EXPL_FR: Expl[] = [
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
const EXPL_EN: Expl[] = [
  {
    why: "We lay the foundations. Goal number one: clean technique and the habit of showing up. We (re)learn the movements with controlled loads and build consistency.",
    aims: ["Technique and range", "Consistency", "Cardio base"],
    how: ["RPE 6–7", "Controlled tempo", "Reasonable volume"],
  },
  {
    why: "We step it up. The body can take more: we increase volume and loads. This is where the changes really start to show.",
    aims: ["More volume", "Higher density", "Visible progress"],
    how: ["RPE 7–8", "Extra sets", "Progressive overload"],
  },
  {
    why: "The peak. We focus the effort on your goal to go and get the result. The last week eases off to recover and let the progress show.",
    aims: ["Peak shape", "Go for the result", "Recover at the end"],
    how: ["RPE 8–9, controlled", "Focus on weak points", "Deload week"],
  },
];

// Cycle unique (offre 1 mois) : une explication autonome.
const EXPL_SINGLE_FR: Expl = {
  why: "Un bloc complet de 4 semaines : on installe la technique et la régularité, on monte progressivement en intensité, et la dernière semaine s'allège pour récupérer et voir les progrès.",
  aims: ["Technique et régularité", "Progrès visibles", "Récupérer en fin"],
  how: ["RPE 6-8", "Surcharge progressive", "Semaine 4 allégée"],
};
const EXPL_SINGLE_EN: Expl = {
  why: "A complete 4-week block: we build technique and consistency, ramp up intensity gradually, and the last week eases off to recover and see the progress.",
  aims: ["Technique and consistency", "Visible progress", "Recover at the end"],
  how: ["RPE 6-8", "Progressive overload", "Lighter week 4"],
};

// Pour un nombre de cycles variable : 1er = fondations, dernier = pic,
// intermédiaires = progression. Au-delà d'un bloc (produit 12 mois), le
// « pourquoi » vient de l'orientation du bloc (Fondations, Construction,
// Intensité, Réalisation) et la position dans le bloc donne le reste.
const EXPLS: LocalText<Expl[]> = { fr: EXPL_FR, en: EXPL_EN };
const EXPL_SINGLES: LocalText<Expl> = { fr: EXPL_SINGLE_FR, en: EXPL_SINGLE_EN };

function explFor(i: number, total: number, locale: Locale) {
  const EXPL = pick(EXPLS, locale);
  if (total === 1) return pick(EXPL_SINGLES, locale);
  if (total <= CYCLES_PER_BLOCK) {
    if (i === 0) return EXPL[0];
    if (i === total - 1) return EXPL[2];
    return EXPL[1];
  }
  const blockIndex = Math.floor(i / CYCLES_PER_BLOCK);
  const inBlock = i % CYCLES_PER_BLOCK;
  const totalBlocks = Math.max(2, blocksForMonths(total));
  const block = blockDef(blockIndex, totalBlocks);
  const base = inBlock === 0 ? EXPL[0] : inBlock === CYCLES_PER_BLOCK - 1 ? EXPL[2] : EXPL[1];
  return { ...base, why: `${block.name} : ${block.orientation}` };
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
  const locale = useLocale();
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
          {cycles.length > 1 ? translate(locale, "cycles.theN", { n: cycles.length }) : translate(locale, "cycles.yours")} · {active + 1}/{cycles.length}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2 nav:hidden">{translate(locale, "cycles.swipe")}</span>
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

            <p className="text-[13.5px] leading-[1.6] text-muted">{explFor(i, cycles.length, locale).why}</p>

            <div className="mt-auto flex flex-col gap-3 border-t border-line-2 pt-3">
              <Chips title={translate(locale, "cycles.aims")} items={explFor(i, cycles.length, locale).aims} />
              <Chips title={translate(locale, "cycles.how")} items={explFor(i, cycles.length, locale).how} />
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
            aria-label={translate(locale, "cycles.goTo", { n: i + 1 })}
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
