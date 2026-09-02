"use client";

import { useActionState } from "react";
import { useT } from "@/components/locale-provider";
import { addWeight, addMeasurement, type EvoState } from "@/app/app/evolution/actions";
import { Button, Field, Alert, Card, MonoLabel } from "@/components/ui";

export function WeightForm() {
  const [state, action, pending] = useActionState(addWeight, {} as EvoState);
  const t = useT();
  return (
    <Card as="section">
      <form action={action} className="flex flex-col gap-3">
        <MonoLabel>{t("evolution.addWeight")}</MonoLabel>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{t("evolution.weightSaved")}</Alert> : null}
        <div className="flex items-end gap-3">
          <Field id="kg" name="kg" type="text" inputMode="decimal" label={t("evolution.weightKg")} placeholder="67,5" className="max-w-[160px]" />
          <Button type="submit" loading={pending} className="h-11">{t("common.save")}</Button>
        </div>
      </form>
    </Card>
  );
}

const MEAS = ["waist", "hips", "chest", "thigh", "arm"] as const;

export function MeasurementForm() {
  const [state, action, pending] = useActionState(addMeasurement, {} as EvoState);
  const t = useT();
  return (
    <Card as="section">
      <form action={action} className="flex flex-col gap-3">
        <MonoLabel>{t("evolution.measures")}</MonoLabel>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{t("evolution.measuresSaved")}</Alert> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MEAS.map((k) => (
            <Field key={k} id={k} name={k} type="text" inputMode="decimal" label={k === "waist" ? t("evolution.waist") : t(`evolution.meas.${k}`)} placeholder="·" />
          ))}
        </div>
        <Button type="submit" loading={pending} className="self-start h-11">{t("common.save")}</Button>
      </form>
    </Card>
  );
}
