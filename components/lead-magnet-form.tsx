"use client";

import { useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { submitLeadMagnet, type LeadState } from "@/app/c/[slug]/decouverte/actions";
import { useActionState } from "react";
import {
  GOALS, LEVELS, EQUIPMENTS, DURATIONS, FOCUSES, CONCERNS, SEXES, ACTIVITIES,
  GOAL_LABEL, LEVEL_LABEL, EQUIP_LABEL, DURATION_LABEL, FOCUS_LABEL, CONCERN_LABEL, SEX_LABEL, ACTIVITY_LABEL,
} from "@/lib/lead-magnet-types";

/**
 * Le questionnaire, en trois écrans.
 *
 * POURQUOI PAS UN SEUL FORMULAIRE. Douze questions d'affilée, c'est un mur :
 * on voit la longueur avant de voir l'intérêt, et on ferme. Découpé, chaque
 * écran tient dans un regard, la barre de progression montre que c'est court,
 * et l'engagement déjà pris pousse à finir.
 *
 * TOUS LES CHAMPS RESTENT DANS LE DOM, cachés plutôt que démontés : c'est un
 * seul formulaire, donc un seul envoi, et rien ne se perd si on revient en
 * arrière. `hidden` sur le bloc, pas de conditionnel React.
 *
 * L'ordre n'est pas neutre. Les questions d'entraînement d'abord, parce
 * qu'elles sont faciles et qu'elles montrent ce qu'on va calibrer. Les mesures
 * personnelles ensuite, quand la personne a compris à quoi elles servent.
 * L'adresse e-mail en dernier, une fois la valeur visible.
 */

const field =
  "h-12 w-full rounded-control border border-line-4 bg-surface px-3.5 text-[15px] text-ink outline-none transition-colors focus:border-brand";
const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2";

/** Un choix en pastilles : plus rapide au doigt qu'un menu déroulant. */
function Choix<T extends string | number>({
  name,
  value,
  onChange,
  options,
  labels,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<string, string>;
}) {
  return (
    <>
      <input type="hidden" name={name} value={String(value)} />
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            aria-pressed={value === o}
            className={[
              "tap rounded-control border px-3 py-2 text-[13.5px] font-semibold transition-colors",
              value === o
                ? "border-brand bg-brand/10 text-brand"
                : "border-line-4 text-body hover:border-ink",
            ].join(" ")}
          >
            {labels[String(o)]}
          </button>
        ))}
      </div>
    </>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={label}>{titre}</span>
      {children}
    </div>
  );
}

const JOURS = [2, 3, 4, 5, 6] as const;
const JOURS_LABEL: Record<string, string> = { 2: "2", 3: "3", 4: "4", 5: "5", 6: "6" };

export function LeadMagnetForm({ slug }: { slug: string }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(submitLeadMagnet, {} as LeadState);
  const [etape, setEtape] = useState(0);

  const [goal, setGoal] = useState<(typeof GOALS)[number]>("forme");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("debutant");
  const [days, setDays] = useState<number>(3);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(45);
  const [equipment, setEquipment] = useState<(typeof EQUIPMENTS)[number]>("maison");
  const [focus, setFocus] = useState<(typeof FOCUSES)[number]>("equilibre");
  const [concern, setConcern] = useState<(typeof CONCERNS)[number]>("aucune");
  const [sex, setSex] = useState<(typeof SEXES)[number]>("nsp");
  const [activity, setActivity] = useState<(typeof ACTIVITIES)[number]>("sedentaire");

  const total = 3;

  return (
    <form
      action={action}
      className="flex flex-col gap-5 rounded-card-lg border border-line bg-surface p-5 shadow-[0_24px_60px_-38px_rgba(23,25,27,0.45)] sm:p-7"
    >
      <input type="hidden" name="slug" value={slug} />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-archivo text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
            {etape === 0 ? tx("Ton entraînement") : etape === 1 ? tx("Ta pratique") : tx("Tes mesures")}
          </span>
          <span className="font-mono text-[11px] text-muted-2">{etape + 1}/{total}</span>
        </div>
        {/* La barre montre que c'est court. Sans elle, un formulaire en trois
            écrans paraît plus long qu'un formulaire d'un seul tenant. */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300"
            style={{ width: `${((etape + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* ───────────────────────── 1. entraînement ───────────────────────── */}
      <div hidden={etape !== 0} className="flex flex-col gap-4">
        <Bloc titre={tx("Ton objectif")}>
          <Choix name="goal" value={goal} onChange={setGoal} options={GOALS} labels={GOAL_LABEL} />
        </Bloc>
        <Bloc titre={tx("Ton niveau")}>
          <Choix name="level" value={level} onChange={setLevel} options={LEVELS} labels={LEVEL_LABEL} />
        </Bloc>
        <Bloc titre={tx("Séances par semaine")}>
          <Choix name="days" value={days} onChange={setDays} options={JOURS} labels={JOURS_LABEL} />
        </Bloc>
        <Bloc titre={tx("Temps par séance")}>
          <Choix name="duration" value={duration} onChange={setDuration} options={DURATIONS} labels={DURATION_LABEL as unknown as Record<string, string>} />
          <span className="text-[12px] leading-snug text-muted-2">
            {tx("C'est ce créneau qui décide du nombre d'exercices. Une séance qui déborde ne se fait pas.")}
          </span>
        </Bloc>
      </div>

      {/* ───────────────────────────── 2. pratique ───────────────────────── */}
      <div hidden={etape !== 1} className="flex flex-col gap-4">
        <Bloc titre={tx("Ton matériel")}>
          <Choix name="equipment" value={equipment} onChange={setEquipment} options={EQUIPMENTS} labels={EQUIP_LABEL} />
        </Bloc>
        <Bloc titre={tx("Une zone à privilégier ?")}>
          <Choix name="focus" value={focus} onChange={setFocus} options={FOCUSES} labels={FOCUS_LABEL} />
        </Bloc>
        <Bloc titre={tx("Une gêne articulaire ?")}>
          <Choix name="concern" value={concern} onChange={setConcern} options={CONCERNS} labels={CONCERN_LABEL} />
          <span className="text-[12px] leading-snug text-muted-2">
            {tx("Les mouvements qui chargent cette articulation seront écartés et remplacés. Ce n'est pas un avis médical : en cas de douleur, consulte.")}
          </span>
        </Bloc>
      </div>

      {/* ───────────────────────────── 3. mesures ────────────────────────── */}
      <div hidden={etape !== 2} className="flex flex-col gap-4">
        <Bloc titre={tx("Sexe")}>
          <Choix name="sex" value={sex} onChange={setSex} options={SEXES} labels={SEX_LABEL} />
        </Bloc>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className={label}>{tx("Âge")}</span>
            <input name="age" type="number" inputMode="numeric" min={14} max={99} placeholder="32" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>{tx("Taille (cm)")}</span>
            <input name="height" type="number" inputMode="numeric" min={120} max={230} placeholder="175" className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>{tx("Poids (kg)")}</span>
            <input name="weight" type="number" inputMode="numeric" min={35} max={250} placeholder="72" className={field} />
          </label>
        </div>
        <Bloc titre={tx("Ton quotidien, hors sport")}>
          <Choix name="activity" value={activity} onChange={setActivity} options={ACTIVITIES} labels={ACTIVITY_LABEL} />
        </Bloc>
        {/* Dire à quoi servent les mesures, et ce qu'on perd sans elles. Sans
            cette phrase, elles passent pour de la collecte gratuite. */}
        <span className="rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[12.5px] leading-[1.55] text-muted">
          {tx("Ces quatre réponses servent à calculer tes calories, tes protéines, tes lipides, tes glucides et ton eau. Sans elles, le document ne les annonce pas : un chiffre bâti sur une moyenne serait faux pour toi.")}
        </span>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>{tx("Prénom")}</span>
            <input name="name" maxLength={80} placeholder={tx("Ton prénom")} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>{tx("E-mail")}</span>
            <input name="email" type="email" maxLength={160} placeholder={tx("toi@email.com")} className={field} />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.5] text-body">
          <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-brand" />
          <span>{tx("J'accepte de recevoir mon mini-programme et des conseils par e-mail. Je peux me désinscrire à tout moment.")}</span>
        </label>
      </div>

      {state.error ? (
        <div className="rounded-control border border-alert-line bg-alert px-3.5 py-2.5 text-[13.5px] text-alert-ink">{state.error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {etape > 0 ? (
          <button
            type="button"
            onClick={() => setEtape((e) => e - 1)}
            className="tap inline-flex h-12 items-center justify-center rounded-btn border border-line-4 px-4 text-[14.5px] font-semibold text-body hover:border-ink"
          >
            {tx("Retour")}
          </button>
        ) : null}
        {etape < total - 1 ? (
          <button
            type="button"
            onClick={() => setEtape((e) => e + 1)}
            className="tap press inline-flex h-12 flex-1 items-center justify-center rounded-btn bg-brand px-6 font-archivo text-[15.5px] font-bold text-white transition-colors hover:bg-brand-hover"
          >
            {tx("Continuer")}
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="tap press inline-flex h-12 flex-1 items-center justify-center rounded-btn bg-brand px-6 font-archivo text-[15.5px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
          >
            {pending ? tx("Un instant…") : tx("Recevoir mon programme gratuit")}
          </button>
        )}
      </div>
    </form>
  );
}
