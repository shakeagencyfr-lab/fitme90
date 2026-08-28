/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const KEY = "fitme90_onboarded";

type Rect = { top: number; left: number; width: number; height: number };

// Chaque étape ouvre la page (href) ET met en surbrillance l'élément (target).
// `scroll` : la cible est DANS la page (un champ, un bouton) et doit être
// amenée à l'écran avant d'être encadrée.
const STEPS: {
  tag: string;
  title: string;
  body: string;
  href?: string;
  target?: string;
  bullets?: string[];
  scroll?: boolean;
}[] = [
  {
    tag: "Bienvenue",
    title: "Bienvenue dans ton espace 👋",
    body: "En quelques étapes, on te montre où tout se trouve. Chaque page va s'ouvrir et l'onglet concerné sera mis en évidence. Tu peux passer ce guide quand tu veux, et le revoir depuis ton profil.",
  },
  {
    tag: "Programme",
    title: "1. Ton programme",
    body: "Ta page d'accueil. Tout en haut, le résumé de ton plan. Juste en dessous, tes 3 cycles à faire glisser du doigt pour comprendre chaque phase. Plus bas, tu peux changer tes jours d'entraînement.",
    href: "/app",
    target: "programme",
  },
  {
    tag: "Agenda",
    title: "2. Ton agenda",
    body: "Un vrai calendrier daté. Les jours d'entraînement sont marqués, aujourd'hui est encadré, un ✓ apparaît sur les séances validées. Touche un jour pour ouvrir la séance de ce jour.",
    href: "/app/agenda",
    target: "agenda",
  },
  {
    tag: "Séance",
    title: "3. Ta séance du jour",
    body: "C'est ici que tu suis ton entraînement, exercice par exercice. Je te montre maintenant, un par un, exactement où toucher pour remplir une série.",
    href: "/app/seance",
    target: "seance",
  },
  {
    tag: "Séance · 1 sur 4",
    title: "La charge, en kilos",
    body: "Pour chaque série, tape ici le poids soulevé, en kilos. Par exemple 40. Laisse vide au poids du corps (pompes, gainage).",
    href: "/app/seance",
    target: "charge",
    scroll: true,
  },
  {
    tag: "Séance · 2 sur 4",
    title: "Les répétitions",
    body: "Juste à côté, indique le nombre de répétitions réellement faites. Par exemple 10. C'est ce chiffre qui valide la série.",
    href: "/app/seance",
    target: "reps",
    scroll: true,
  },
  {
    tag: "Séance · 3 sur 4",
    title: "Le minuteur de repos",
    body: "Touche « Repos » après ta série : un minuteur de récupération se lance en bas de l'écran. Tu peux le mettre en pause, retirer 15 secondes ou l'arrêter.",
    href: "/app/seance",
    target: "repos",
    scroll: true,
  },
  {
    tag: "Séance · 4 sur 4",
    title: "Valider ta séance",
    body: "Quand tes séries sont remplies, touche ce bouton. Remplir tes charges à chaque fois permet au coach de te caler les bonnes charges ensuite. Tu peux refaire ou mettre à jour une séance quand tu veux.",
    href: "/app/seance",
    target: "valider",
    scroll: true,
  },
  {
    tag: "Nutrition",
    title: "4. Ta nutrition",
    body: "Tes repas du jour, tes macros (jour d'entraînement et jour de repos) et ta liste de courses, en respectant tes allergies et ton régime. Navigue semaine par semaine et génère des recettes.",
    href: "/app/nutrition",
    target: "nutrition",
  },
  {
    tag: "Coach IA",
    title: "5. Ton coach, disponible 24h/24",
    body: "Ce bouton, en bas à droite, est là 24 heures sur 24, 7 jours sur 7, pendant tes 90 jours. Ouvre-le pour discuter :",
    bullets: [
      "Pose tes questions, envoie une photo d'un repas ou d'une machine, ou dicte à la voix.",
      "Tu peux créer plusieurs conversations (icône ≡ en haut) et les retrouver quand tu veux.",
      "Sur ta séance, le bouton « Je n'ai pas mon matériel » lui demande une version adaptée (voyage, hôtel).",
    ],
    href: "/app",
    target: "coach",
  },
  {
    tag: "Régularité",
    title: "6. Reste sur la durée",
    body: "Tout est pensé pour t'aider à aller au bout des 90 jours :",
    bullets: [
      "Ton score de régularité et tes séances validées s'affichent sur l'accueil.",
      "Une séance oubliée apparaît « à rattraper » : tu peux la faire quand tu veux, ton programme ne se décale pas.",
      "Sur les cardios, un chrono se lance pour la durée prévue, avec un bip sur les dernières secondes.",
    ],
    href: "/app",
  },
  {
    tag: "Installe l'app",
    title: "7. Installe l'app et active les rappels",
    body: "Pour ne rien oublier, installe FitMe90 sur ton téléphone et active les notifications. C'est ce qui fait la différence sur la régularité.",
    bullets: [
      "Android / Chrome : menu ⋮ en haut à droite, puis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).",
      "iPhone / Safari : bouton Partager (le carré avec la flèche), puis « Sur l'écran d'accueil ». Ouvre ensuite l'app depuis son icône.",
      "Enfin, dans Profil → « Rappels de séance », touche « Activer » et autorise les notifications.",
    ],
    href: "/app/profil",
  },
];

function findTargetEl(target: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  return (
    els.find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// Amène une cible interne à la page dans la moitié basse de l'écran, pour que
// la carte d'explication se place au-dessus avec la flèche qui pointe dessus.
function scrollIntoLowerHalf(el: HTMLElement) {
  const vh = window.innerHeight;
  const delta = el.getBoundingClientRect().top - vh * 0.58;
  if (Math.abs(delta) > 6) window.scrollBy({ top: delta, behavior: "auto" });
}

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  function goTo(next: number) {
    setStep(next);
    const href = STEPS[next]?.href;
    if (href && href !== pathname) router.push(href);
  }

  // Ouverture (1er accès) + relance depuis le profil.
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setStep(0);
    } catch {
      /* stockage indisponible */
    }
    const open = () => setStep(0);
    window.addEventListener("fitme90:onboarding-restart", open);
    return () => window.removeEventListener("fitme90:onboarding-restart", open);
  }, []);

  // Mesure la position de la cible (et la recalcule au redimensionnement).
  useEffect(() => {
    if (step === null) return;
    const target = STEPS[step]?.target;
    const wantsScroll = !!STEPS[step]?.scroll;
    if (!target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = findTargetEl(target);
      if (el && wantsScroll) scrollIntoLowerHalf(el);
      setRect(el ? rectOf(el) : null);
    };
    measure();
    // Plusieurs passes : après navigation, rendu de la séance, puis stabilisation
    // du défilement (les champs de la séance peuvent être plus bas dans la page).
    const timers = [120, 400, 800, 1200].map((d) => setTimeout(measure, d));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step]);

  function finish() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setStep(null);
  }

  if (step === null) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const spotlight = !!(rect && s.target);
  const vh = typeof window !== "undefined" ? window.innerHeight : 0;
  const below = spotlight && rect ? rect.top > vh * 0.5 : false;

  return (
    <>
      {/* Capteur plein écran : bloque les interactions derrière. Assombri sauf en
          mode spotlight (l'assombrissement vient alors du box-shadow de l'anneau). */}
      <div className={`fixed inset-0 z-[60] ${spotlight ? "" : "bg-ink/45 backdrop-blur-[2px]"} animate-[fadein_0.2s_ease-out]`} />

      {/* Anneau de surbrillance autour de la cible */}
      {spotlight && rect ? (
        <div
          className="pointer-events-none fixed z-[61] rounded-[12px] transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            border: "2px solid var(--color-brand)",
            boxShadow: "0 0 0 9999px rgba(10,11,12,0.6)",
          }}
        />
      ) : null}

      {/* Flèche animée pointant la cible (par le haut) */}
      {spotlight && rect && below ? (
        <div
          className="pointer-events-none fixed z-[61] animate-bounce text-brand"
          style={{ top: rect.top - 32, left: rect.left + rect.width / 2 - 11 }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        </div>
      ) : null}

      {/* Carte d'explication : au-dessus de la cible si elle est en bas, sinon centrée */}
      <div
        className="pointer-events-none fixed inset-0 z-[62] flex justify-center px-4"
        style={below && rect ? { alignItems: "flex-end", paddingBottom: vh - rect.top + 18 } : { alignItems: "center" }}
      >
        <div className="pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-card-lg border border-line bg-surface animate-[popin_0.24s_ease-out] motion-reduce:animate-none">
          <div className="flex max-h-[70dvh] flex-col gap-3 overflow-y-auto p-6 pb-5">
            <div className="flex items-center justify-between">
              <span className="rounded-pill border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-brand">
                {s.tag}
              </span>
              <span className="font-mono text-[11px] text-muted-2">
                {step + 1}/{STEPS.length}
              </span>
            </div>
            <h2 className="font-archivo font-extrabold text-[22px] leading-tight tracking-[-0.02em] text-ink">
              {s.title}
            </h2>
            <p className="text-[15px] leading-[1.6] text-body">{s.body}</p>

            {s.bullets ? (
              <ol className="flex flex-col gap-2">
                {s.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5] text-body">
                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-[11px] font-bold text-brand">
                      {i + 1}
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            <div className="flex justify-center gap-1.5 pt-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={["h-1.5 rounded-full transition-all", i === step ? "w-5 bg-brand" : "w-1.5 bg-line-4"].join(" ")}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
            <button onClick={finish} className="tap text-[14px] font-medium text-muted-2 hover:text-ink">
              Passer
            </button>
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <button
                  onClick={() => goTo(step - 1)}
                  className="tap rounded-btn border border-line-4 bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-ink"
                >
                  Précédent
                </button>
              ) : null}
              <button
                onClick={() => (last ? finish() : goTo(step + 1))}
                className="tap rounded-btn bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]"
              >
                {last ? "C'est parti" : "Suivant"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Bouton pour revoir le tutoriel (depuis le profil).
export function RestartOnboarding({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(KEY);
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new Event("fitme90:onboarding-restart"));
      }}
      className={[
        "tap inline-flex items-center gap-2 rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] font-semibold text-body transition-colors hover:border-ink",
        className ?? "",
      ].join(" ")}
    >
      Revoir le tutoriel
    </button>
  );
}
