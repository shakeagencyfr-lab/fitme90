"use client";

import { useEffect, useState } from "react";

// Invite à installer la PWA depuis le dashboard.
//  - Android / Chrome / Edge : vraie invite système via `beforeinstallprompt`
//    (bouton « Installer » qui déclenche la fenêtre native).
//  - iPhone / iPad (Safari) : aucune API d'installation n'existe, on affiche donc
//    la marche à suivre manuelle (Partager → « Sur l'écran d'accueil »).
//  - Déjà installée (mode standalone) : rien.
// Fermeture mémorisée (localStorage) pour ne pas harceler.

const DISMISS_KEY = "pwa-install-dismissed-v1";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

// `requireOnboarded` : côté client, on attend que le tutoriel d'accueil soit
// terminé pour ne pas superposer l'invite au tour guidé.
export function PwaInstall({ requireOnboarded = false }: { requireOnboarded?: boolean }) {
  // "hidden" | "android" (invite native dispo) | "ios" (instructions manuelles)
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || dismissed()) return;
    // Ne pas gêner le tutoriel d'accueil (client) : on attend qu'il soit fait.
    try {
      if (requireOnboarded && localStorage.getItem("fitme90_onboarded") !== "1") return;
    } catch {
      /* localStorage indisponible : on continue */
    }

    // Android / Chromium : on capture l'événement et on propose l'installation.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari : pas d'API, on montre les instructions après un court délai
    // (le temps de laisser respirer l'écran). Uniquement sur Safari iOS.
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /^((?!chrome|crios|fxios|android).)*safari/i.test(ua);
    let t: ReturnType<typeof setTimeout> | undefined;
    if (isIOS && isSafari) {
      t = setTimeout(() => {
        if (!isStandalone() && !dismissed()) setMode((m) => (m === "hidden" ? "ios" : m));
      }, 1500);
    }

    // Installée en cours de session : on retire l'invite.
    const onInstalled = () => {
      setMode("hidden");
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      if (t) clearTimeout(t);
    };
  }, [requireOnboarded]);

  function close() {
    setMode("hidden");
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* l'utilisateur a fermé la fenêtre native */
    }
    setDeferred(null);
    close();
  }

  if (mode === "hidden") return null;

  return (
    <>
      <button
        aria-label="Fermer"
        onClick={close}
        className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-label="Installer l'application"
        className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-[440px] flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-xl sm:inset-x-auto sm:right-6"
      >
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-[12px]" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-archivo font-extrabold text-[16px] leading-tight tracking-[-0.02em] text-ink">
              Installer l&apos;application
            </span>
            <span className="text-[13px] leading-snug text-muted">
              Accès direct depuis ton écran d&apos;accueil, en plein écran, avec les notifications.
            </span>
          </div>
          <button
            onClick={close}
            aria-label="Fermer"
            className="tap -mr-1 -mt-1 ml-auto flex size-8 shrink-0 items-center justify-center rounded-btn text-muted-2 hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {mode === "android" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={install}
              className="tap h-11 flex-1 rounded-btn bg-brand px-5 font-plex font-semibold text-[14px] text-white hover:bg-brand-hover"
            >
              Installer
            </button>
            <button
              onClick={close}
              className="tap h-11 rounded-btn border border-line-4 px-4 font-plex font-semibold text-[14px] text-body hover:border-ink"
            >
              Plus tard
            </button>
          </div>
        ) : (
          <ol className="flex flex-col gap-2 rounded-control border border-line-2 bg-surface-2 p-3.5 text-[13.5px] leading-snug text-body">
            <li className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[11px] font-bold text-brand">1</span>
              <span className="flex items-center gap-1.5">
                Touche
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="text-brand" aria-hidden>
                  <path d="M12 15V4m0 0 4 4m-4-4-4 4M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6" />
                </svg>
                Partager, en bas de Safari
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[11px] font-bold text-brand">2</span>
              <span>Choisis « Sur l&apos;écran d&apos;accueil »</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 font-mono text-[11px] font-bold text-brand">3</span>
              <span>Valide avec « Ajouter »</span>
            </li>
          </ol>
        )}
      </div>
    </>
  );
}
