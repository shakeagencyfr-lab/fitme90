"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState } from "react";
import { sendPushToClient, type NotifState } from "@/app/admin/actions";
import { Card, Button, Alert, MonoLabel, Field, TextArea } from "@/components/ui";

// Fiche CRM : envoi d'une notification push directe à un seul client.
export function ClientPush({ userId, name }: { userId: string; name: string }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(sendPushToClient, {} as NotifState);
  return (
    <Card className="flex flex-col gap-3">
      <MonoLabel>{tx("Envoyer un message push à")} {name}</MonoLabel>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="user_id" value={userId} />
        <Field name="title" label={tx("Titre")} placeholder={tx("Un mot pour toi")} className="h-11" />
        <TextArea name="body" label={tx("Message")} placeholder={tx("Bravo pour ta régularité cette semaine, continue !")} rows={2} />
        <Field name="url" label={tx("Lien à ouvrir (optionnel)")} placeholder={tx("/app")} className="h-11" />
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? (
          <Alert tone="info">
            {state.sent ? `Envoyée à ${state.sent} appareil(s).` : "Aucun appareil abonné pour ce client."}
          </Alert>
        ) : null}
        <Button type="submit" loading={pending} className="self-start h-11">{tx("Envoyer")}</Button>
      </form>
    </Card>
  );
}
