"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

/**
 * L'écran d'attente de la génération du programme.
 *
 * POURQUOI CE N'EST PAS DÉCORATIF. La génération tourne en Opus et prend
 * couramment deux à quatre minutes. Pendant ce temps, la barre restait figée
 * à 92 % : le client croyait à un plantage et rechargeait la page, ce qui
 * était le pire moment pour le faire. Ici, la barre avance sans jamais
 * s'arrêter, l'attente est annoncée à l'avance, et il se passe quelque chose
 * à l'écran, dans sa langue.
 */

/**
 * Phrases de motivation. Elles vivent ici plutôt que dans les dictionnaires :
 * c'est une liste, et le typage des dictionnaires ne porte que des chaînes.
 * Ton coach de salle, pas ton application : on tutoie, on ne promet rien.
 */
const PHRASES: Record<Locale, string[]> = {
  fr: [
    "La séance que tu ne rates pas est celle qui compte.",
    "On construit un plan que tu peux tenir, pas un plan qui impressionne.",
    "La régularité bat l'intensité, tous les mois de l'année.",
    "Trois mois, c'est court dans une vie. C'est long dans un corps.",
    "Le premier objectif : y retourner la semaine prochaine.",
    "Une charge maîtrisée vaut mieux que deux charges soulevées n'importe comment.",
    "Ton meilleur exercice, c'est celui que tu fais correctement.",
    "Le repos fait partie du programme. Ce n'est pas une pause dans le programme.",
    "Tu ne t'entraînes pas pour être fatigué, tu t'entraînes pour progresser.",
    "Ce que tu manges après la séance travaille pendant que tu dors.",
    "Personne ne devient fort en un lundi. Tout le monde le devient en trois mois.",
    "Prépare ton sac ce soir. La moitié du travail est déjà faite.",
  ],
  en: [
    "The session you don't skip is the one that counts.",
    "We build a plan you can hold, not a plan that impresses.",
    "Consistency beats intensity, every month of the year.",
    "Three months is short in a life. It is long in a body.",
    "First goal: come back next week.",
    "One controlled rep beats two thrown around.",
    "Your best exercise is the one you do properly.",
    "Rest is part of the plan, not a break from it.",
    "You don't train to be tired, you train to progress.",
    "What you eat after the session works while you sleep.",
    "Nobody gets strong in one Monday. Everybody gets strong in three months.",
    "Pack your bag tonight. Half the work is already done.",
  ],
};

/** Un tracé de rythme cardiaque, en coordonnées d'un motif qui se répète. */
const ECG =
  "M0 40 H28 l6 -22 l7 44 l6 -30 l5 12 H70 l7 -34 l6 52 l6 -30 l5 8 H120 l8 -18 l6 36 l6 -26 l5 8 H180";

export function GenerationStage({ pct, elapsed }: { pct: number; elapsed: number }) {
  const locale = useLocale();
  const phrases = PHRASES[locale] ?? PHRASES.fr;
  const [i, setI] = useState(0);

  // Une phrase toutes les cinq secondes : le temps de la lire sans avoir
  // l'impression qu'un texte clignote pendant quatre minutes.
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % phrases.length), 5000);
    return () => clearInterval(id);
  }, [phrases.length]);

  // Deux pistes identiques côte à côte, chacune translatée de -100 % de sa
  // propre largeur : quand la première a fini de sortir, la seconde occupe
  // exactement sa place et la boucle ne se voit pas.
  const piste = (rang: number, cle: string) => (
    <div
      className={["auto-marquee flex shrink-0 items-center gap-10 whitespace-nowrap pr-10", rang ? "auto-marquee-rev" : ""].join(" ")}
      style={{ ["--marquee-dur" as string]: rang ? "64s" : "48s" }}
    >
      {phrases.map((p, k) => (
        <span
          key={`${cle}-${k}`}
          className="font-archivo text-[26px] font-extrabold uppercase leading-none tracking-[-0.02em] text-ink"
        >
          {p}
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative isolate overflow-hidden rounded-card border border-line bg-surface-2">
      <div className="relative flex flex-col gap-4 p-5">
        {/* Rythme cardiaque : le tracé se dessine en boucle, la pulsation suit
            la progression réelle (plus on avance, plus le cœur bat vite).
            Les phrases défilent DERRIÈRE ce tracé, et nulle part ailleurs :
            étalées sur toute la carte, elles passaient sous la phrase mise en
            avant et sous le compteur, qui devenaient pénibles à lire. Un fond
            ne doit pas concurrencer le texte qu'il accompagne. */}
        <div className="relative h-[86px] overflow-hidden rounded-control bg-surface/70">
          <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-1 opacity-[0.12]">
            {[0, 1].map((rang) => (
              <div key={rang} className="flex overflow-hidden">
                {piste(rang, `${rang}-a`)}
                {piste(rang, `${rang}-b`)}
              </div>
            ))}
          </div>
          <svg
            viewBox="0 0 180 80"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <path d={ECG} fill="none" stroke="currentColor" strokeWidth={1.4} className="text-line-3" />
            <path
              d={ECG}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="gen-ecg text-brand"
            />
          </svg>
          <span
            aria-hidden
            className="gen-pulse absolute left-1/2 top-1/2 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand"
            style={{ animationDuration: `${Math.max(0.6, 1.5 - pct / 140)}s` }}
          />
        </div>

        {/* La phrase mise en avant, remplacée toutes les cinq secondes. */}
        <p key={i} className="gen-phrase min-h-[44px] text-[15px] leading-[1.5] text-body">
          {phrases[i]}
        </p>

        <div className="flex items-center justify-between gap-3 border-t border-line-2 pt-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
            {formatElapsed(elapsed, locale)}
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-2">
            {locale === "en" ? "keep this page open" : "garde cette page ouverte"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** « 2 min 05 » / « 45 s » : un temps qui avance, preuve que rien n'est figé. */
function formatElapsed(sec: number, locale: Locale): string {
  const s = Math.max(0, Math.floor(sec));
  const prefixe = locale === "en" ? "elapsed" : "écoulé";
  if (s < 60) return `${s} s ${prefixe}`;
  const m = Math.floor(s / 60);
  return `${m} min ${String(s % 60).padStart(2, "0")} ${prefixe}`;
}
