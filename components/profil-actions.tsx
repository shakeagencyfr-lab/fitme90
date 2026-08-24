"use client";

import { useActionState, useState } from "react";
import { changePassword, deleteAccount, type ProfilState } from "@/app/app/profil/actions";
import { signOutAction } from "@/app/(auth)/actions";
import { Button, Field, Alert, Card, MonoLabel } from "@/components/ui";

export function PasswordChange() {
  const [state, action, pending] = useActionState(changePassword, {} as ProfilState);
  return (
    <Card as="section">
      <form action={action} className="flex flex-col gap-3">
        <MonoLabel>Mot de passe</MonoLabel>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Mot de passe mis à jour.</Alert> : null}
        <Field id="password" name="password" type="password" label="Nouveau mot de passe" autoComplete="new-password" />
        <Field id="confirm" name="confirm" type="password" label="Confirme" autoComplete="new-password" />
        <Button type="submit" loading={pending} className="self-start h-11">Changer</Button>
      </form>
    </Card>
  );
}

export function AccountActions() {
  const [confirming, setConfirming] = useState(false);
  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <MonoLabel>Mes données</MonoLabel>
        <a
          href="/api/export"
          className="tap inline-flex w-fit items-center rounded-btn border border-line-4 bg-surface px-5 text-[15px] font-semibold text-ink hover:border-ink"
        >
          Exporter mes données (JSON)
        </a>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="h-11">Se déconnecter</Button>
        </form>
      </div>

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <MonoLabel>Zone de danger</MonoLabel>
        {!confirming ? (
          <Button variant="danger" onClick={() => setConfirming(true)} className="self-start h-11">
            Supprimer mon compte
          </Button>
        ) : (
          <form action={deleteAccount} className="flex flex-col gap-3">
            <Alert>
              Suppression définitive et immédiate : programme, journaux, mesures et
              photos. Cette action est irréversible.
            </Alert>
            <div className="flex gap-2">
              <Button type="submit" variant="danger" className="h-11">Confirmer la suppression</Button>
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)} className="h-11">
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>
    </Card>
  );
}
