"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Alert, MonoLabel } from "@/components/ui";

const STEPS = [
  "Lecture du profil et des contraintes",
  "Filtrage des exercices selon le matériel",
  "Répartition sur tes jours d'entraînement",
  "Construction des trois cycles",
  "Calcul des besoins et des repas",
  "Mise en forme du programme",
];

type Status = "running" | "error" | "hold" | "done";

export function GenerateStep() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("running");
  const [step, setStep] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [error, setError] = useState("");
  const started = useRef(false);

  async function run() {
    setStatus("running");
    setStep(0);
    setError("");
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2000);
    try {
      const res = await fetch("/api/generate", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      clearInterval(tick);
      if (res.status === 403 && data.error === "medical_hold") {
        setReasons(data.reasons ?? []);
        setStatus("hold");
        return;
      }
      if (!res.ok) throw new Error(data.error || "La génération a échoué.");
      setStep(STEPS.length - 1);
      setStatus("done");
      setTimeout(() => router.push("/app?genere=1"), 600);
    } catch (err) {
      clearInterval(tick);
      setError(err instanceof Error ? err.message : "La génération a échoué.");
      setStatus("error");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct =
    status === "done" ? 100 : Math.round(((step + 1) / STEPS.length) * 92);

  if (status === "hold") {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4">
        <MonoLabel className="text-brand">Avis médical requis</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Programme en attente
        </h1>
        <Alert>Un avis médical est nécessaire avant de générer ton programme :</Alert>
        <ul className="flex flex-col gap-2">
          {reasons.map((r, i) => (
            <li key={i} className="flex gap-2 text-[14.5px] text-body">
              <span className="text-brand" aria-hidden>•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <p className="text-[14px] text-muted">Ton paiement reste valable une fois l'accord obtenu.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <MonoLabel className="text-brand">Étape 3 · génération</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {status === "error" ? "La génération a échoué" : "On écrit ton programme"}
        </h1>
      </div>

      {status === "error" ? (
        <>
          <Alert>{error}</Alert>
          <Button onClick={run} className="self-start h-12">Réessayer</Button>
        </>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <span className="font-archivo font-extrabold text-[52px] leading-none tracking-[-0.03em] text-ink tabular-nums">
              {pct}<span className="text-[22px] text-muted-2">%</span>
            </span>
          </div>
          <div className="h-[6px] overflow-hidden rounded-[3px] bg-line">
            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <ul className="flex flex-col gap-2.5">
            {STEPS.map((s, i) => (
              <li
                key={i}
                className={[
                  "flex items-center gap-3 text-[14.5px]",
                  i < step || status === "done" ? "text-ink" : i === step ? "text-body" : "text-disabled",
                ].join(" ")}
              >
                <span className={i <= step || status === "done" ? "text-brand" : "text-disabled"}>
                  {i < step || status === "done" ? "✓" : "○"}
                </span>
                {s}
              </li>
            ))}
          </ul>
          <p className="text-[12.5px] text-muted-2">Cela prend généralement moins d'une minute.</p>
        </>
      )}
    </div>
  );
}
