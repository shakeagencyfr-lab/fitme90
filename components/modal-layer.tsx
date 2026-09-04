"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { THEME_ROOT_ATTR } from "@/lib/theme";

/** Rien à écouter : la valeur ne change plus une fois le composant monté. */
const sabonner = () => () => {};

/**
 * Couche d'une fenêtre modale : voile, centrage, Échap, et surtout un point
 * d'ancrage qui garantit le centrage À L'ÉCRAN.
 *
 * POURQUOI UN PORTAIL.
 *
 * `position: fixed` se cale sur la fenêtre, sauf si un ancêtre porte une
 * transformation, un filtre ou un `contain` : cet ancêtre devient alors le
 * repère. Les pages du dashboard sont enveloppées dans une animation d'entrée
 * qui déplace le contenu de quelques pixels, et le repère devenait donc le
 * bloc de contenu, haut de plusieurs milliers de pixels. La modale
 * s'ouvrait au milieu de CE bloc : il fallait faire défiler la page pour la
 * trouver, alors que le voile, lui, était bien là.
 *
 * Déplacer la modale hors de ce sous-arbre règle le problème à la source,
 * plutôt que de traquer chaque ancêtre susceptible de créer un repère.
 *
 * OÙ EXACTEMENT.
 *
 * Pas dans `<body>` par défaut : le thème du coach est posé en style en ligne
 * sur un élément plus bas, et une modale sortie de cet élément perdrait ses
 * couleurs de marque. On vise donc la racine du thème quand il y en a une, ce
 * qui suffit à sortir de l'animation tout en gardant la marque. `<body>` ne
 * sert que de dernier recours.
 */
export function ModalLayer({
  onClose,
  label,
  closeLabel,
  children,
}: {
  onClose: () => void;
  /** Nom de la fenêtre, pour les lecteurs d'écran. */
  label: string;
  /** Libellé du voile cliquable, traduit par l'appelant. */
  closeLabel: string;
  children: ReactNode;
}) {
  // Rien au rendu serveur : un portail a besoin d'un DOM. Le drapeau vient de
  // `useSyncExternalStore` plutôt que d'un état posé dans un effet, pour que
  // React n'ait jamais à réconcilier deux rendus différents.
  const monte = useSyncExternalStore(sabonner, () => true, () => false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // La page ne défile plus derrière la modale : sans ça, la molette fait
    // glisser le fond et on perd le fil de ce qu'on regardait.
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = avant;
    };
  }, [onClose]);

  if (!monte) return null;
  const hote = document.querySelector<HTMLElement>(`[${THEME_ROOT_ATTR}]`) ?? document.body;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button aria-label={closeLabel} onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      {children}
    </div>,
    hote,
  );
}
