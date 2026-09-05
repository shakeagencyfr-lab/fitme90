"use client";

import { useState, useTransition } from "react";
import { detachGoogleListing } from "@/app/admin/actions";
import { Alert } from "@/components/ui";

/**
 * Détacher la fiche Google rattachée.
 *
 * L'import était à sens unique : une fois rattaché, on ne pouvait que
 * rattacher une AUTRE fiche. Un coach qui déménage, ferme, ou s'est trompé de
 * fiche gardait donc une adresse et des horaires faux sur sa page publique.
 *
 * La confirmation est en deux temps et dit ce qui part, parce que ce qui part
 * comprend les avis republiés en témoignages : c'est du contenu que le coach a
 * choisi d'afficher, pas un simple identifiant technique.
 */
export function GoogleDetach({ reviewCount }: { reviewCount: number }) {
  const [demande, setDemande] = useState(false);
  const [erreur, setErreur] = useState("");
  const [encours, start] = useTransition();

  if (!demande) {
    return (
      <button
        type="button"
        onClick={() => setDemande(true)}
        className="tap text-[13.5px] font-semibold text-muted-2 underline underline-offset-4 hover:text-ink"
      >
        Détacher
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      {erreur ? <Alert>{erreur}</Alert> : null}
      <p className="text-[13px] leading-[1.6] text-muted">
        Le rattachement, la note, les horaires et le lien Google seront effacés
        {reviewCount > 0 ? `, ainsi que les ${reviewCount} avis repris en témoignages` : ""}. Ton adresse et ton
        téléphone restent : tu as pu les corriger depuis.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={encours}
          onClick={() =>
            start(async () => {
              const res = await detachGoogleListing();
              if (res.error) setErreur(res.error);
              else setDemande(false);
            })
          }
          className="tap inline-flex h-10 items-center rounded-btn bg-alert-ink px-4 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          {encours ? "Un instant…" : "Détacher la fiche"}
        </button>
        <button
          type="button"
          onClick={() => setDemande(false)}
          className="tap inline-flex h-10 items-center rounded-btn border border-line-4 px-4 text-[13.5px] font-semibold text-body hover:border-ink"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
