"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MedicalWaiver } from "@/components/medical-waiver";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { useT } from "@/components/locale-provider";
import { GenerationStage } from "@/components/generation-stage";
import { generationPct, generationStep } from "@/lib/generation-progress";

const STEP_KEYS = ["profile", "filter", "spread", "cycles", "meals", "format"] as const;

type Status = "running" | "error" | "waiver" | "done";

export function GenerateStep() {
  const router = useRouter();
  const t = useT();
  const STEPS = STEP_KEYS.map((k) => t(`generate.steps.${k}`));
  const [status, setStatus] = useState<Status>("running");
  const [reasons, setReasons] = useState<string[]>([]);
  const [error, setError] = useState("");
  const started = useRef(false);
  // Secondes écoulées depuis le lancement. C'est LA source de la progression :
  // le nombre d'étapes affichées, lui, ne dit rien du temps réel que prend le
  // modèle. Avant, la barre atteignait 92 % en dix secondes puis n'y bougeait
  // plus pendant trois minutes, et le client concluait à un plantage.
  const [elapsed, setElapsed] = useState(0);

  async function run() {
    setStatus("running");
    setElapsed(0);
    setError("");
    const debut = Date.now();
    const tick = setInterval(() => setElapsed((Date.now() - debut) / 1000), 250);
    try {
      // Après paiement, le webhook Stripe peut mettre 1 à 2 s à marquer le compte
      // payé : si /api/generate répond 402 (pas encore confirmé), on patiente et
      // on retente quelques fois avant d'abandonner.
      let res = await fetch("/api/generate", { method: "POST" });
      let data = await res.json().catch(() => ({}));
      for (let i = 0; res.status === 402 && i < 12; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        res = await fetch("/api/generate", { method: "POST" });
        data = await res.json().catch(() => ({}));
      }
      // Une génération tourne déjà pour ce compte (autre onglet, page
      // rechargée) : on attend qu'elle finisse au lieu d'en lancer une autre.
      for (let i = 0; res.status === 423 && i < 60; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        res = await fetch("/api/generate", { method: "POST" });
        data = await res.json().catch(() => ({}));
      }
      clearInterval(tick);
      // Le programme existe déjà : rien à écrire, on y va.
      if (res.status === 409) {
        setStatus("done");
        router.push("/app");
        return;
      }
      if (res.status === 403 && data.error === "medical_waiver_required") {
        setReasons(data.reasons ?? []);
        setStatus("waiver");
        return;
      }
      if (res.status === 402) {
        throw new Error(t("generate.notPaid"));
      }
      if (!res.ok) throw new Error(data.error || t("generate.failedBody"));
      setStatus("done");
      setTimeout(() => router.push("/app?genere=1"), 600);
    } catch (err) {
      clearInterval(tick);
      setError(err instanceof Error ? err.message : t("generate.failedBody"));
      setStatus("error");
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fini = status === "done";
  const pct = generationPct(elapsed, fini);
  const step = generationStep(elapsed, STEPS.length, fini);

  if (status === "waiver") {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4">
        <MedicalWaiver
          reasons={reasons}
          onSigned={() => {
            started.current = false;
            run();
          }}
          submitLabel={t("generate.signAndGenerate")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <MonoLabel className="text-brand">{t("generate.step")}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {status === "error" ? t("generate.failed") : t("generate.writing")}
        </h1>
      </div>

      {status === "error" ? (
        <>
          <Alert>{error}</Alert>
          <Button onClick={run} className="self-start h-12">{t("generate.retry")}</Button>
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
          <GenerationStage pct={pct} elapsed={elapsed} />
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
          <p className="text-[13px] text-muted">{t("generate.takesTime")}</p>
        </>
      )}
    </div>
  );
}
