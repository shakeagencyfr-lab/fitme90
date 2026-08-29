"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, type SetEntry } from "@/app/app/seance/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { isCardioExercise, cardioZone, formatRest, type HeartZone } from "@/lib/fitness";

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  note?: string;
  rest?: number; // repos entre séries de cet exercice (secondes)
  cardio?: boolean;
  duration?: string;
  zone?: string;
}

// Petit bouton « alternative » (remplacement d'exercice à la demande).
function AlternativeButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="tap inline-flex w-fit items-center gap-1.5 self-start rounded-pill border border-line-4 bg-surface px-3 py-1.5 text-[12px] font-semibold text-body transition-colors hover:border-ink disabled:opacity-60"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 2v6h6M21 22v-6h-6" />
        <path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 12a9 9 0 0 0 15 6.7l3-2.7" />
      </svg>
      {busy ? "Recherche…" : "Autre exercice"}
    </button>
  );
}

// Durée d'un cardio en secondes, lue dans un texte (« 12 min », « 20 mn »,
// « 90 s », « 12 »). Sans unité claire, on considère des minutes.
function durationToSeconds(text: string | undefined): number {
  if (!text) return 0;
  const t = text.toLowerCase();
  const mmss = /(\d+)\s*(?:mn|min|m|')\s*(\d{1,2})/.exec(t);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const min = /(\d+)\s*(?:mn|min|m|')/.exec(t);
  if (min) return Number(min[1]) * 60;
  const sec = /(\d+)\s*(?:s|sec|secondes?|")/.exec(t);
  if (sec) return Number(sec[1]);
  const bare = /(\d+)/.exec(t);
  return bare ? Number(bare[1]) * 60 : 0;
}

// Brouillon local de la séance : ce qui est saisi est sauvegardé en continu sur
// l'appareil, pour ne rien perdre si on quitte l'onglet puis on revient.
type Draft = { log: Record<string, { kg: string; reps: string }>; cardio: string[] };
const draftKey = (day: number) => `fitme90:seance:${day}`;

function loadDraft(day: number): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(day));
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (d && typeof d === "object") return d;
  } catch {
    /* stockage indisponible */
  }
  return null;
}
function saveDraft(day: number, draft: Draft) {
  try {
    localStorage.setItem(draftKey(day), JSON.stringify(draft));
  } catch {
    /* stockage indisponible */
  }
}
function clearDraft(day: number) {
  try {
    localStorage.removeItem(draftKey(day));
  } catch {
    /* stockage indisponible */
  }
}

interface Props {
  day: number;
  exercises: Exercise[];
  rpeGoal: string;
  canLog: boolean;
  alreadyDone: boolean;
  initial: Record<string, { kg: string; reps: string }>;
  zones?: HeartZone[];
  restSec?: number;
  initialCardio?: string[]; // noms des exercices cardio déjà cochés
  canAlternate?: boolean; // proposer un exercice de remplacement (IA)
  sessionTitle?: string; // contexte séance pour l'alternative
}

export function SessionRunner({
  day,
  exercises,
  rpeGoal,
  canLog,
  alreadyDone,
  initial,
  zones,
  restSec = 90,
  initialCardio = [],
  canAlternate = false,
  sessionTitle = "",
}: Props) {
  const router = useRouter();
  // Liste locale des exercices : permet de remplacer un exercice par une
  // alternative « ce jour-là » sans toucher au programme enregistré.
  const [exList, setExList] = useState<Exercise[]>(exercises);
  const [altBusy, setAltBusy] = useState<number | null>(null);
  const [altErr, setAltErr] = useState("");
  // Resynchronise la liste locale quand on change de jour (nouvelle séance) :
  // idiome React d'ajustement d'état pendant le rendu (pas d'effet).
  const [prevDay, setPrevDay] = useState(day);
  if (prevDay !== day) {
    setPrevDay(day);
    setExList(exercises);
  }

  async function alternative(ei: number) {
    setAltBusy(ei);
    setAltErr("");
    try {
      const ex = exList[ei];
      const res = await fetch("/api/exercise/alternative", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: ex.name,
          note: ex.note ?? "",
          cardio: !!ex.cardio,
          sessionTitle,
          avoid: exList.map((x) => x.name),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.exercise) throw new Error(data.error || "Alternative indisponible.");
      setExList((list) => list.map((x, i) => (i === ei ? (data.exercise as Exercise) : x)));
      // Les saisies de cet exercice ne valent plus pour le nouveau mouvement.
      setLog((l) => {
        const n = { ...l };
        for (const k of Object.keys(n)) if (k.startsWith(`${ei}-`)) delete n[k];
        return n;
      });
      setSaved(false);
    } catch (e) {
      setAltErr(e instanceof Error ? e.message : "Alternative indisponible.");
    } finally {
      setAltBusy(null);
    }
  }
  // État initial : brouillon local prioritaire (saisie en cours non validée),
  // sinon les données déjà enregistrées côté serveur.
  const [log, setLog] = useState<Record<string, { kg: string; reps: string }>>(
    () => (typeof window !== "undefined" ? loadDraft(day)?.log : null) ?? initial,
  );
  const [cardioDone, setCardioDone] = useState<Record<string, boolean>>(() => {
    const d = typeof window !== "undefined" ? loadDraft(day) : null;
    return Object.fromEntries((d?.cardio ?? initialCardio).map((n) => [n, true]));
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(
    () => alreadyDone && (typeof window === "undefined" || !loadDraft(day)),
  );
  const [error, setError] = useState("");

  // Sauvegarde continue du brouillon à chaque changement (charges, reps, cardio).
  useEffect(() => {
    if (!canLog) return;
    const cardio = Object.keys(cardioDone).filter((k) => cardioDone[k]);
    saveDraft(day, { log, cardio });
  }, [log, cardioDone, day, canLog]);

  // Minuteur intégré : sert au repos entre séries ET au chrono cardio.
  const [rest, setRest] = useState(0);
  const [restRun, setRestRun] = useState(false);
  const [timerLabel, setTimerLabel] = useState("Repos");
  const restRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    restRef.current = rest;
  }, [rest]);

  // Bip court (5 dernières secondes) et bip final via l'API Web Audio.
  function beep(freq: number, ms: number) {
    try {
      const ctx = audioRef.current;
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      o.start(t);
      o.stop(t + ms / 1000);
    } catch {
      /* audio indisponible */
    }
  }

  useEffect(() => {
    if (!restRun) return;
    const id = setInterval(() => {
      const next = restRef.current - 1;
      if (next <= 0) {
        setRest(0);
        setRestRun(false);
        beep(1320, 450); // signal de fin
        try {
          navigator.vibrate?.(200);
        } catch {
          /* ignore */
        }
      } else {
        setRest(next);
        if (next <= 5) beep(880, 130); // décompte des 5 dernières secondes
      }
    }, 1000);
    return () => clearInterval(id);
  }, [restRun]);

  function startTimer(seconds: number, label = "Repos") {
    // L'AudioContext doit être créé/repris sur un geste utilisateur.
    try {
      if (!audioRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioRef.current = new Ctor();
      }
      audioRef.current?.resume?.();
    } catch {
      /* audio indisponible */
    }
    setTimerLabel(label);
    setRest(seconds);
    setRestRun(true);
  }
  const startRest = (seconds: number = restSec) => startTimer(seconds, "Repos");

  function setField(key: string, field: "kg" | "reps", value: string) {
    // Chiffres uniquement : reps = entier ; kg = décimal avec un seul séparateur.
    let clean: string;
    if (field === "reps") {
      clean = value.replace(/\D/g, "");
    } else {
      clean = value.replace(/[^\d.,]/g, "");
      const sep = clean.search(/[.,]/);
      if (sep !== -1) clean = clean.slice(0, sep + 1) + clean.slice(sep + 1).replace(/[.,]/g, "");
    }
    setSaved(false);
    setLog((l) => ({ ...l, [key]: { kg: l[key]?.kg ?? "", reps: l[key]?.reps ?? "", [field]: clean } }));
  }

  function toggleCardio(name: string) {
    setSaved(false);
    setCardioDone((c) => ({ ...c, [name]: !c[name] }));
  }

  const { volume, done, totalSets } = useMemo(() => {
    let volume = 0;
    let done = 0;
    let totalSets = 0;
    exList.forEach((ex, ei) => {
      if (isCardioExercise(ex.name, ex.note, ex.cardio)) {
        totalSets++; // le cardio compte comme une unité à cocher
        if (cardioDone[ex.name]) done++;
        return;
      }
      for (let si = 0; si < ex.sets; si++) {
        totalSets++;
        const e = log[`${ei}-${si}`];
        const reps = Number(e?.reps || 0);
        if (reps > 0) {
          done++;
          volume += Number(e?.kg || 0) * reps;
        }
      }
    });
    return { volume, done, totalSets };
  }, [log, exList, cardioDone]);

  async function validate() {
    setSaving(true);
    setError("");
    const entries: SetEntry[] = [];
    exList.forEach((ex, ei) => {
      if (isCardioExercise(ex.name, ex.note, ex.cardio)) {
        if (cardioDone[ex.name]) {
          entries.push({ exercise: ex.name, set: 1, kg: null, reps: null, cardio: true });
        }
        return;
      }
      for (let si = 0; si < ex.sets; si++) {
        const e = log[`${ei}-${si}`];
        const reps = Number(e?.reps || 0);
        if (reps > 0) {
          entries.push({ exercise: ex.name, set: si + 1, kg: Number(e?.kg || 0) || null, reps });
        }
      }
    });
    const res = await saveSession({ day, entries });
    setSaving(false);
    if (res.error) return setError(res.error);
    setSaved(true);
    clearDraft(day); // enregistré côté serveur : le brouillon local n'est plus utile
    router.refresh();
  }

  const pct = totalSets ? Math.round((done / totalSets) * 100) : 0;

  // Premier exercice de musculation : sert d'ancre au tutoriel (surbrillance
  // précise des champs charge / reps / Repos sur sa première série).
  const firstStrengthIdx = exList.findIndex((e) => !isCardioExercise(e.name, e.note, e.cardio));

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Progression flottante : reste visible en haut pendant qu'on scrolle. */}
      {canLog ? (
        <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur nav:-mx-8 nav:px-8">
          <MonoLabel>Progression</MonoLabel>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-archivo font-extrabold text-[14px] tabular-nums text-ink">{pct}%</span>
        </div>
      ) : null}

      <p className="text-[13.5px] text-muted leading-relaxed">
        Note tes séries, le poids (kg) et les répétitions. Touche <strong>Repos</strong> après
        une série pour lancer le minuteur ({formatRest(restSec)} par défaut, ajustable). Tu peux
        refaire cette séance quand tu veux. Ta saisie est sauvegardée automatiquement.
      </p>

      {canAlternate ? (
        <p className="-mt-2 text-[12.5px] text-muted-2">
          Un exercice impossible aujourd&apos;hui (machine occupée, matériel manquant) ? Touche
          <span className="font-semibold text-body"> « Autre exercice » </span> pour une alternative.
        </p>
      ) : null}
      {altErr ? <Alert>{altErr}</Alert> : null}

      {exList.map((ex, ei) => {
        // Exercice cardio : pas de séries/charges, on affiche la zone cardiaque cible.
        if (isCardioExercise(ex.name, ex.note, ex.cardio)) {
          const zone = zones && zones.length ? cardioZone(zones, ex.zone ?? "", ex.name, ex.note) : null;
          const duration = ex.duration || ex.reps || "";
          const durSec = durationToSeconds(duration);
          return (
            <div key={ei} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-cardio text-cardio">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 12h4l2 5 4-10 2 5h6" />
                    </svg>
                  </span>
                  <div className="truncate font-archivo font-semibold text-[16px] text-ink">{ex.name}</div>
                </div>
                <div className="shrink-0 whitespace-nowrap font-mono text-[11px] text-cardio">
                  Cardio{duration ? ` · ${duration}` : ""}
                </div>
              </div>
              {ex.note ? <div className="text-[12.5px] leading-[1.5] text-muted">{ex.note}</div> : null}
              {canAlternate ? <AlternativeButton onClick={() => alternative(ei)} busy={altBusy === ei} /> : null}
              {durSec > 0 ? (
                <button
                  onClick={() => startTimer(durSec, ex.name)}
                  className="tap flex items-center justify-center gap-2 rounded-control border border-cardio/50 bg-cardio/10 px-3.5 py-2.5 text-[13.5px] font-semibold text-cardio transition-colors hover:border-cardio"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 9v4l2 2M9 2h6" />
                  </svg>
                  Lancer le chrono ({formatRest(durSec)})
                </button>
              ) : null}
              {zone ? (
                <div className="flex items-center justify-between gap-3 rounded-control px-3.5 py-3" style={{ background: zone.bg }}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-archivo font-extrabold text-[13px]" style={{ color: zone.fg }}>{zone.id}</span>
                    <div className="min-w-0">
                      <div className="font-archivo font-semibold text-[15px] leading-tight text-[#1b1d1f]">Zone {zone.name}</div>
                      <div className="truncate text-[12.5px] text-[#5c5a54]">{zone.use}</div>
                    </div>
                  </div>
                  <span className="shrink-0 font-archivo font-extrabold text-[16px] tabular-nums" style={{ color: zone.fg }}>
                    {zone.range} bpm
                  </span>
                </div>
              ) : (
                <div className="rounded-control bg-surface-2 px-3.5 py-3 text-[13px] text-muted">
                  Reste en zone cardiaque cible. Renseigne ton âge et ta FC de repos dans le profil pour l&apos;afficher en battements par minute.
                </div>
              )}
              <div className="text-[12px] text-muted-2">Garde cette intensité pendant l&apos;effort. Rien à noter ici : ni charge, ni répétitions.</div>
              {canLog ? (
                <button
                  onClick={() => toggleCardio(ex.name)}
                  className={[
                    "tap flex items-center gap-2.5 rounded-control border px-3.5 py-3 text-left transition-colors",
                    cardioDone[ex.name] ? "border-[#2F6B3C] bg-[#2F6B3C]/10" : "border-line-4 bg-surface hover:border-ink",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border text-[12px] text-white",
                      cardioDone[ex.name] ? "border-[#2F6B3C] bg-[#2F6B3C]" : "border-line-4 bg-surface",
                    ].join(" ")}
                  >
                    {cardioDone[ex.name] ? "✓" : ""}
                  </span>
                  <span className="text-[14px] font-medium text-ink">
                    {cardioDone[ex.name] ? "Cardio fait" : "Marquer ce cardio comme fait"}
                  </span>
                </button>
              ) : null}
            </div>
          );
        }

        const exDone = Array.from({ length: ex.sets }).every((_, si) => Number(log[`${ei}-${si}`]?.reps || 0) > 0);
        return (
          <div key={ei} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={[
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] transition-colors",
                    exDone ? "bg-[#2F6B3C] text-white" : "border border-line-4 text-muted-2",
                  ].join(" ")}
                >
                  {exDone ? "✓" : ei + 1}
                </span>
                <div className="font-archivo font-semibold text-[16px] text-ink truncate">{ex.name}</div>
              </div>
              <div className="font-mono text-[11px] text-brand shrink-0 whitespace-nowrap">
                {ex.sets} × {ex.reps} · RPE {rpeGoal} · récup {formatRest(ex.rest ?? restSec)}
              </div>
            </div>
            {ex.note ? <div className="text-[12.5px] text-muted leading-[1.5]">{ex.note}</div> : null}

            {canAlternate ? <AlternativeButton onClick={() => alternative(ei)} busy={altBusy === ei} /> : null}

            {canLog ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: ex.sets }).map((_, si) => {
                  const key = `${ei}-${si}`;
                  const e = log[key] ?? { kg: "", reps: "" };
                  const ok = Number(e.reps || 0) > 0;
                  const tourRow = ei === firstStrengthIdx && si === 0;
                  return (
                    <div
                      key={si}
                      className={[
                        "flex items-center gap-2 rounded-control px-2 py-1.5 transition-colors",
                        ok ? "bg-brand/10" : "bg-surface-2",
                      ].join(" ")}
                    >
                      <span className="w-6 text-center font-mono text-[11px] text-muted-2">S{si + 1}</span>
                      <input
                        inputMode="decimal"
                        value={e.kg}
                        onChange={(ev) => setField(key, "kg", ev.target.value)}
                        placeholder="kg"
                        data-tour={tourRow ? "charge" : undefined}
                        className="tap w-full min-w-0 flex-1 rounded-[7px] border border-line-4 bg-surface px-2.5 text-center text-ink placeholder:text-disabled outline-none focus:border-ink"
                      />
                      <span className="text-muted-2">×</span>
                      <input
                        inputMode="numeric"
                        value={e.reps}
                        onChange={(ev) => setField(key, "reps", ev.target.value)}
                        placeholder="reps"
                        data-tour={tourRow ? "reps" : undefined}
                        className="tap w-full min-w-0 flex-1 rounded-[7px] border border-line-4 bg-surface px-2.5 text-center text-ink placeholder:text-disabled outline-none focus:border-ink"
                      />
                      <button
                        onClick={() => startRest(ex.rest ?? restSec)}
                        data-tour={tourRow ? "repos" : undefined}
                        className="tap shrink-0 rounded-[7px] border border-line-4 bg-surface px-3 text-[12px] font-semibold text-body active:bg-paper"
                      >
                        Repos
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Totaux + validation */}
      {canLog ? (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <MonoLabel>Progression</MonoLabel>
            <span className="text-[13px] text-muted">
              {done}/{totalSets} séries · {Math.round(volume)} kg de volume
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-brand transition-[width]" style={{ width: `${totalSets ? (done / totalSets) * 100 : 0}%` }} />
          </div>
          {error ? <Alert>{error}</Alert> : null}
          {saved ? <Alert tone="info">Séance enregistrée. Tu peux la refaire quand tu veux.</Alert> : null}
          <Button onClick={validate} loading={saving} full className="h-[52px]" data-tour="valider">
            {saved ? "Mettre à jour ma séance" : "Valider ma séance"}
          </Button>
        </div>
      ) : (
        <Alert tone="info">Séance en lecture seule.</Alert>
      )}

      {/* Minuteur de repos flottant */}
      {rest > 0 ? (
        <div className="fixed inset-x-3 bottom-[calc(150px+env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-card border border-fillfg/10 bg-fill px-4 py-3 text-fillfg nav:inset-x-auto nav:right-6 nav:bottom-[92px] nav:w-[340px]">
          <span className="max-w-[120px] truncate font-mono text-[10px] uppercase tracking-[0.12em] text-fillfg/60">{timerLabel}</span>
          <span className="font-archivo font-extrabold text-[26px] leading-none tabular-nums">{formatRest(rest)}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setRest((s) => Math.max(0, s - 15))} className="tap rounded-pill bg-fillfg/15 px-2.5 text-[13px] font-semibold">−15</button>
            <button onClick={() => setRestRun((r) => !r)} className="tap rounded-pill bg-fillfg/15 px-3 text-[13px] font-semibold">
              {restRun ? "❚❚" : "▶"}
            </button>
            <button onClick={() => { setRest(0); setRestRun(false); }} className="tap rounded-pill bg-brand px-3 text-[13px] font-semibold">
              Stop
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
