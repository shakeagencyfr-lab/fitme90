"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveAccountBrandName,
  saveAccountFullName,
  saveAccountPassword,
  type AccountState,
} from "@/app/admin/actions";
import { Alert, Button, Card, Field, MonoLabel } from "@/components/ui";

// Réglages du compte. Trois formulaires distincts plutôt qu'un seul :
// changer son nom et changer son mot de passe n'ont ni les mêmes conséquences
// ni le même rythme, et les mêler ferait ressaisir un mot de passe pour
// corriger une faute de frappe dans un nom.

/** Nom commercial : celui qui part sur les landings, les e-mails, les dashboards. */
export function BrandNameForm({ current }: { current: string }) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveAccountBrandName, {} as AccountState);
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <MonoLabel>{tx("Nom de ta plateforme")}</MonoLabel>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          {tx("Il apparaît sur ta page publique, dans les e-mails envoyés à tes clients et en haut de leur espace. Le changer met tout à jour d'un coup.")}</p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <Field
          name="brand_name"
          label={tx("Nom affiché")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          className="h-11"
        />
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Nom mis à jour partout.")}</Alert> : null}
        <Button type="submit" loading={pending} disabled={value.trim() === current.trim()} className="h-11 self-start">
          {tx("Enregistrer")}</Button>
      </form>
    </Card>
  );
}

/** Nom de la personne, distinct du nom commercial. */
export function FullNameForm({ current, email }: { current: string; email: string }) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveAccountFullName, {} as AccountState);
  const [value, setValue] = useState(current);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <MonoLabel>{tx("Tes informations")}</MonoLabel>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          {tx("Ton nom à toi, distinct du nom commercial. Il sert dans les échanges internes et la signature de tes e-mails.")}</p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <Field
          name="full_name"
          label={tx("Ton nom")}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={80}
          className="h-11"
        />
        <div className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Adresse e-mail")}</MonoLabel>
          <div className="flex h-11 items-center rounded-control border border-line-2 bg-surface-2 px-3.5 text-[14px] text-muted">
            {email}
          </div>
          <p className="text-[12px] leading-snug text-muted-2">
            {tx("L'adresse sert à te connecter : elle ne se change pas ici. Écris à l'assistance si tu dois en changer.")}</p>
        </div>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Informations enregistrées.")}</Alert> : null}
        <Button type="submit" loading={pending} disabled={value.trim() === current.trim()} className="h-11 self-start">
          {tx("Enregistrer")}</Button>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(saveAccountPassword, {} as AccountState);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <MonoLabel>{tx("Mot de passe")}</MonoLabel>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          {tx("8 caractères minimum. Tu restes connecté sur cet appareil après le changement.")}</p>
      </div>
      {/* `key` remis à zéro après un succès : sans ça les deux champs
          garderaient le mot de passe en clair dans le DOM après l'envoi. */}
      <form key={state.ok ? "done" : "edit"} action={action} className="flex flex-col gap-3">
        <Field name="password" type="password" label={tx("Nouveau mot de passe")} autoComplete="new-password" className="h-11" />
        <Field name="confirm" type="password" label={tx("Confirme le mot de passe")} autoComplete="new-password" className="h-11" />
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Mot de passe changé.")}</Alert> : null}
        <Button type="submit" loading={pending} className="h-11 self-start">
          {tx("Changer le mot de passe")}</Button>
      </form>
    </Card>
  );
}
