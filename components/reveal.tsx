"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

// Révélation au scroll.
//
// Un seul IntersectionObserver par élément, débranché dès le premier passage :
// une landing en compte plusieurs dizaines, et un observateur qui continue de
// suivre un élément déjà révélé ne sert qu'à consommer du temps de calcul.
//
// Le rendu serveur produit l'élément AVEC la classe `.reveal`, donc masqué. Si
// JavaScript ne démarre pas, le contenu resterait invisible : `noscript` dans
// le layout ré-affiche tout (voir app/layout.tsx).

type Direction = "up" | "left" | "right" | "scale";

const DIRECTION_CLASS: Record<Direction, string> = {
  up: "",
  left: "reveal-left",
  right: "reveal-right",
  scale: "reveal-scale",
};

export function Reveal({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
  direction = "up",
  /** Marge du déclencheur : négative = l'élément doit entrer plus franchement. */
  margin = "0px 0px -12% 0px",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  delay?: number;
  direction?: Direction;
  margin?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    // Élément déjà visible au chargement (au-dessus de la ligne de flottaison) :
    // on ne veut pas d'un fondu qui démarre après coup, on affiche tout de suite.
    if (typeof IntersectionObserver === "undefined") {
      // Différé en microtâche : un setState synchrone dans le corps d'un effet
      // est refusé par le compilateur React, et on ne veut pas d'une page vide.
      queueMicrotask(() => setShown(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: margin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, shown]);

  return (
    <Tag
      ref={ref}
      style={delay ? ({ ["--d" as string]: `${delay}ms` } as React.CSSProperties) : undefined}
      className={["reveal", DIRECTION_CLASS[direction], shown ? "is-in" : "", className].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
}

/**
 * Même révélation, mais l'observateur est posé sur le CONTENEUR et les enfants
 * entrent en cascade. Un observateur au lieu de N, et une cascade qui reste
 * cohérente même si la grille se réordonne au responsive.
 */
export function RevealGroup({
  children,
  as: Tag = "div",
  className = "",
  step = 70,
  direction = "up",
  margin = "0px 0px -10% 0px",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Décalage entre deux enfants, en millisecondes. */
  step?: number;
  direction?: Direction;
  margin?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (typeof IntersectionObserver === "undefined") {
      // Différé en microtâche : un setState synchrone dans le corps d'un effet
      // est refusé par le compilateur React, et on ne veut pas d'une page vide.
      queueMicrotask(() => setShown(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: margin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin, shown]);

  // `--i` est posé par le CSS enfant via nth-child ? Non : on le passe ici,
  // parce qu'une grille peut contenir un nombre variable d'éléments et que
  // nth-child ne permet pas de multiplier proprement au-delà d'une poignée.
  const kids = Array.isArray(children) ? children : [children];

  return (
    <Tag ref={ref} className={["stagger", className].filter(Boolean).join(" ")} style={{ ["--step" as string]: `${step}ms` } as React.CSSProperties}>
      {kids.map((child, i) => (
        <div
          key={i}
          style={{ ["--i" as string]: i } as React.CSSProperties}
          className={["reveal", DIRECTION_CLASS[direction], shown ? "is-in" : ""].filter(Boolean).join(" ")}
        >
          {child}
        </div>
      ))}
    </Tag>
  );
}
