"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState } from "react";
import { submitLeadMagnet, type LeadState } from "@/app/c/[slug]/decouverte/actions";
import { GOALS, LEVELS, EQUIPMENTS, GOAL_LABEL, LEVEL_LABEL, EQUIP_LABEL } from "@/lib/lead-magnet";

// Hauteur fixe plutôt qu'un padding : sur téléphone, un champ de moins de
// 44 px se rate au doigt, et un `select` natif ne se laisse pas mesurer par son
// contenu. La bordure de focus prend la couleur du coach, comme le reste.
const field =
  "h-12 w-full rounded-control border border-line-4 bg-surface px-3.5 text-[15px] text-ink outline-none transition-colors focus:border-brand";
const label = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2";

export function LeadMagnetForm({ slug }: { slug: string }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(submitLeadMagnet, {} as LeadState);

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-card-lg border border-line bg-surface p-5 shadow-[0_24px_60px_-38px_rgba(23,25,27,0.45)] sm:p-7"
    >
      <div className="flex flex-col gap-1">
        <span className="font-archivo text-[19px] font-extrabold leading-tight tracking-[-0.02em] text-ink">
          {tx("Cinq questions, trente secondes")}
        </span>
        <span className="text-[13px] leading-[1.55] text-muted">
          {tx("Le document est généré tout de suite et part sur ton e-mail.")}
        </span>
      </div>
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
        className="tap press inline-flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-brand px-6 font-archivo text-[15.5px] font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? tx("Un instant…") : tx("Recevoir mon programme gratuit")}
      </button>
    </form>
  );
}
