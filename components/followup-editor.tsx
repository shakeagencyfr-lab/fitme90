"use client";

import { useActionState, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { saveFollowupCopy, type FollowupCopyState } from "@/app/admin/actions";
import { Alert, Button, MonoLabel } from "@/components/ui";
import { FOLLOWUP_STEPS, FOLLOWUP_TOKENS, type FollowupCopy, type FollowupCopyMap } from "@/lib/prospect-followup";

/**
 * Les trois relances, telles que le coach peut les réécrire.
 *
 * PRÉREMPLI, JAMAIS VIDE. Une page blanche donne un message bâclé ou pas de
 * message du tout ; ici, le coach lit ce qui part en son nom aujourd'hui et
 * décide s'il le garde. C'est aussi la seule façon de rendre la séquence
 * honnête : personne ne devrait envoyer à ses prospects un texte qu'il n'a
 * jamais lu.
 *
 * Ce qui n'est PAS modifiable est montré quand même, en gris, autour du champ :
 * la salutation, la signature et le lien de désabonnement. Le coach doit voir
 * le message entier, y compris ce qu'il ne peut pas toucher, sinon il écrit un
 * texte qui se terminera autrement qu'il ne l'imagine.
 */
export function FollowupEditor({
  defaults,
  saved,
  brand,
}: {
  /** Textes d'origine, dans la langue du compte. */
  defaults: FollowupCopy[];
  /** Textes déjà enregistrés, par étape. Une étape absente garde l'original. */
  saved: FollowupCopyMap;
  /** Nom de la marque, pour montrer la signature réelle. */
  brand: string;
}) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveFollowupCopy, {} as FollowupCopyState);

  const [copies, setCopies] = useState<FollowupCopy[]>(() =>
    FOLLOWUP_STEPS.map((s, i) => ({
      subject: saved[s.step]?.subject || defaults[i].subject,
      body: saved[s.step]?.body || defaults[i].body,
    })),
  );

  const set = (i: number, champ: keyof FollowupCopy, v: string) =>
    setCopies((p) => p.map((c, j) => (j === i ? { ...c, [champ]: v } : c)));

  const reset = (i: number) => setCopies((p) => p.map((c, j) => (j === i ? { ...defaults[i] } : c)));

  const modifie = (i: number) =>
    copies[i].subject !== defaults[i].subject || copies[i].body !== defaults[i].body;

  return (
    <form action={action} className="flex flex-col gap-4 border-t border-line-2 pt-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo text-[15px] font-bold text-ink">{tx("Ce que reçoivent tes prospects")}</div>
        <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
          {tx("Les trois messages partent en ton nom. Relis-les, réécris-les si le ton ne te ressemble pas.")}{" "}
          {tx("La salutation, ta signature et le lien de désabonnement sont ajoutés automatiquement : un e-mail de prospection sans lien de retrait n'est pas légal.")}
        </p>
        <p className="text-[12.5px] leading-[1.6] text-muted-2">
          {tx("Trois raccourcis remplacés à l'envoi :")}{" "}
          {FOLLOWUP_TOKENS.map((j, i) => (
            <span key={j}>
              {i > 0 ? ", " : ""}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[11.5px] text-body">{j}</code>
            </span>
          ))}
          . {tx("Un raccourci mal écrit reste visible tel quel dans l'e-mail, plutôt que de laisser un trou.")}
        </p>
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">{tx("Messages enregistrés.")}</Alert> : null}

      {FOLLOWUP_STEPS.map((s, i) => (
        <section key={s.step} className="flex flex-col gap-2.5 rounded-card border border-line bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
              {tx("Message")} {s.step} · {tx("envoyé")} J+{s.afterDays}
            </span>
            {modifie(i) ? (
              <button
                type="button"
                onClick={() => reset(i)}
                className="text-[12.5px] font-semibold text-brand hover:underline"
              >
                {tx("Revenir au texte d'origine")}
              </button>
            ) : (
              <span className="text-[12px] text-muted-2">{tx("Texte d'origine")}</span>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Objet")}</MonoLabel>
            <input
              name={`subject_${s.step}`}
              value={copies[i].subject}
              onChange={(e) => set(i, "subject", e.target.value)}
              maxLength={200}
              className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Message")}</MonoLabel>
            {/* Le cadre non modifiable, au-dessus et en dessous du champ : le
                coach voit le message tel qu'il arrivera, pas seulement le
                fragment qu'il peut changer. */}
            <span className="text-[13px] text-muted-2">{tx("Salut")} {"{prenom}"},</span>
            <textarea
              name={`body_${s.step}`}
              value={copies[i].body}
              onChange={(e) => set(i, "body", e.target.value)}
              rows={7}
              maxLength={4000}
              className="w-full resize-y rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] leading-[1.6] text-ink outline-none focus:border-ink"
            />
            <span className="text-[13px] leading-[1.6] text-muted-2">
              {brand}
              <br />
              {tx("Pour ne plus recevoir ces messages : [lien de désabonnement]")}
            </span>
          </div>
        </section>
      ))}

      <Button loading={saving} className="self-start">
        {tx("Enregistrer les messages")}
      </Button>
    </form>
  );
}
