"use client";

import { useActionState } from "react";
import { validateSession, type ValidateState } from "@/app/app/seance/actions";
import { Button, Field, Alert } from "@/components/ui";

export function SessionValidate({ alreadyDone }: { alreadyDone: boolean }) {
  const [state, action, pending] = useActionState(validateSession, {} as ValidateState);
  const done = alreadyDone || state.ok;

  if (done) {
    return (
      <Alert tone="info">
        Séance validée pour aujourd'hui. On se retrouve à la prochaine.
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="font-archivo font-semibold text-[15px] text-ink">Valider ma séance</div>
      {state.error ? <Alert>{state.error}</Alert> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field id="sets" name="sets" type="number" inputMode="numeric" label="Séries faites" placeholder="18" min={0} />
        <Field id="volume" name="volume" type="number" inputMode="numeric" label="Volume total (kg)" placeholder="4200" min={0} />
      </div>
      <Button type="submit" loading={pending}>Valider et avancer</Button>
      <p className="text-[12px] text-muted-2">
        Note ce que tu as réellement fait : le coach conseille ensuite, aucune charge n'est imposée.
      </p>
    </form>
  );
}
