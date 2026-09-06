"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/components/locale-provider";
import { saveSession, type SetEntry } from "@/app/app/seance/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { ExerciseModal } from "@/components/exercise-modal";
import { MuscleIllustration } from "@/components/muscle-illustration";
import { EXERCISE_LIBRARY, matchLibraryExercise, framesOf } from "@/lib/exercise-library";
import { formatRest } from "@/lib/fitness";
import {
  circuitSeconds,
  formatMinutes,
  sensationScale,
  timeline,
  timelineSeconds,
  type CircuitBlock,
  type Step,
} from "@/lib/circuit";

// Chrono de circuit : plein écran, enchaîne les blocs sans que la personne
// touche l'écran.
//
// Le temps ne se compte pas en décrémentant un compteur chaque seconde (les
// navigateurs mobiles ralentissent les minuteurs dès que l'écran s'assombrit,
// et une séance de 30 minutes dérivait). Chaque étape a une ÉCHÉANCE en temps
// réel ; à chaque tic, on lit ce qui reste. Si l'onglet a dormi, les étapes
// passées sont rattrapées d'un coup au réveil, sans sonner dix fois.
//
// Deux signaux, indépendants, réglables et mémorisés : des bips (Web Audio,
// donc sans fichier à charger) et une voix (synthèse du système, qui dit le
// nom de l'exercice suivant). L'un, l'autre, les deux, ou rien.

export interface Props {
  day: number;
  blocks: CircuitBlock[];
  /** Cible du cycle (1 à 4), affichée quand un bloc n'a pas la sienne. */
  targetSensation: number;
  canLog: boolean;
  alreadyDone: boolean;
  /** Sensations déjà enregistrées, par titre de bloc. */
  initialSensations?: Record<string, number>;
  /** "session" : la séance entière ; "finisher" : un bloc après les séries, sans validation propre. */
  mode?: "session" | "finisher";
}

type Sounds = { beeps: boolean; voice: boolean };
const SOUNDS_KEY = "fitme90:circuit:sons";

function loadSounds(): Sounds {
  try {
    const raw = localStorage.getItem(SOUNDS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Sounds>;
      return { beeps: s.beeps !== false, voice: s.voice !== false };
    }
  } catch {
    /* stockage indisponible */
  }
  return { beeps: true, voice: true };
}
function saveSounds(s: Sounds) {
  try {
    localStorage.setItem(SOUNDS_KEY, JSON.stringify(s));
  } catch {
    /* stockage indisponible */
  }
}

/** La fiche d'un exercice de bloc : par sa clé d'abord, sinon par son nom. */
function libEntry(name: string, key?: string) {
  return (key ? EXERCISE_LIBRARY.find((e) => e.key === key) : undefined) ?? matchLibraryExercise(name);
}

function Thumb({ name, exKey, onOpen, size = "size-12" }: { name: string; exKey?: string; onOpen: () => void; size?: string }) {
  const lib = libEntry(name, exKey);
  if (!lib) return <span className={`${size} shrink-0 rounded-control bg-surface-2`} />;
  const src = framesOf(lib)[0] ?? null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={name}
      className={`tap relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-control border border-line-3 bg-surface-2 text-muted-2`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <MuscleIllustration muscle={lib.muscle} className="h-[80%] w-auto" />
      )}
    </button>
  );
}

/** Icône haut-parleur / voix, pour les deux réglages de son. */
function SoundToggle({ on, label, onClick, disabled }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={[
        "tap inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-40",
        on ? "border-brand bg-brand/10 text-brand" : "border-line-4 bg-surface text-muted",
      ].join(" ")}
    >
      <span className={["inline-block size-2 rounded-full", on ? "bg-brand" : "bg-line-4"].join(" ")} aria-hidden />
      {label}
    </button>
  );
}

export function CircuitRunner({
  day,
  blocks,
  targetSensation,
  canLog,
  alreadyDone,
  initialSensations = {},
  mode = "session",
}: Props) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const scale = sensationScale(locale);

  const steps = useMemo(() => timeline(blocks), [blocks]);
  const totalSec = useMemo(() => timelineSeconds(steps), [steps]);

  // ───────────────────────────────────────────── état de l'écran
  const [screen, setScreen] = useState<"overview" | "running" | "done">("overview");
  // Réglages lus à la création, comme le brouillon de la séance en séries :
  // ils ne servent qu'au client, le rendu serveur prend les défauts.
  const [sounds, setSounds] = useState<Sounds>(() => (typeof window !== "undefined" ? loadSounds() : { beeps: true, voice: true }));
  const [voiceOk] = useState(() => typeof window === "undefined" || "speechSynthesis" in window);
  const soundsRef = useRef(sounds);
  useEffect(() => {
    soundsRef.current = sounds;
  }, [sounds]);
  const toggleSound = (k: keyof Sounds) =>
    setSounds((s) => {
      const n = { ...s, [k]: !s[k] };
      saveSounds(n);
      return n;
    });

  // ───────────────────────────────────────────── chrono
  const [stepIdx, setStepIdx] = useState(0);
  const [remaining, setRemaining] = useState(0); // secondes affichées
  const [paused, setPaused] = useState(false);
  const deadlineRef = useRef(0); // performance.now() de fin d'étape
  const pausedLeftRef = useRef(0); // ms restantes quand on met en pause
  const stepRef = useRef(0);
  const lastBeepSecRef = useRef(-1);
  const audioRef = useRef<AudioContext | null>(null);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  const beep = useCallback((freq: number, ms: number, gain = 0.35) => {
    if (!soundsRef.current.beeps) return;
    try {
      const ctx = audioRef.current;
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const at = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + ms / 1000);
      o.start(at);
      o.stop(at + ms / 1000);
    } catch {
      /* audio indisponible */
    }
  }, []);

  const say = useCallback(
    (text: string) => {
      if (!soundsRef.current.voice || !text) return;
      try {
        const synth = window.speechSynthesis;
        if (!synth) return;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = locale === "en" ? "en-US" : "fr-FR";
        u.rate = 1.02;
        synth.speak(u);
      } catch {
        /* voix indisponible */
      }
    },
    [locale],
  );

  const vibrate = (pattern: number | number[]) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* ignore */
    }
  };

  const exName = useCallback(
    (b: number, e: number): string => (b >= 0 && e >= 0 ? blocks[b]?.exercises[e]?.name ?? "" : ""),
    [blocks],
  );

  /** Ce que le signal dit à l'entrée d'une étape. */
  const announce = useCallback(
    (s: Step, silent: boolean) => {
      if (silent) return;
      switch (s.kind) {
        case "prepare":
          beep(660, 120);
          say(t("circuit.voicePrepare", { name: exName(s.nextBlock, s.nextExercise) }));
          break;
        case "work": {
          beep(1320, 350, 0.45);
          vibrate([120, 60, 120]);
          const dernier = s.nextBlock < 0;
          say(`${t("circuit.voiceWork", { name: exName(s.block, s.exercise) })}${dernier ? `. ${t("circuit.voiceLast")}` : ""}`);
          break;
        }
        case "rest":
          beep(520, 250);
          vibrate(150);
          say(t("circuit.voiceRest", { name: exName(s.nextBlock, s.nextExercise) }));
          break;
        case "roundRest":
          beep(520, 250);
          vibrate(150);
          say(t("circuit.voiceRestRound", { name: exName(s.nextBlock, s.nextExercise) }));
          break;
        case "blockRest":
          beep(440, 300);
          vibrate([150, 80, 150]);
          say(t("circuit.voiceRestBlock", { name: exName(s.nextBlock, s.nextExercise) }));
          break;
        case "done":
          beep(1320, 200);
          setTimeout(() => beep(1760, 500, 0.45), 220);
          vibrate([200, 100, 200, 100, 400]);
          say(t("circuit.voiceDone"));
          break;
      }
    },
    [beep, say, t, exName],
  );

  const enterStep = useCallback(
    (idx: number, silent = false) => {
      const s = steps[idx];
      if (!s) return;
      stepRef.current = idx;
      setStepIdx(idx);
      lastBeepSecRef.current = -1;
      if (s.kind === "done") {
        setRemaining(0);
        announce(s, silent);
        setScreen("done");
        // Le bilan s'affiche en tête de page, puis les blocs à noter, puis
        // la validation : on remonte pour que l'ordre de lecture soit le bon.
        setTimeout(() => {
          try {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch {
            /* ignore */
          }
        }, 50);
        return;
      }
      deadlineRef.current = performance.now() + s.seconds * 1000;
      setRemaining(s.seconds);
      announce(s, silent);
    },
    [steps, announce],
  );

  // Tic : lit le temps restant, sonne le décompte, passe à l'étape suivante.
  useEffect(() => {
    if (screen !== "running" || paused) return;
    const id = setInterval(() => {
      const now = performance.now();
      let idx = stepRef.current;
      let left = deadlineRef.current - now;
      // Onglet endormi : on rattrape les étapes passées sans les sonner.
      let sauts = 0;
      while (left <= 0 && steps[idx] && steps[idx].kind !== "done") {
        idx += 1;
        sauts += 1;
        if (!steps[idx] || steps[idx].kind === "done") break;
        // La nouvelle échéance part de l'ancienne, pas de « maintenant » :
        // le déroulé reste fidèle même après un réveil tardif.
        deadlineRef.current += steps[idx].seconds * 1000;
        left = deadlineRef.current - now;
      }
      if (sauts > 0) {
        if (steps[idx]?.kind === "done") {
          enterStep(idx);
          return;
        }
        // Une seule étape franchie à l'heure : c'est le cours normal, on
        // l'annonce. Plusieurs : on était endormi, on annonce juste la courante.
        stepRef.current = idx;
        setStepIdx(idx);
        lastBeepSecRef.current = -1;
        announce(steps[idx], false);
      }
      const sec = Math.max(0, Math.ceil(left / 1000));
      setRemaining(sec);
      // Décompte 3, 2, 1 avant chaque changement (une fois par seconde).
      if (sec > 0 && sec <= 3 && lastBeepSecRef.current !== sec) {
        lastBeepSecRef.current = sec;
        beep(880, 110, 0.3);
      }
    }, 200);
    return () => clearInterval(id);
  }, [screen, paused, steps, beep, announce, enterStep]);

  // Écran allumé pendant le circuit (Wake Lock), repris si l'onglet revient.
  useEffect(() => {
    if (screen !== "running") return;
    let actif = true;
    const demander = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        if (!nav.wakeLock) return;
        const lock = await nav.wakeLock.request("screen");
        if (actif) wakeRef.current = lock;
        else await lock.release();
      } catch {
        /* refusé ou indisponible */
      }
    };
    void demander();
    const onVisible = () => {
      if (document.visibilityState === "visible") void demander();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      actif = false;
      document.removeEventListener("visibilitychange", onVisible);
      void wakeRef.current?.release().catch(() => {});
      wakeRef.current = null;
    };
  }, [screen]);

  function unlockAudio() {
    // L'AudioContext et la voix ne démarrent que sur un geste : le départ.
    try {
      if (!audioRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioRef.current = new Ctor();
      }
      void audioRef.current?.resume?.();
    } catch {
      /* audio indisponible */
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }

  function start(fromBlock = 0) {
    unlockAudio();
    setPaused(false);
    setSensations(initialSensations);
    setSaved(false);
    // On saute la préparation quand on démarre au milieu : le premier
    // effort du bloc choisi sert d'entrée.
    const idx = fromBlock <= 0 ? 0 : Math.max(0, steps.findIndex((s) => s.kind === "work" && s.block === fromBlock));
    setScreen("running");
    enterStep(idx);
  }

  function togglePause() {
    if (paused) {
      deadlineRef.current = performance.now() + pausedLeftRef.current;
      setPaused(false);
      unlockAudio();
    } else {
      pausedLeftRef.current = Math.max(0, deadlineRef.current - performance.now());
      setPaused(true);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    }
  }

  function skip() {
    const next = Math.min(steps.length - 1, stepRef.current + 1);
    if (paused) {
      // On reste en pause sur la nouvelle étape, avec toute sa durée devant.
      pausedLeftRef.current = (steps[next]?.seconds ?? 0) * 1000;
      stepRef.current = next;
      setStepIdx(next);
      setRemaining(steps[next]?.seconds ?? 0);
      if (steps[next]?.kind === "done") enterStep(next, true);
      return;
    }
    enterStep(next);
  }

  function quit() {
    setPaused(false);
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    setScreen("overview");
  }

  // ───────────────────────────────────────────── fin et validation
  const [sensations, setSensations] = useState<Record<string, number>>(initialSensations);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(alreadyDone);
  const [error, setError] = useState("");
  const [guideName, setGuideName] = useState<string | null>(null);

  const blockKey = (b: CircuitBlock, i: number) => b.title || `Bloc ${i + 1}`;

  async function validate() {
    setSaving(true);
    setError("");
    const entries: SetEntry[] = blocks.map((b, i) => ({
      exercise: blockKey(b, i),
      set: b.rounds,
      kg: null,
      reps: null,
      circuit: true,
      sensation: sensations[blockKey(b, i)] ?? undefined,
    }));
    const res = await saveSession({ day, entries });
    setSaving(false);
    if (res.error) return setError(res.error);
    setSaved(true);
    router.refresh();
  }

  // ───────────────────────────────────────────── rendu
  const step = steps[stepIdx];
  const cur = step && step.block >= 0 ? blocks[step.block] : null;
  const elapsedBefore = useMemo(() => steps.slice(0, stepIdx).reduce((a, s) => a + s.seconds, 0), [steps, stepIdx]);
  const progress = totalSec ? Math.min(1, (elapsedBefore + (step ? step.seconds - remaining : 0)) / totalSec) : 0;
  const ringPct = step && step.seconds ? remaining / step.seconds : 0;

  const phaseLabel = (s: Step | undefined): string => {
    switch (s?.kind) {
      case "prepare":
        return t("circuit.prepare");
      case "work":
        return t("circuit.goWork");
      case "rest":
        return t("circuit.goRest");
      case "roundRest":
        return t("circuit.restRound");
      case "blockRest":
        return t("circuit.restBlock");
      default:
        return "";
    }
  };
  const isWork = step?.kind === "work";
  const bigName = step
    ? step.kind === "work"
      ? exName(step.block, step.exercise)
      : exName(step.nextBlock, step.nextExercise)
    : "";
  const nextName = step && step.kind === "work" ? exName(step.nextBlock, step.nextExercise) : "";
  const nextIsNewBlock = step?.kind === "work" && step.nextBlock >= 0 && step.nextBlock !== step.block;
  const bigEntry = step ? (step.kind === "work" ? blocks[step.block]?.exercises[step.exercise] : blocks[step.nextBlock]?.exercises[step.nextExercise]) : undefined;
  const bigLib = bigEntry ? libEntry(bigEntry.name, bigEntry.key) : null;
  const bigSrc = bigLib ? framesOf(bigLib)[0] ?? null : null;

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col gap-4">
      {/* ─────────────────────────── aperçu des blocs */}
      {screen !== "running" ? (
        <>
          {screen === "done" ? (
            <div className="flex flex-col gap-1 rounded-card border border-brand/40 bg-alert p-4">
              <h3 className="font-archivo font-extrabold text-[20px] text-ink">{t("circuit.done")}</h3>
              <p className="text-[13.5px] leading-[1.55] text-alert-ink">{t("circuit.doneBody")}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MonoLabel>
                {t("circuit.blocks", { n: blocks.length })} · {t("circuit.total", { duration: formatMinutes(circuitSeconds(blocks)) })}
              </MonoLabel>
              <span className="text-[12.5px] text-muted">
                {t("circuit.target")} : <span className="font-semibold text-brand">{scale.steps.find((s) => s.id === targetSensation)?.label ?? targetSensation}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SoundToggle on={sounds.beeps} label={t("circuit.beeps")} onClick={() => toggleSound("beeps")} />
              <SoundToggle on={sounds.voice && voiceOk} label={t("circuit.voice")} onClick={() => toggleSound("voice")} disabled={!voiceOk} />
              <span className="text-[12px] text-muted-2">{voiceOk ? t("circuit.soundHint") : t("circuit.voiceUnavailable")}</span>
            </div>
            <Button onClick={() => start(0)} full className="h-[54px] text-[16px]">
              {mode === "finisher" ? t("circuit.startFinisher") : t("circuit.start")}
            </Button>
          </div>

          {blocks.map((b, bi) => {
            const target = b.sensation ?? targetSensation;
            const label = scale.steps.find((s) => s.id === target)?.label ?? String(target);
            return (
              <div key={bi} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-archivo font-bold text-[16px] text-ink">{b.title || `Bloc ${bi + 1}`}</h3>
                    <div className="mt-0.5 font-mono text-[11px] text-brand">
                      {t("circuit.rounds", { n: b.rounds })} · {b.work} s {t("circuit.work")} / {b.rest} s {t("circuit.rest")}
                      {b.roundRest ? ` · ${formatRest(b.roundRest)} ${t("circuit.roundRest")}` : ""}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted">
                      {t("circuit.target")} : <span className="font-semibold text-body">{label}</span> ({target}/4)
                    </div>
                  </div>
                  {bi > 0 && blocks.length > 1 ? (
                    <button type="button" onClick={() => start(bi)} className="tap shrink-0 rounded-pill border border-line-4 px-3 py-1.5 text-[12px] font-semibold text-body hover:border-ink">
                      {t("circuit.startHere")}
                    </button>
                  ) : null}
                </div>
                <ol className="flex flex-col gap-2">
                  {b.exercises.map((e, ei) => (
                    <li key={ei} className="flex items-center gap-3 rounded-control bg-surface-2 px-2.5 py-2">
                      <span className="w-4 shrink-0 text-center font-mono text-[11px] text-muted-2">{ei + 1}</span>
                      <Thumb name={e.name} exKey={e.key} onOpen={() => setGuideName(e.name)} />
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => setGuideName(e.name)} className="text-left font-archivo font-semibold text-[15px] leading-snug text-ink hover:text-brand hover:underline">
                          {e.name}
                        </button>
                        {e.note ? <div className="text-[12.5px] leading-[1.45] text-muted">{e.note}</div> : null}
                      </div>
                      <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">{b.work} s</span>
                    </li>
                  ))}
                </ol>
                {mode === "session" && canLog && (screen === "done" || saved) ? (
                  <div className="flex flex-col gap-1.5 border-t border-line pt-3">
                    <span className="text-[12.5px] font-semibold text-body">{t("circuit.howWasBlock")}</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {scale.steps.map((s) => {
                        const on = sensations[blockKey(b, bi)] === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSaved(false);
                              setSensations((m) => ({ ...m, [blockKey(b, bi)]: s.id }));
                            }}
                            className={[
                              "tap flex flex-col items-center rounded-control border px-1 py-2 text-center transition-colors",
                              on ? "border-brand bg-brand/10 text-brand" : "border-line-4 bg-surface text-muted hover:border-ink",
                            ].join(" ")}
                          >
                            <span className="font-archivo font-extrabold text-[15px]">{s.id}</span>
                            <span className="text-[10.5px] leading-tight">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {mode === "session" ? (
            canLog ? (
              screen === "done" || saved ? (
                <div className="flex flex-col gap-3 rounded-card border border-brand/40 bg-surface p-4">
                  {error ? <Alert>{error}</Alert> : null}
                  {saved ? <Alert tone="info">{t("circuit.saved")}</Alert> : null}
                  <Button onClick={validate} loading={saving} full className="h-[52px]">
                    {saved ? t("circuit.update") : t("circuit.validate")}
                  </Button>
                  <button type="button" onClick={() => start(0)} className="tap text-[13px] font-semibold text-brand hover:underline">
                    {t("circuit.redo")}
                  </button>
                </div>
              ) : null
            ) : (
              <Alert tone="info">{t("circuit.readOnly")}</Alert>
            )
          ) : null}
        </>
      ) : null}

      {/* ─────────────────────────── chrono plein écran */}
      {screen === "running" && step ? (
        <div
          className={[
            "fixed inset-0 z-[80] flex flex-col text-white transition-colors duration-500",
            isWork ? "bg-[#17191b]" : step.kind === "prepare" ? "bg-[#1f2a3a]" : "bg-[#243b2e]",
          ].join(" ")}
          role="dialog"
          aria-label={phaseLabel(step)}
        >
          {/* barre de progression de la séance */}
          <div className="h-1.5 w-full bg-white/10">
            <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pt-[calc(10px+env(safe-area-inset-top))]">
            <div className="min-w-0">
              <div className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
                {cur ? cur.title || `Bloc ${step.block + 1}` : ""}
                {cur && step.kind !== "blockRest" ? ` · ${t("circuit.round", { r: step.round, n: cur.rounds })}` : ""}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => toggleSound("beeps")} aria-pressed={sounds.beeps} className={["tap rounded-pill px-2.5 py-1 text-[11px] font-semibold", sounds.beeps ? "bg-brand text-white" : "bg-white/10 text-white/60"].join(" ")}>
                {t("circuit.beeps")}
              </button>
              <button type="button" onClick={() => toggleSound("voice")} disabled={!voiceOk} aria-pressed={sounds.voice} className={["tap rounded-pill px-2.5 py-1 text-[11px] font-semibold disabled:opacity-40", sounds.voice && voiceOk ? "bg-brand text-white" : "bg-white/10 text-white/60"].join(" ")}>
                {t("circuit.voice")}
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className={["font-mono text-[13px] uppercase tracking-[0.18em]", isWork ? "text-brand" : "text-white/70"].join(" ")}>
              {phaseLabel(step)}
            </div>

            <div className="relative flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="size-[min(62vw,300px)] -rotate-90" aria-hidden>
                <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={isWork ? "var(--color-brand)" : "rgba(255,255,255,0.85)"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - ringPct)}
                  style={{ transition: "stroke-dashoffset 200ms linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-archivo font-extrabold text-[clamp(56px,18vw,96px)] leading-none tabular-nums tracking-[-0.04em]">
                  {remaining}
                </span>
                <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">s</span>
              </div>
            </div>

            <div className="flex w-full max-w-[420px] flex-col items-center gap-2">
              {!isWork ? <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/60">{step.nextBlock >= 0 && step.nextBlock !== step.block ? t("circuit.nextBlock") : t("circuit.next")}</span> : null}
              <div className="flex items-center gap-3">
                {bigSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={bigSrc} alt="" className="size-16 shrink-0 rounded-control object-cover ring-1 ring-white/15" />
                ) : null}
                <h2 className="font-archivo font-extrabold text-[clamp(22px,6vw,32px)] leading-[1.08] tracking-[-0.02em]" style={{ textWrap: "balance" }}>
                  {bigName}
                </h2>
              </div>
              {isWork && bigEntry?.note ? <p className="text-[14px] leading-[1.5] text-white/70">{bigEntry.note}</p> : null}
              {isWork && nextName ? (
                <p className="mt-1 text-[13px] text-white/55">
                  {nextIsNewBlock ? t("circuit.nextBlock") : t("circuit.next")} : <span className="font-semibold text-white/80">{nextName}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-2">
            <button type="button" onClick={quit} className="tap rounded-pill bg-white/10 px-4 py-3 text-[14px] font-semibold text-white/80">
              {t("circuit.quit")}
            </button>
            <button type="button" onClick={togglePause} className="tap min-w-[150px] rounded-pill bg-brand px-6 py-3.5 text-[16px] font-bold text-white">
              {paused ? t("circuit.resume") : t("circuit.pause")}
            </button>
            <button type="button" onClick={skip} className="tap rounded-pill bg-white/10 px-4 py-3 text-[14px] font-semibold text-white/80">
              {t("circuit.skip")}
            </button>
          </div>
        </div>
      ) : null}

      <ExerciseModal name={guideName} onClose={() => setGuideName(null)} />
    </div>
  );
}
