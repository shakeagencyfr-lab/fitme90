"use client";

import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { changeConsent } from "@/app/app/profil/actions";

// Une ligne d'accord, avec son bouton de retrait.
//
// POURQUOI UNE CONFIRMATION ICI, ALORS QU'ON VIENT D'EN SUPPRIMER UNE AILLEURS.
// La règle n'est pas « jamais de confirmation », c'est « pas de confirmation
// pour un geste sans conséquence ». Entrer en assistance ne casse rien. Retirer
// son accord santé arrête la génération du programme et le Coach IA : la
// personne doit lire CE QUE ÇA FAIT avant, pas le découvrir après.
//
// Et ce n'est pas une fenêtre native : le texte de la conséquence y serait
// illisible, et on ne peut pas y mettre en forme ce qui compte.

export function ConsentRow({
  kind,
  label,
  explainer,
  grantedAt,
  withdrawnAt,
  version,
  effect,
  withdrawable,
}: {
  kind: string;
  label: string;
  explainer: string;
  grantedAt: string | null;
  withdrawnAt: string | null;
  version: string | null;
  effect?: string;
  withdrawable: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const retire = Boolean(withdrawnAt);

  return (
    <div className="flex flex-col gap-2 border-t border-line-2 py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-archivo text-[15px] font-bold text-ink">{label}</span>
            {retire ? (
              <span className="rounded-pill bg-alert px-2 py-0.5 text-[11px] font-semibold text-alert-ink">
                Retiré le {fr(withdrawnAt)}
              </span>
            ) : grantedAt ? (
              <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                Accepté le {fr(grantedAt)}
              </span>
            ) : (
              <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted-2">
                Pas encore enregistré
              </span>
            )}
          </span>
          <p className="max-w-[62ch] text-[13.5px] leading-relaxed text-muted">{explainer}</p>
        </div>
        {withdrawable && !confirming ? (
          <form action={changeConsent} className="shrink-0">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="op" value={retire ? "grant" : "withdraw"} />
            {retire ? (
              <Button type="submit" variant="outline" className="h-10">
                Redonner mon accord
              </Button>
            ) : (
              <Button type="button" variant="outline" className="h-10" onClick={() => setConfirming(true)}>
                Retirer
              </Button>
            )}
          </form>
        ) : null}
      </div>

      {version && !retire ? (
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-2">
          Version du texte : {version}
        </span>
      ) : null}

      {confirming ? (
        <div className="flex flex-col gap-3 rounded-card border border-alert-line bg-alert p-3.5">
          {effect ? <Alert>{effect}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <form action={changeConsent}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="op" value="withdraw" />
              <Button type="submit" variant="danger" className="h-10">
                Retirer mon accord
              </Button>
            </form>
            <Button type="button" variant="ghost" className="h-10" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function fr(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
