"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession, type SetEntry } from "@/app/app/seance/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { isCardioExercise, cardioZone, type HeartZone } from "@/lib/fitness";

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  note?: string;
  cardio?: boolean;
  duration?: string;
  zone?: string;
}

interface Props {
  day: number;
  exercises: Exercise[];
  rpeGoal: string;
  canLog: boolean;
  alreadyDone: boolean;
  initial: Record<string, { kg: string; reps: string }>;
  zones?: HeartZone[];
}

const REST_DEFAULT = 90;

export function SessionRunner({ day, exercises, rpeGoal, canLog, alreadyDone, initial, zones }: Props) {
  const router = useRouter();
  const [log, setLog] = useState<Record<string, { kg: string; reps: string }>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(alreadyDone);
  const [error, setError] = useState("");

  // Minuteur de repos intégré
  const [rest, setRest] = useState(0);
  const [restRun, setRestRun] = useState(false);

  useEffect(() => {
    if (!restRun) return;
    const id = setInterval(() => {
      setRest((s) => {
        if (s <= 1) {
          setRestRun(false);
          try {
            navigator.vibrate?.(200);
          } catch {
            /* ignore */
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [restRun]);

  function startRest() {
    setRest(REST_DEFAULT);
    setRestRun(true);
  }

  function setField(key: string, field: "kg" | "reps", value: string) {
    setSaved(false);
    setLog((l) => ({ ...l, [key]: { kg: l[key]?.kg ?? "", reps: l[key]?.reps ?? "", [field]: value } }));
  }

  const { volume, done, totalSets } = useMemo(() => {
    let volume = 0;
    let done = 0;
    let totalSets = 0;
    exercises.forEach((ex, ei) => {
      if (isCardioExercise(ex.name, ex.note, ex.cardio)) return; // cardio : pas de séries
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
  }, [log, exercises]);

  async function validate() {
    setSaving(true);
    setError("");
    const entries: SetEntry[] = [];
    exercises.forEach((ex, ei) => {
      if (isCardioExercise(ex.name, ex.note, ex.cardio)) return; // cardio : rien à logger
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
    router.refresh();
  }

  const mm = String(Math.floor(rest / 60)).padStart(2, "0");
  const ss = String(rest % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-4 pb-24">
      <p className="text-[13.5px] text-muted leading-relaxed">
        Note tes séries, le poids (kg) et les répétitions. Touche <strong>Repos</strong> après
        une série pour lancer le minuteur. Tu peux refaire cette séance quand tu veux.
      </p>

      {exercises.map((ex, ei) => {
        // Exercice cardio : pas de séries/charges, on affiche la zone cardiaque cible.
        if (isCardioExercise(ex.name, ex.note, ex.cardio)) {
          const zone = zones && zones.length ? cardioZone(zones, ex.zone ?? "", ex.name, ex.note) : null;
          const duration = ex.duration || ex.reps || "";
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
              {zone ? (
                <div className="flex items-center justify-between gap-3 rounded-control px-3.5 py-3" style={{ background: zone.bg }}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-archivo font-extrabold text-[13px]" style={{ color: zone.fg }}>{zone.id}</span>
                    <div className="min-w-0">
                      <div className="font-archivo font-semibold text-[15px] leading-tight text-ink">Zone {zone.name}</div>
                      <div className="truncate text-[12.5px] text-muted">{zone.use}</div>
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
                {ex.sets} × {ex.reps} · RPE {rpeGoal}
              </div>
            </div>
            {ex.note ? <div className="text-[12.5px] text-muted leading-[1.5]">{ex.note}</div> : null}

            {canLog ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: ex.sets }).map((_, si) => {
                  const key = `${ei}-${si}`;
                  const e = log[key] ?? { kg: "", reps: "" };
                  const ok = Number(e.reps || 0) > 0;
                  return (
                    <div
                      key={si}
                      className={[
                        "flex items-center gap-2 rounded-control px-2 py-1.5 transition-colors",
                        ok ? "bg-[#F3F8F3]" : "bg-surface-2",
                      ].join(" ")}
                    >
                      <span className="w-6 text-center font-mono text-[11px] text-muted-2">S{si + 1}</span>
                      <input
                        inputMode="decimal"
                        value={e.kg}
                        onChange={(ev) => setField(key, "kg", ev.target.value)}
                        placeholder="kg"
                        className="tap w-full min-w-0 flex-1 rounded-[7px] border border-line-4 bg-surface px-2.5 text-center text-ink placeholder:text-disabled outline-none focus:border-ink"
                      />
                      <span className="text-muted-2">×</span>
                      <input
                        inputMode="numeric"
                        value={e.reps}
                        onChange={(ev) => setField(key, "reps", ev.target.value)}
                        placeholder="reps"
                        className="tap w-full min-w-0 flex-1 rounded-[7px] border border-line-4 bg-surface px-2.5 text-center text-ink placeholder:text-disabled outline-none focus:border-ink"
                      />
                      <button
                        onClick={startRest}
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
          <Button onClick={validate} loading={saving} full className="h-[52px]">
            {saved ? "Mettre à jour ma séance" : "Valider ma séance"}
          </Button>
        </div>
      ) : (
        <Alert tone="info">Séance en lecture seule.</Alert>
      )}

      {/* Minuteur de repos flottant */}
      {rest > 0 ? (
        <div className="fixed inset-x-3 bottom-[calc(150px+env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-card border border-fillfg/10 bg-fill px-4 py-3 text-fillfg nav:inset-x-auto nav:right-6 nav:bottom-[92px] nav:w-[340px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fillfg/60">Repos</span>
          <span className="font-archivo font-extrabold text-[26px] leading-none tabular-nums">{mm}:{ss}</span>
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
