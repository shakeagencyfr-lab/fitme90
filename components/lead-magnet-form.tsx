"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState } from "react";
import { submitLeadMagnet, type LeadState } from "@/app/c/[slug]/decouverte/actions";
import { GOALS, LEVELS, EQUIPMENTS, GOAL_LABEL, LEVEL_LABEL, EQUIP_LABEL } from "@/lib/lead-magnet";

const field = "w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink";
const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2";

export function LeadMagnetForm({ slug }: { slug: string }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(submitLeadMagnet, {} as LeadState);

  return (
    <form action={action} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <input type="hidden" name="slug" value={slug} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>{tx("Prénom")}</span>
          <input name="name" maxLength={80} placeholder={tx("Ton prénom")} className={field} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{tx("E-mail")}</span>
          <input name="email" type="email" maxLength={160} placeholder={tx("toi@email.com")} className={field} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>{tx("Ton objectif")}</span>
          <select name="goal" defaultValue="forme" className={field}>
            {GOALS.map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{tx("Ton niveau")}</span>
          <select name="level" defaultValue="debutant" className={field}>
            {LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{tx("Séances / semaine")}</span>
          <select name="days" defaultValue="3" className={field}>
            {[2, 3, 4].map((d) => <option key={d} value={d}>{d} {tx("séances")}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{tx("Ton matériel")}</span>
          <select name="equipment" defaultValue="maison" className={field}>
            {EQUIPMENTS.map((e) => <option key={e} value={e}>{EQUIP_LABEL[e]}</option>)}
          </select>
        </label>
        {/* Facultatif, et dit comme tel : sert uniquement à chiffrer la cible
            protéines. Sans lui, on n'annonce aucun chiffre plutôt qu'un chiffre
            moyen qui ne veut rien dire. */}
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={label}>{tx("Ton poids (facultatif)")}</span>
          <input
            name="weight"
            type="number"
            inputMode="numeric"
            min={35}
            max={250}
            placeholder={tx("Ex : 72")}
            className={field}
          />
          <span className="text-[12px] leading-snug text-muted-2">
            {tx("Uniquement pour calculer ta cible de protéines en grammes. Laisse vide si tu préfères.")}</span>
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.5] text-body">
        <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-brand" />
        <span>{tx("J'accepte de recevoir mon mini-programme et des conseils par e-mail. Je peux me désinscrire à tout moment.")}</span>
      </label>

      {state.error ? (
        <div className="rounded-control border border-alert-line bg-alert px-3.5 py-2.5 text-[13.5px] text-alert-ink">{state.error}</div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="tap inline-flex h-12 items-center justify-center gap-2 rounded-btn bg-brand px-6 text-[15px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Un instant…" : "Recevoir mon programme gratuit"}
      </button>
    </form>
  );
}
