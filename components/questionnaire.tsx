"use client";

import { browserLocalIso } from "@/lib/local-date";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUIZ, DAYS, MAX_TRAIN_DAYS, trainDaysError, type Field } from "@/lib/questionnaire";
import { saveQuestionnaire } from "@/app/questionnaire/actions";
import { MedicalWaiver } from "@/components/medical-waiver";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { fieldText, optionLabel, sectionText, dayLabel } from "@/lib/i18n/quiz";
import { localeFromLabel, localeLabel, makeT, type Locale } from "@/lib/i18n";

type Answers = Record<string, string | string[]>;

export function Questionnaire() {
  const router = useRouter();
  const localeInitiale = useLocale();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    program_lang: localeLabel(localeInitiale),
  });
  // Le questionnaire bascule DÈS que le client choisit sa langue, sans attendre
  // la fin du parcours. Avant, la langue n'était appliquée qu'à
  // l'enregistrement : on cochait « English » et on continuait à répondre à des
  // questions en français, ce qui donnait l'impression que le choix n'avait
  // pas été pris en compte.
  const locale: Locale = localeFromLabel(answers.program_lang) ?? localeInitiale;
  const t = useMemo(() => makeT(locale), [locale]);
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
      // Jours d'entraînement : au plus 5, chaque fréquence ayant son gabarit.
      else if (key === "train_days" && cur.length >= MAX_TRAIN_DAYS) return a;
      else cur.push(opt);
      return { ...a, [key]: cur };
    });
  }

  async function next() {
    const trainDays = Array.isArray(answers.train_days) ? (answers.train_days as string[]) : [];
    // On bloque dès la section des jours, pas seulement à la fin du questionnaire.
    if (section.fields.some((f) => f.type === "days")) {
      const daysErr = trainDaysError(trainDays.length);
      if (daysErr) {
        setError(trainDays.length < 2 ? t("quiz.daysMin", { n: 2 }) : t("quiz.daysMax", { n: MAX_TRAIN_DAYS }));
        return;
      }
    }
    if (!last) {
      setError("");
      setStep((s) => s + 1);
      window.scrollTo({ top: 0 });
      return;
    }
    setBusy(true);
    setError("");
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
          submitLabel={t("quiz.signAndContinue")}
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
          <MonoLabel>{t("quiz.section", { n: step + 1, total })}</MonoLabel>
          <span className="font-mono text-[11px] text-muted-2">{t("quiz.answers", { n: answered })}</span>
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
          {sectionText(section, locale).title}
        </h1>
        {sectionText(section, locale).intro ? <p className="text-[15.5px] text-muted leading-[1.6]">{sectionText(section, locale).intro}</p> : null}
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div className="flex flex-col gap-3.5">
        {section.fields.map((f) => (
          <FieldView key={f.key} field={f} answers={answers} set={set} toggleMulti={toggleMulti} locale={locale} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="h-[52px]"
        >
          {t("common.back")}
        </Button>
        <Button onClick={next} loading={busy} className="h-[52px] flex-1 max-w-[340px]">
          {last ? t("quiz.nextPhotos") : t("common.continue")}
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
  locale,
}: {
  field: Field;
  answers: Answers;
  set: (k: string, v: string | string[]) => void;
  toggleMulti: (k: string, o: string) => void;
  locale: Locale;
}) {
  const value = answers[f.key];
  const text = fieldText(f, locale);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-semibold text-[16.5px] text-ink">{text.label}</div>
        {text.help ? <div className="text-[13px] text-muted-2 leading-[1.5]">{text.help}</div> : null}
      </div>

      {f.type === "text" || f.type === "number" ? (
        <input
          value={(value as string) ?? ""}
          onChange={(e) => set(f.key, e.target.value)}
          placeholder={text.placeholder}
          inputMode={f.type === "number" ? "decimal" : "text"}
          className="tap w-full rounded-btn border border-line-3 bg-surface-2 px-3.5 text-ink placeholder:text-disabled outline-none focus:border-ink"
        />
      ) : null}

      {f.type === "date" ? (
        <input
          type="date"
          value={(value as string) ?? ""}
          min={browserLocalIso(new Date())}
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
                {dayLabel(d, locale)}
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
                {optionLabel(f, o, locale)}
              </button>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
