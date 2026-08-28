"use client";

import { useActionState } from "react";
import {
  sendBroadcastNow,
  scheduleBroadcast,
  deleteScheduled,
  type NotifState,
} from "@/app/admin/actions";
import { Card, Button, Alert, MonoLabel, Field, TextArea } from "@/components/ui";

interface Scheduled {
  id: string;
  title: string;
  body: string;
  send_at: string;
}

function fmt(d: string) {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export function NotifAdmin({ scheduled }: { scheduled: Scheduled[] }) {
  const [nState, nAction, nPending] = useActionState(sendBroadcastNow, {} as NotifState);
  const [sState, sAction, sPending] = useActionState(scheduleBroadcast, {} as NotifState);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[26px] tracking-[-0.02em] text-ink">Notifications</h1>
        <p className="text-[14px] text-muted">
          Envoie une notification push à tous tes clients abonnés (ceux qui ont activé les rappels).
          Tu peux l&apos;envoyer maintenant ou la programmer.
        </p>
      </div>

      {/* Envoi immédiat */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Envoyer maintenant</MonoLabel>
        <form action={nAction} className="flex flex-col gap-3">
          <Field name="title" label="Titre" placeholder="Nouvelle recette dispo" className="h-11" />
          <TextArea name="body" label="Message" placeholder="Va voir la nouvelle recette dans l'onglet Nutrition." rows={2} />
          <Field name="url" label="Lien à ouvrir (optionnel)" placeholder="/app/nutrition" className="h-11" />
          {nState.error ? <Alert>{nState.error}</Alert> : null}
          {nState.ok ? <Alert tone="info">Envoyée à {nState.sent} appareil(s).</Alert> : null}
          <Button type="submit" loading={nPending} className="self-start h-11">Envoyer maintenant</Button>
        </form>
      </Card>

      {/* Programmation */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Programmer</MonoLabel>
        <form action={sAction} className="flex flex-col gap-3">
          <Field name="title" label="Titre" placeholder="Rappel pesée du dimanche" className="h-11" />
          <TextArea name="body" label="Message" placeholder="N'oublie pas ta pesée hebdo ce matin." rows={2} />
          <Field name="url" label="Lien à ouvrir (optionnel)" placeholder="/app/evolution" className="h-11" />
          <Field name="send_at" label="Date et heure d'envoi" type="datetime-local" className="h-11" />
          {sState.error ? <Alert>{sState.error}</Alert> : null}
          {sState.ok ? <Alert tone="info">Notification programmée.</Alert> : null}
          <Button type="submit" variant="outline" loading={sPending} className="self-start h-11">Programmer</Button>
        </form>
        <p className="text-[12px] text-muted-2">
          Envoi géré une fois par jour par le serveur : la notification part le jour prévu, à peu
          près à l&apos;heure du traitement quotidien (plan actuel). Pour une heure précise, un plan
          Vercel supérieur sera nécessaire.
        </p>
      </Card>

      {/* Programmées en attente */}
      {scheduled.length ? (
        <Card className="flex flex-col gap-3">
          <MonoLabel>Programmées ({scheduled.length})</MonoLabel>
          <div className="flex flex-col gap-2">
            {scheduled.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-control border border-line px-3.5 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-archivo font-semibold text-[14px] text-ink">{s.title}</div>
                  <div className="truncate text-[12px] text-muted-2">{fmt(s.send_at)} · {s.body}</div>
                </div>
                <form action={deleteScheduled}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="tap rounded-control border border-alert-line bg-alert px-3 py-1.5 text-[13px] font-semibold text-alert-ink">
                    Annuler
                  </button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
