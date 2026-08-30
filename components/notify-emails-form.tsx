"use client";

import { useActionState } from "react";
import { saveNotifyEmails, type NotifyEmailsState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

export function NotifyEmailsForm({ emails }: { emails: string[] }) {
  const [state, action, pending] = useActionState(saveNotifyEmails, {} as NotifyEmailsState);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Notifications par e-mail</div>
        <p className="text-[13px] text-muted">
          Reçois un e-mail dès qu&apos;un client t&apos;écrit dans le Chat VIP. Sépare plusieurs adresses par une virgule ou un espace.
        </p>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>E-mails de notification</MonoLabel>
          <textarea
            name="emails"
            rows={2}
            defaultValue={emails.join(", ")}
            placeholder="coach@exemple.com, assistant@exemple.com"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
        </label>
        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Adresses enregistrées.</Alert> : null}
        <Button type="submit" loading={pending} className="self-start h-11">
          Enregistrer
        </Button>
      </form>
    </Card>
  );
}
