import type { ReactNode } from "react";

// Rail horizontal : une bande qui se fait glisser au doigt ou à la molette,
// au milieu d'une page qui, elle, défile verticalement.
//
// Pourquoi pas une grille : au-delà de cinq ou six cartes, une grille verticale
// oblige à scroller longtemps pour un contenu de survol. Le rail garde la
// section à hauteur d'écran et rend le parcours volontaire.
//
// Trois précautions :
// 1. `overscroll-behavior-x: contain` (dans .rail-x) empêche le geste de
//    déclencher le « retour arrière » du navigateur en bout de course.
// 2. La bande déborde en pleine largeur mais garde une gouttière alignée sur
//    le contenu, sinon la première carte semble coupée.
// 3. Un indice visuel dit qu'il reste quelque chose à droite, sinon personne
//    ne devine qu'on peut glisser.

export function Rail({
  children,
  hint,
  className = "",
  tone = "light",
}: {
  children: ReactNode;
  /** Texte de l'indice de défilement (déjà traduit). */
  hint?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const line = tone === "dark" ? "text-white/40" : "text-ink/40";
  return (
    <div className={className}>
      <div className="rail-x rail-fade gap-4 px-5 pb-4 sm:px-8 [scrollbar-width:none]">{children}</div>
      {hint ? (
        <div className={`mt-1 flex items-center gap-2 px-5 font-mono text-[11px] uppercase tracking-[0.14em] sm:px-8 ${line}`}>
          <span className="h-px w-8 bg-current opacity-40" aria-hidden />
          {hint}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14m0 0-5-5m5 5-5 5" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}

/** Bandeau défilant en continu (mots-clés). Décoratif : masqué aux lecteurs
 *  d'écran, et figé si le visiteur a demandé moins de mouvement. */
export function Marquee({ items, tone = "dark" }: { items: string[]; tone?: "light" | "dark" }) {
  const doubled = [...items, ...items];
  const color = tone === "dark" ? "text-white/45" : "text-ink/40";
  const dot = tone === "dark" ? "bg-brand" : "bg-brand";
  return (
    <div aria-hidden className="relative flex overflow-hidden py-3.5">
      <div className={`flex shrink-0 items-center gap-8 whitespace-nowrap pr-8 font-mono text-[12px] uppercase tracking-[0.2em] ${color} [animation:marquee_38s_linear_infinite] motion-reduce:[animation:none]`}>
        {doubled.map((t, i) => (
          <span key={`${t}-${i}`} className="inline-flex items-center gap-8">
            {t}
            <span className={`inline-block size-1.5 rounded-full ${dot}`} />
          </span>
        ))}
      </div>
      <div className={`flex shrink-0 items-center gap-8 whitespace-nowrap pr-8 font-mono text-[12px] uppercase tracking-[0.2em] ${color} [animation:marquee_38s_linear_infinite] motion-reduce:[animation:none]`}>
        {doubled.map((t, i) => (
          <span key={`b-${t}-${i}`} className="inline-flex items-center gap-8">
            {t}
            <span className={`inline-block size-1.5 rounded-full ${dot}`} />
          </span>
        ))}
      </div>
    </div>
  );
}
