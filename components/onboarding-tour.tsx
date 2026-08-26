"use client";

import { useEffect, useState } from "react";

const KEY = "fitme90_onboarded";

const STEPS = [
  {
    tag: "Bienvenue",
    title: "Bienvenue dans ton espace 👋",
    body: "Voici l'essentiel en quelques étapes. Tu peux passer ce guide à tout moment et le revoir depuis ton profil.",
  },
  {
    tag: "Programme",
    title: "Ton programme",
    body: "Dans l'onglet Programme, retrouve tes 3 cycles (fais-les défiler) et ta semaine type. Tu peux aussi y changer tes jours d'entraînement.",
  },
  {
    tag: "Agenda",
    title: "Ton agenda",
    body: "Dans Agenda, un vrai calendrier daté. Touche un jour pour voir la séance prévue et suivre ta progression.",
  },
  {
    tag: "Séance",
    title: "Ta séance du jour",
    body: "Dans Séance, lance ton entraînement : minuteur de repos intégré, charges au ressenti et validation série par série.",
  },
  {
    tag: "Nutrition",
    title: "Ta nutrition",
    body: "Dans Nutrition, tes repas, tes macros et ta liste de courses, calés sur tes contraintes (allergies, régime, budget).",
  },
  {
    tag: "Coach IA",
    title: "Ton coach, en bas à droite",
    body: "Le bouton Coach t'accompagne 24/7 : pose tes questions, envoie une photo de ton repas ou d'une machine, il adapte même ton programme. Actif pendant tes 90 jours.",
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);

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
                onClick={() => setStep((v) => (v ?? 0) - 1)}
                className="tap rounded-btn border border-line-4 bg-surface px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-ink"
              >
                Précédent
              </button>
            ) : null}
            <button
              onClick={() => (last ? finish() : setStep((v) => (v ?? 0) + 1))}
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
