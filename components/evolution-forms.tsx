"use client";

import { useActionState } from "react";
import { addWeight, addMeasurement, type EvoState } from "@/app/app/evolution/actions";
import { Button, Field, Alert, Card, MonoLabel } from "@/components/ui";

export function WeightForm() {
  const [state, action, pending] = useActionState(addWeight, {} as EvoState);
  return (
    <Card as="section">
      <form action={action} className="flex flex-col gap-3">
        <MonoLabel>Ajouter un poids</MonoLabel>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Poids enregistré.</Alert> : null}
        <div className="flex items-end gap-3">
          <Field id="kg" name="kg" type="text" inputMode="decimal" label="Poids (kg)" placeholder="67,5" className="max-w-[160px]" />
          <Button type="submit" loading={pending} className="h-11">Enregistrer</Button>
        </div>
      </form>
    </Card>
  );
}

const MEAS: [string, string][] = [
  ["waist", "Tour de taille"],
  ["hips", "Hanches"],
  ["chest", "Poitrine"],
  ["thigh", "Cuisse"],
  ["arm", "Bras"],
];

export function MeasurementForm() {
  const [state, action, pending] = useActionState(addMeasurement, {} as EvoState);
  return (
    <Card as="section">
      <form action={action} className="flex flex-col gap-3">
        <MonoLabel>Mensurations (cm)</MonoLabel>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Mensurations enregistrées.</Alert> : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MEAS.map(([k, label]) => (
            <Field key={k} id={k} name={k} type="text" inputMode="decimal" label={label} placeholder="·" />
          ))}
        </div>
        <Button type="submit" loading={pending} className="self-start h-11">Enregistrer</Button>
      </form>
    </Card>
  );
}
