"use client";

import { usePhrase } from "@/components/locale-provider";

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
  const tx = usePhrase();
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
      <MonoLabel>{tx("Cibler un segment (optionnel)")}</MonoLabel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select name="filter_sex" value={sex} onChange={(e) => setSex(e.target.value)} className={selectClass}>
          <option value="">{tx("Sexe : tous")}</option>
          {SEX_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select name="filter_goal" value={goal} onChange={(e) => setGoal(e.target.value)} className={selectClass}>
          <option value="">{tx("Objectif : tous")}</option>
          {GOAL_OPTIONS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select name="filter_phase" value={phase} onChange={(e) => setPhase(e.target.value)} className={selectClass}>
          <option value="all">{tx("Phase : tous")}</option>
          <option value="active">{tx("Programme en cours")}</option>
          <option value="paid">{tx("Ont payé")}</option>
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
  const tx = usePhrase();
  const [scheduleMode, setScheduleMode] = useState(false);
  const [nState, nAction, nPending] = useActionState(sendBroadcastNow, {} as NotifState);
  const [sState, sAction, sPending] = useActionState(scheduleBroadcast, {} as NotifState);
  const state = scheduleMode ? sState : nState;
  const pending = scheduleMode ? sPending : nPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-archivo font-extrabold text-[26px] tracking-[-0.02em] text-ink">{tx("Notifications")}</h1>
        <p className="text-[14px] text-muted">
          {tx("Envoie une notification push à tes clients abonnés (ceux qui ont activé les rappels). Tu peux viser tout le monde ou un segment précis, l'envoyer tout de suite ou la programmer.")}</p>
      </div>

      {/* Carte unique : les deux formulaires dupliquaient titre, message, lien
          et segment. La case « Programmer » choisit simplement la destination. */}
      <Card className="flex flex-col gap-3">
        <MonoLabel>{scheduleMode ? tx("Programmer une notification") : tx("Envoyer une notification")}</MonoLabel>
        <form action={scheduleMode ? sAction : nAction} className="flex flex-col gap-3">
          <Field name="title" label={tx("Titre")} placeholder={tx("Nouvelle recette dispo")} className="h-11" />
          <TextArea name="body" label={tx("Message")} placeholder={tx("Va voir la nouvelle recette dans l'onglet Nutrition.")} rows={2} />
          <Field name="url" label={tx("Lien à ouvrir (optionnel)")} placeholder={tx("/app/nutrition")} className="h-11" />
          <SegmentFilters />

          <label className="tap flex items-start gap-2.5 rounded-control border border-line-3 bg-surface-2 p-3.5">
            <input
              type="checkbox"
              checked={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.checked)}
              className="mt-0.5 size-4 accent-brand"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-[14px] text-ink">{tx("Programmer l'envoi")}</span>
              <span className="text-[12px] text-muted-2">
                {tx("Décoché, la notification part immédiatement.")}</span>
            </span>
          </label>

          {scheduleMode ? (
            <>
              <Field name="send_at" label={tx("Date et heure d'envoi")} type="datetime-local" className="h-11" />
              <p className="text-[12px] leading-relaxed text-muted-2">
                {tx("Le serveur vide la file toutes les heures : la notification part à l'heure pleine qui suit la date choisie.")}</p>
            </>
          ) : null}

          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.ok ? (
            <Alert tone="info">
              {scheduleMode
                ? tx("Notification programmée.")
                : `${tx("Envoyée à")} ${state.sent} ${tx("appareil(s)")}${state.audience ? ` (${state.audience} client(s) ciblé(s))` : ""}.`}
            </Alert>
          ) : null}

          <Button type="submit" loading={pending} className="self-start h-11">
            {scheduleMode ? tx("Programmer") : tx("Envoyer maintenant")}
          </Button>
        </form>
      </Card>

      {/* Programmées en attente */}
      {scheduled.length ? (
        <Card className="flex flex-col gap-3">
          <MonoLabel>{tx("Programmées (")}{scheduled.length})</MonoLabel>
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
                    {tx("Annuler")}</button>
                </form>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
