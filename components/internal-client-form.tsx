"use client";

import { useActionState, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { addInternalClient, type InternalClientState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

export interface OfferChoice {
  id: string;
  name: string;
  durationMonths: number | null;
}

/**
 * Inscrire un adhérent qui n'a pas d'adresse e-mail, ou pas envie d'en donner.
 *
 * Replié par défaut : la page Clients sert d'abord à consulter, et un
 * formulaire ouvert en permanence en haut d'une liste finit par être du bruit.
 *
 * Le champ e-mail est facultatif, et c'est le coeur de l'écran. On le dit avec
 * des mots plutôt qu'avec une étoile : « Il pourra la donner plus tard » répond
 * à la question que le coach se pose au moment où il hésite à laisser vide.
 */
export function InternalClientForm({
  offers,
  remaining,
}: {
  offers: OfferChoice[];
  /** Places restantes, null si illimité. Affiché seulement quand ça se resserre. */
  remaining: number | null;
}) {
  const tx = usePhrase();
  const [ouvert, setOuvert] = useState(false);
  const [state, action, saving] = useActionState(addInternalClient, {} as InternalClientState);

  if (!ouvert) {
    return (
      <Card as="section" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="font-archivo font-bold text-[16px] text-ink">{tx("Inscrire un client toi-même")}</div>
          <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
            {tx("Pour un adhérent qui n'a pas d'adresse e-mail, ou qui te paie directement. Tu remplis son questionnaire et tu suis ses séances à sa place. Il pourra reprendre la main plus tard.")}
          </p>
        </div>
        <Button type="button" onClick={() => setOuvert(true)} className="h-10 shrink-0">
          {tx("Nouveau client")}
        </Button>
      </Card>
    );
  }

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="font-archivo font-bold text-[16px] text-ink">{tx("Nouveau client")}</div>
          <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
            {tx("Le compte est créé payé : le règlement s'est fait entre vous, aucune demande de paiement ne partira vers ce client.")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="tap shrink-0 text-[13px] font-semibold text-muted-2 hover:text-ink"
        >
          {tx("Annuler")}
        </button>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Nom du client")}</MonoLabel>
            <input
              name="name"
              required
              maxLength={120}
              autoComplete="off"
              placeholder="Marie Durand"
              className="h-10 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("E-mail (facultatif)")}</MonoLabel>
            <input
              name="email"
              type="email"
              autoComplete="off"
              placeholder={tx("Laisse vide, il pourra la donner plus tard")}
              className="h-10 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Programme")}</MonoLabel>
            <select
              name="offer_id"
              defaultValue=""
              className="h-10 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
            >
              <option value="">{tx("Aucun (durée par défaut)")}</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.durationMonths ? `${o.name} (${o.durationMonths} mois)` : o.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Début du programme")}</MonoLabel>
            <input
              name="start_date"
              type="date"
              className="h-10 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>
        </div>

        {state.error ? <Alert>{state.error}</Alert> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving} className="h-10">{tx("Créer le compte")}</Button>
          {remaining != null ? (
            <span className="text-[12.5px] text-muted-2">
              {remaining > 0
                ? `${remaining} place${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""} sur ton palier`
                : "Plus de place sur ton palier"}
            </span>
          ) : null}
        </div>
      </form>

      {/* Ce qui se passe juste après, dit avant de cliquer : sinon le coach
          crée un compte vide et se demande où est le programme. */}
      <p className="text-[12.5px] leading-[1.6] text-muted-2">
        {tx("Ensuite, depuis sa fiche, « Prendre la main » t'ouvre son espace : tu y remplis son questionnaire, tu lances la génération de son programme et tu notes ses séances comme si tu étais lui.")}
      </p>
    </Card>
  );
}
