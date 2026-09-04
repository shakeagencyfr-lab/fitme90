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
import { PUSH_WINDOWS, windowInstant, nextWindow, preciseScheduling, PRECISE_STEP_MIN } from "@/lib/push-windows";

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

/**
 * Choix du moment d'envoi.
 *
 * Un champ d'heure libre laissait choisir 21 h 15 pour un envoi qui partirait
 * en réalité au premier passage du dispatcher, soit 4 h 30 du matin. Le
 * formulaire mentait. On ne propose donc QUE les créneaux réellement servis.
 *
 * Les heures des crons sont en UTC ; elles sont converties dans le fuseau du
 * navigateur pour l'affichage, ce qui gère l'heure d'été sans y penser.
 */
function SlotPicker() {
  const tx = usePhrase();
  // Rendu serveur : « maintenant » diffère entre le serveur et le client, ce
  // qui ferait diverger le HTML hydraté. On calcule donc au montage.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    queueMicrotask(() => setNow(new Date()));
  }, []);

  const first = now ? nextWindow(now) : null;
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState(0);
  const [time, setTime] = useState("18:00");
  const precise = preciseScheduling();

  useEffect(() => {
    if (!first) return;
    queueMicrotask(() => {
      setDate((d) => d || first.date);
      setSlot((s) => (s ? s : PUSH_WINDOWS.findIndex((w) => w === first.window)));
    });
  }, [first]);

  // En mode précis, l'heure saisie est LOCALE : `new Date("2026-09-04T18:30")`
  // l'interprète dans le fuseau du navigateur, ce qu'on veut. Le hidden envoie
  // ensuite l'instant absolu, donc le serveur n'a aucun fuseau à deviner.
  const chosen = !date
    ? null
    : precise
      ? (() => {
          const d = new Date(`${date}T${time || "18:00"}`);
          return Number.isNaN(d.getTime()) ? null : d;
        })()
      : windowInstant(date, PUSH_WINDOWS[slot] ?? PUSH_WINDOWS[0]);
  const past = !!(chosen && now && chosen.getTime() <= now.getTime());
  const todayISO = now ? new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "";

  function localTime(w: (typeof PUSH_WINDOWS)[number]): string {
    const at = windowInstant(date || todayISO || "2026-01-01", w);
    if (!at) return "";
    return at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex flex-col gap-3 rounded-control border border-line-2 bg-surface-2 p-3.5">
      <MonoLabel>{tx("Quand l'envoyer")}</MonoLabel>
      {/* La valeur soumise est un instant complet : le serveur n'a rien à
          recomposer, et aucune heure non servie ne peut lui parvenir. */}
      <input type="hidden" name="send_at" value={chosen ? chosen.toISOString() : ""} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13.5px] font-medium text-body-2">{tx("Jour")}</span>
          <input
            type="date"
            value={date}
            min={todayISO}
            onChange={(e) => setDate(e.target.value)}
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13.5px] font-medium text-body-2">
            {precise ? tx("Heure d'envoi") : tx("Créneau d'envoi")}
          </span>
          {precise ? (
            // Ordonnanceur à la minute en place : l'heure est libre, au quart
            // d'heure près. `step` cale le sélecteur natif sur la même grille
            // que la garde serveur.
            <input
              type="time"
              step={PRECISE_STEP_MIN * 60}
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={selectClass}
            />
          ) : (
            <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} className={selectClass}>
              {PUSH_WINDOWS.map((w, i) => (
                <option key={`${w.hour}:${w.minute}`} value={i}>
                  {localTime(w)} · {tx(w.role)}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>

      {past ? (
        <Alert>{tx("Ce créneau est déjà passé. Choisis le suivant ou un autre jour.")}</Alert>
      ) : chosen ? (
        <p className="text-[12.5px] leading-[1.55] text-muted">
          {tx("Départ le")}{" "}
          <span className="font-semibold text-ink">
            {chosen.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}{" "}
            {tx("à")} {chosen.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          .
        </p>
      ) : null}

      <p className="text-[12px] leading-[1.55] text-muted-2">
        {tx("Le serveur ne vide la file qu'à ces quatre moments de la journée. Les autres heures ne sont pas proposées parce qu'elles ne partiraient pas à l'heure dite.")}</p>
    </div>
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

          {scheduleMode ? <SlotPicker /> : null}

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
