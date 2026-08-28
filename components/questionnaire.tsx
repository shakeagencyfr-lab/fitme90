"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QUIZ, DAYS, type Field } from "@/lib/questionnaire";
import { saveQuestionnaire } from "@/app/questionnaire/actions";
import { MedicalWaiver } from "@/components/medical-waiver";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

type Answers = Record<string, string | string[]>;

export function Questionnaire() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Situation de santé déclarée : décharge à signer (ne bloque plus l'accès).
  const [waiver, setWaiver] = useState<string[] | null>(null);

  const section = QUIZ[step];
  const total = QUIZ.length;
  const last = step === total - 1;

  function set(key: string, value: string | string[]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }
  function toggleMulti(key: string, opt: string) {
    setAnswers((a) => {
      const cur = Array.isArray(a[key]) ? [...(a[key] as string[])] : [];
      const i = cur.indexOf(opt);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(opt);
      return { ...a, [key]: cur };
    });
  }

  async function next() {
    if (!last) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setBusy(true);
    setError("");
    const trainDays = Array.isArray(answers.train_days) ? (answers.train_days as string[]) : [];
    const res = await saveQuestionnaire({ answers, trainDays });
    setBusy(false);
    if (res.error) return setError(res.error);
    if (res.flagged) return setWaiver(res.reasons ?? []);
    router.push("/salle");
  }

  if (waiver) {
    return (
      <div className="mx-auto max-w-[780px]">
        <MedicalWaiver
          reasons={waiver}
          onSigned={() => router.push("/salle")}
          submitLabel="Signer et poursuivre"
        />
      </div>
    );
  }

  const answered = section.fields.filter((f) => {
    const v = answers[f.key];
    return Array.isArray(v) ? v.length : !!v;
  }).length;

  return (
    <div className="mx-auto flex max-w-[780px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <MonoLabel>Section {step + 1}/{total}</MonoLabel>
          <span className="font-mono text-[11px] text-muted-2">{answered} réponses</span>
        </div>
        <div className="flex gap-1">
          {QUIZ.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Section ${i + 1}`}
              className={[
                "h-[5px] flex-1 rounded-[3px]",
                i < step ? "bg-ink" : i === step ? "bg-brand" : "bg-rest",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {section.title}
        </h1>
        {section.intro ? <p className="text-[15.5px] text-muted leading-[1.6]">{section.intro}</p> : null}
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex flex-col gap-3.5">
        {section.fields.map((f) => (
          <FieldView key={f.key} field={f} answers={answers} set={set} toggleMulti={toggleMulti} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="h-[52px]"
        >
          Retour
        </Button>
        <Button onClick={next} loading={busy} className="h-[52px] flex-1 max-w-[340px]">
          {last ? "Photos de ma salle" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}

function FieldView({
  field: f,
  answers,
  set,
  toggleMulti,
}: {
  field: Field;
  answers: Answers;
  set: (k: string, v: string | string[]) => void;
  toggleMulti: (k: string, o: string) => void;
}) {
  const value = answers[f.key];

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-semibold text-[16.5px] text-ink">{f.label}</div>
        {f.help ? <div className="text-[13px] text-muted-2 leading-[1.5]">{f.help}</div> : null}
      </div>

      {f.type === "text" || f.type === "number" ? (
        <input
          value={(value as string) ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          placeholder={f.placeholder}
          inputMode={f.type === "number" ? "decimal" : "text"}
          className="tap w-full rounded-btn border border-line-3 bg-surface-2 px-3.5 text-ink placeholder:text-disabled outline-none focus:border-ink"
        />
      ) : null}

      {f.type === "date" ? (
        <input
          type="date"
          value={(value as string) ?? ""}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => set(f.key, e.target.value)}
          className="tap w-full rounded-btn border border-line-3 bg-surface-2 px-3.5 text-ink outline-none focus:border-ink"
        />
      ) : null}

      {f.type === "days" ? (
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => {
            const on = Array.isArray(value) && value.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleMulti(f.key, d)}
                className={[
                  "tap rounded-pill border px-4 text-[14px] font-medium",
                  on ? "bg-brand text-white border-brand" : "bg-surface text-body border-line-4",
                ].join(" ")}
              >
                {d}
              </button>
            );
          })}
        </div>
      ) : null}

      {f.type === "choice" || f.type === "multi" ? (
        <div className="flex flex-wrap gap-2">
          {f.options!.map((o) => {
            const on = f.type === "multi" ? Array.isArray(value) && value.includes(o) : value === o;
            return (
              <button
                key={o}
                onClick={() => (f.type === "multi" ? toggleMulti(f.key, o) : set(f.key, o))}
                className={[
                  "tap rounded-pill border px-4 text-[14.5px]",
                  on ? "bg-brand text-white border-brand" : "bg-surface text-body border-line-4",
                ].join(" ")}
              >
                {o}
              </button>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
