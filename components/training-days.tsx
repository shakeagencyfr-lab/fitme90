"use client";

import { useState, useTransition } from "react";
import { updateTrainDays } from "@/app/app/actions";
import { DAYS } from "@/lib/questionnaire";
import { Card, MonoLabel, Button, Alert } from "@/components/ui";
import { useLocale, useT } from "@/components/locale-provider";
import { dayLabel } from "@/lib/i18n/quiz";

// Édition des jours d'entraînement depuis le Programme (emploi du temps qui change).
export function TrainingDaysEditor({ initial }: { initial: string[] }) {
  const t = useT();
  const locale = useLocale();
  const [days, setDays] = useState<string[]>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string }>({});

  const dirty = JSON.stringify([...days].sort()) !== JSON.stringify([...initial].sort());

  function toggle(d: string) {
    setMsg({});
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function save() {
    start(async () => {
      const res = await updateTrainDays(days);
      setMsg(res);
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <MonoLabel>{t("regularity.myDays")}</MonoLabel>
        <p className="text-[13px] text-muted">{t("regularity.myDaysBody")}</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => {
          const on = days.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggle(d)}
              className={[
                "tap rounded-control border py-2.5 text-[13px] font-semibold transition-colors",
                on ? "bg-brand text-white border-brand" : "bg-surface text-muted-2 border-line-4 hover:border-ink",
              ].join(" ")}
            >
              {dayLabel(d, locale)}
            </button>
          );
        })}
      </div>
      {msg.error ? <Alert>{msg.error}</Alert> : null}
      {msg.ok ? <Alert tone="info">{t("regularity.daysUpdated")}</Alert> : null}
      {dirty ? (
        <Button onClick={save} loading={pending} className="self-start h-11">
          {t("regularity.saveDays")}
        </Button>
      ) : null}
    </Card>
  );
}
