"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const KEY = "fitme90_onboarded";

// Chaque étape ouvre la page correspondante (href) pendant l'explication.
const STEPS: { tag: string; title: string; body: string; href?: string }[] = [
  {
    tag: "Bienvenue",
    title: "Bienvenue dans ton espace 👋",
    body: "En 6 étapes rapides, on te montre où tout se trouve. Chaque page va s'ouvrir au fur et à mesure. Tu peux passer ce guide quand tu veux, et le revoir plus tard depuis ton profil.",
  },
  {
    tag: "Programme",
    title: "1. Ton programme",
    body: "C'est ta page d'accueil. Tout en haut, le résumé de ton plan. Juste en dessous, tes 3 cycles : fais-les glisser du doigt pour comprendre chaque phase (adaptation, intensification, spécialisation). Plus bas, tu peux changer tes jours d'entraînement quand ton emploi du temps évolue.",
    href: "/app",
  },
  {
    tag: "Agenda",
    title: "2. Ton agenda",
    body: "Un vrai calendrier avec de vraies dates. Les jours d'entraînement sont marqués d'un point, aujourd'hui est encadré, et un ✓ apparaît sur les séances que tu as validées. Touche n'importe quel jour pour ouvrir la séance de ce jour.",
    href: "/app/agenda",
  },
  {
    tag: "Séance",
    title: "3. Ta séance du jour",
    body: "Pour chaque exercice, tu notes tes charges et tes répétitions, série par série. Le minuteur de repos se déclenche tout seul entre les séries. Quand tu as terminé, tu valides la séance : elle passe en ✓ dans ton agenda.",
    href: "/app/seance",
  },
  {
    tag: "Nutrition",
    title: "4. Ta nutrition",
    body: "Tes repas du jour, tes macros (avec deux réglages : jour d'entraînement et jour de repos) et ta liste de courses, en respectant tes allergies et ton régime. Tu peux naviguer semaine par semaine et générer des recettes adaptées.",
    href: "/app/nutrition",
  },
  {
    tag: "Coach IA",
    title: "5. Ton coach, disponible 24h/24",
    body: "Le bouton Coach, en bas à droite, est là 24 heures sur 24, 7 jours sur 7, pendant tes 90 jours. Pose-lui tes questions, envoie une photo d'un repas ou d'une machine de la salle, ou demande une adaptation : il modifie ton programme et ta nutrition en direct.",
    href: "/app",
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Change d'étape ET ouvre la page correspondante pendant l'explication.
  function goTo(next: number) {
    setStep(next);
    const href = STEPS[next]?.href;
    if (href && href !== pathname) router.push(href);
  }

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep(0);
      }
    } catch {
      /* stockage indisponible : on n'affiche pas le tutoriel */
    }
    const open = () => setStep(0);
    window.addEventListener("fitme90:onboarding-restart", open);
    return () => window.removeEventListener("fitme90:onboarding-restart", open);
  }, []);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-4 backdrop-blur-[2px] animate-[fadein_0.2s_ease-out] nav:items-center">
      <div className="w-full max-w-[420px] overflow-hidden rounded-card-lg border border-line bg-surface animate-[popin_0.24s_ease-out] motion-reduce:animate-none">
        <div className="flex flex-col gap-3 p-6 pb-5">
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
          <button
            onClick={finish}
            className="tap text-[14px] font-medium text-muted-2 hover:text-ink"
          >
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
