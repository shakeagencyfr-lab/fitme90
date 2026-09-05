"use client";

import { useActionState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { handOverClient, type InternalClientState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

/**
 * Passer la main à un client interne : son adresse remplace l'adresse
 * technique, et il devient maître de son compte.
 *
 * L'écran ne montre jamais l'adresse technique. Elle n'a aucun sens pour le
 * coach, et l'afficher ferait croire à une adresse qu'on peut utiliser : le
 * plus sûr est qu'elle n'existe pas à ses yeux.
 *
 * Le lien de connexion rendu après coup n'est pas un détail de confort. Sans
 * lui, le client devrait aller réclamer un courriel de connexion sur un compte
 * dont il ignore l'existence ; avec lui, le coach lui tend son espace pendant
 * qu'il est encore devant lui.
 */
export function ClientHandover({ clientId }: { clientId: string }) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(handOverClient, {} as InternalClientState);

  if (state.ok) {
    return (
      <Card as="section" className="flex flex-col gap-3">
        <div className="font-archivo font-bold text-[16px] text-ink">{tx("Le client a la main")}</div>
        <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
          {tx("Son adresse est enregistrée. Il peut se connecter lui-même et recevra désormais les e-mails de l'application. Tu gardes l'accès à sa fiche et à l'assistance.")}
        </p>
        {state.lien ? (
          <div className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Lien de connexion à lui remettre")}</MonoLabel>
            {/* En lecture seule et sélectionnable d'un clic : ce lien vaut une
                session, on le copie, on ne le retape pas. */}
            <input
              readOnly
              value={state.lien}
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 w-full rounded-control border border-line-4 bg-surface-2 px-3 font-mono text-[12px] text-ink outline-none"
            />
            <p className="text-[12px] leading-[1.5] text-muted-2">
              {tx("À usage unique. S'il expire, le client demandera lui-même un e-mail de connexion depuis la page de connexion.")}
            </p>
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[16px] text-ink">{tx("Compte tenu par toi")}</div>
        <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
          {tx("Ce client n'a pas d'adresse e-mail : il ne reçoit rien et ne se connecte pas seul. C'est toi qui remplis son questionnaire et notes ses séances, par « Assister ce client ». Le jour où il veut son accès, saisis son adresse ici.")}
        </p>
      </div>

      <form action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <label className="flex min-w-[240px] flex-1 flex-col gap-1.5">
          <MonoLabel>{tx("Son adresse e-mail")}</MonoLabel>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="marie.durand@exemple.fr"
            className="h-10 w-full rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
          />
        </label>
        <Button type="submit" loading={saving} className="h-10">{tx("Lui donner la main")}</Button>
        {state.error ? <div className="w-full"><Alert>{state.error}</Alert></div> : null}
      </form>

      <p className="text-[12.5px] leading-[1.6] text-muted-2">
        {tx("Son programme, ses séances et son historique restent les mêmes : il retrouve tout en se connectant. Le règlement encaissé entre vous n'est pas redemandé.")}
      </p>
    </Card>
  );
}
