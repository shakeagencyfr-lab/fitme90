"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  sendBroadcastNow,
  scheduleBroadcast,
  deleteScheduled,
  previewAudience,
  type NotifState,
} from "@/app/admin/actions";
import { Card, Button, Alert, MonoLabel, Field, TextArea } from "@/components/ui";

interface Scheduled {
  id: string;
  title: string;
  body: string;
  send_at: string;
}

// Miroirs client des options de segmentation (voir lib/audience, server-only).
const SEX_OPTIONS = ["Femme", "Homme", "Autre"];
const GOAL_OPTIONS = [
  "Perte de masse grasse",
  "Prise de muscle",
  "Recomposition",
  "Performance",
  "Santé générale",
];

function fmt(d: string) {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

const selectClass =
  "tap w-full rounded-control border border-line-3 bg-surface px-3 h-11 text-[14px] text-ink outline-none focus:border-ink";

// Filtres de segmentation (sexe, objectif, phase) + aperçu d'audience en direct.
// Les <select> portent les noms filter_* pour être soumis avec le formulaire.
function SegmentFilters() {
  const [sex, setSex] = useState("");
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState("all");
  const [aud, setAud] = useState<{ total: number; withPush: number } | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    const fd = new FormData();
    fd.set("filter_sex", sex);
    fd.set("filter_goal", goal);
    fd.set("filter_phase", phase);
    start(async () => {
      const res = await previewAudience(fd);
      setAud(res);
    });
  }, [sex, goal, phase]);

  const targeted = !!(sex || goal || phase !== "all");

  return (
    <fieldset className="flex flex-col gap-2.5 rounded-control border border-line-2 bg-surface-2 p-3.5">
      <MonoLabel>Cibler un segment (optionnel)</MonoLabel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select name="filter_sex" value={sex} onChange={(e) => setSex(e.target.value)} className={selectClass}>
          <option value="">Sexe : tous</option>
          {SEX_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select name="filter_goal" value={goal} onChange={(e) => setGoal(e.target.value)} className={selectClass}>
          <option value="">Objectif : tous</option>
          {GOAL_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select name="filter_phase" value={phase} onChange={(e) => setPhase(e.target.value)} className={selectClass}>
          <option value="all">Phase : tous</option>
          <option value="active">Programme en cours</option>
          <option value="paid">Ont payé</option>
        </select>
      </div>
      <p className="text-[12.5px] text-muted">
        {aud
          ? targeted
            ? `${aud.total} client(s) ciblé(s), dont ${aud.withPush} avec les notifications activées.`
            : `Tous les clients : ${aud.withPush} recevront la notification (rappels activés).`
          : "Calcul de l'audience…"}
      </p>
    </fieldset>
  );
}

export function NotifAdmin({ scheduled }: { scheduled: Scheduled[] }) {
  const [nState, nAction, nPending] = useActionState(sendBroadcastNow, {} as NotifState);
  const [sState, sAction, sPending] = useActionState(scheduleBroadcast, {} as NotifState);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[26px] tracking-[-0.02em] text-ink">Notifications</h1>
        <p className="text-[14px] text-muted">
          Envoie une notification push à tes clients abonnés (ceux qui ont activé les rappels).
          Tu peux viser tout le monde ou un segment précis (sexe, objectif, phase), l&apos;envoyer
          maintenant ou la programmer.
        </p>
      </div>

      {/* Envoi immédiat */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>Envoyer maintenant</MonoLabel>
        <form action={nAction} className="flex flex-col gap-3">
          <Field name="title" label="Titre" placeholder="Nouvelle recette dispo" className="h-11" />
          <TextArea name="body" label="Message" placeholder="Va voir la nouvelle recette dans l'onglet Nutrition." rows={2} />
          <Field name="url" label="Lien à ouvrir (optionnel)" placeholder="/app/nutrition" className="h-11" />
          <SegmentFilters />
          {nState.error ? <Alert>{nState.error}</Alert> : null}
          {nState.ok ? (
            <Alert tone="info">
              Envoyée à {nState.sent} appareil(s){nState.audience ? ` (${nState.audience} client(s) ciblé(s))` : ""}.
            </Alert>
          ) : null}
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
          <SegmentFilters />
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
