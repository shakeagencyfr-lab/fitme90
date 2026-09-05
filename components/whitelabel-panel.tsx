"use client";

import { usePhrase } from "@/components/locale-provider";

import { useTransition, useActionState, useState } from "react";
import {
  saveSmtp,
  removeSmtp,
  sendTestEmail,
  buyWhitelabelPack,
  toggleHidePoweredBy,
  type SmtpState,
  type PoweredByState,
} from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { formatEuros } from "@/lib/config";
import type { WhitelabelSource } from "@/lib/whitelabel-rules";

interface Props {
  allowed: boolean;
  source: WhitelabelSource;
  priceCents: number | null;
  hidePoweredBy: boolean;
  /** Nom qui s'affiche dans le badge « Propulsé par » tant qu'il est là. */
  poweredByName: string;
  smtp: { configured: boolean; host: string | null; from: string | null };
  encryptionReady: boolean;
  erreur?: boolean;
}

/**
 * Panneau du pack marque blanche, côté coach.
 *
 * Sans le pack : ce qu'il contient, le prix, le bouton. Avec : d'où il vient
 * (palier ou abonnement), la case du badge, et le SMTP. Le domaine se règle
 * plus haut dans le studio, qui se déverrouille en même temps.
 */
export function WhitelabelPanel({ allowed, source, priceCents, hidePoweredBy, poweredByName, smtp, encryptionReady, erreur }: Props) {
  const tx = usePhrase();
  if (!allowed) {
    return (
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Pack marque blanche")}</span>
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Fais disparaître notre marque derrière la tienne")}</div>
        </div>
        <PackContents />
        {priceCents != null ? (
          <SubscribeForm priceCents={priceCents} erreur={erreur} />
        ) : (
          <p className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[13px] leading-[1.6] text-muted">
            {tx("Ton revendeur ne propose pas encore ce pack. Parle-lui-en : il peut l'inclure dans ton palier ou le vendre à part, depuis son tableau de bord.")}
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Pack marque blanche actif")}</div>
        </div>
        <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
          {source === "plan"
            ? tx("Inclus dans ton palier. Ton domaine personnalisé est débloqué ci-dessus, ton site de présentation dans Mon site, et l'application s'installe à ton nom et à ton icône.")
            : source === "addon"
              ? tx("Souscrit auprès de ton revendeur. Ton domaine personnalisé est débloqué ci-dessus, ton site de présentation dans Mon site, et l'application s'installe à ton nom et à ton icône.")
              : tx("Ton domaine personnalisé est débloqué ci-dessus, ton site de présentation dans Mon site, et l'application s'installe à ton nom et à ton icône.")}
        </p>
      </div>

      <PoweredByForm hidden={hidePoweredBy} poweredByName={poweredByName} />

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <div className="font-archivo font-bold text-[15px] text-ink">{tx("E-mails depuis ton serveur")}</div>
        <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
          {tx("Configure ici l'envoi d'e-mails depuis ton serveur SMTP : tes clients recevront leurs e-mails de ton adresse, à ta marque.")}
        </p>
        <SmtpForm smtp={smtp} encryptionReady={encryptionReady} />
      </div>
    </Card>
  );
}

function PackContents() {
  const tx = usePhrase();
  const items = [
    tx("Ton propre nom de domaine (CNAME) sur ta page de vente et l'espace de tes clients."),
    tx("Des e-mails envoyés depuis ton serveur (SMTP), à ton adresse."),
    tx("Un site de présentation à ton adresse, rempli depuis ta fiche Google."),
    tx("L'application installée au nom et à l'icône de ta marque, et le badge « Propulsé par » retiré de ta page."),
  ];
  return (
    <ul className="flex flex-col gap-2">
      {items.map((a) => (
        <li key={a} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-body">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0 text-brand" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {a}
        </li>
      ))}
    </ul>
  );
}

function SubscribeForm({ priceCents, erreur }: { priceCents: number; erreur?: boolean }) {
  const tx = usePhrase();
  const [envoi, setEnvoi] = useState(false);
  return (
    <form action={buyWhitelabelPack} onSubmit={() => setEnvoi(true)} className="flex flex-col gap-2">
      <input type="hidden" name="return_to" value="marque-blanche" />
      <Button type="submit" loading={envoi} className="h-11 self-start">
        {tx("Activer le pack pour")} {formatEuros(priceCents)}{tx(" / mois")}
      </Button>
      <span className="text-[12px] text-muted-2">
        {tx("Abonnement mensuel auprès de ton revendeur, résiliable quand tu veux. Tes réglages restent enregistrés et se rallument tels quels si tu reviens.")}
      </span>
      {erreur ? (
        <span className="text-[12.5px] text-[#C4471A]">
          {tx("Le paiement n'a pas pu démarrer. Réessaie, ou préviens ton revendeur si cela persiste.")}
        </span>
      ) : null}
    </form>
  );
}

/** La case qui retire le badge « Propulsé par » du pied de la page publique. */
function PoweredByForm({ hidden, poweredByName }: { hidden: boolean; poweredByName: string }) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(toggleHidePoweredBy, {} as PoweredByState);
  const [checked, setChecked] = useState(hidden);
  return (
    <form action={action} className="flex flex-col gap-2 rounded-control border border-line-4 bg-surface-2 p-3.5">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="checkbox" name="hidden" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-ink">{tx("Retirer le badge « Propulsé par")} {poweredByName} {tx("» de ma page")}</span>
          <span className="text-[12px] leading-[1.5] text-muted-2">
            {tx("Le pied de ta page publique ne mentionne plus personne d'autre que toi.")}
          </span>
        </span>
      </label>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">{tx("Enregistré.")}</Alert> : null}
      <Button type="submit" variant="outline" loading={saving} className="h-9 self-start">{tx("Enregistrer")}</Button>
    </form>
  );
}

function SmtpForm({ smtp, encryptionReady }: { smtp: Props["smtp"]; encryptionReady: boolean }) {
  const tx = usePhrase();
  const [saveState, saveAction, saving] = useActionState(saveSmtp, {} as SmtpState);
  const [removeState, removeAction, removing] = useActionState(async () => removeSmtp(), {} as SmtpState);

  return (
    <div className="flex flex-col gap-3">
      {!encryptionReady ? (
        <Alert>{tx("Le chiffrement des secrets n'est pas configuré côté serveur (SECRETS_ENC_KEY).")}</Alert>
      ) : null}

      <div className="flex items-center gap-2.5 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3">
        <span className={["inline-block h-2.5 w-2.5 rounded-full", smtp.configured ? "bg-brand" : "bg-line-4"].join(" ")} />
        <span className="text-[14px] text-body">
          <TestEmailButton />
      {smtp.configured ? (
            <>{tx("SMTP configuré")}{smtp.host ? <> : <span className="font-plex text-muted">{smtp.host}</span></> : null}.</>
          ) : (
            <>{tx("Aucun SMTP : les e-mails partent du service par défaut.")}</>
          )}
        </span>
      </div>

      <form action={saveAction} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Serveur (hôte)")}</MonoLabel>
          <input name="host" placeholder={tx("smtp.gmail.com")} className="h-10 rounded-control border border-line-4 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Port")}</MonoLabel>
          <input name="port" type="number" defaultValue={587} placeholder="587" className="h-10 rounded-control border border-line-4 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Identifiant")}</MonoLabel>
          <input name="user" autoComplete="off" placeholder={tx("contact@mondomaine.com")} className="h-10 rounded-control border border-line-4 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Mot de passe")}</MonoLabel>
          <input name="pass" type="password" autoComplete="off" placeholder="••••••••" className="h-10 rounded-control border border-line-4 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <MonoLabel>{tx("Adresse d'envoi (From)")}</MonoLabel>
          <input name="from" placeholder={tx("Mon Coaching <contact@mondomaine.com>")} className="h-10 rounded-control border border-line-4 bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink" />
        </label>

        {saveState.error ? <div className="sm:col-span-2"><Alert>{saveState.error}</Alert></div> : null}
        {saveState.ok ? <div className="sm:col-span-2"><Alert tone="info">{tx("SMTP vérifié et enregistré.")}</Alert></div> : null}
        <div className="sm:col-span-2">
          <Button type="submit" loading={saving} className="h-11">{tx("Tester & enregistrer")}</Button>
        </div>
      </form>

      {smtp.configured ? (
        <form action={removeAction} className="border-t border-line pt-3">
          {removeState.ok ? <Alert tone="info">{tx("SMTP supprimé.")}</Alert> : null}
          <Button type="submit" variant="ghost" loading={removing} className="h-10">{tx("Supprimer le SMTP")}</Button>
        </form>
      ) : null}
    </div>
  );
}

/** Envoie un e-mail de test au coach (SMTP perso, sinon service par défaut). */
function TestEmailButton() {
  const tx = usePhrase();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ ok: boolean; error?: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        loading={pending}
        className="h-10"
        onClick={() => start(async () => setRes(await sendTestEmail()))}
      >
        {tx("M'envoyer un e-mail de test")}</Button>
      {res?.ok ? <span className="text-[13px] text-muted">{tx("E-mail envoyé, regarde ta boîte (et les indésirables).")}</span> : null}
      {res && !res.ok ? <span className="text-[13px] text-[#C4471A]">{res.error}</span> : null}
    </div>
  );
}
