"use client";

import { usePhrase } from "@/components/locale-provider";

import { useTransition, useActionState, useState } from "react";
import { saveSmtp, removeSmtp, sendTestEmail, type SmtpState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

interface Props {
  enabled: boolean;
  priceCents: number | null;
  smtp: { configured: boolean; host: string | null; from: string | null };
  encryptionReady: boolean;
}

// Panneau marque blanche (côté coach) : souscription de l'upsell si pas encore
// débloqué, puis configuration du SMTP perso une fois l'option active.
export function WhitelabelPanel({ enabled, priceCents, smtp, encryptionReady }: Props) {
  const tx = usePhrase();
  if (!enabled) {
    return (
      <Card as="section" className="flex flex-col gap-3">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Marque blanche complète")}</div>
        {priceCents != null ? (
          <>
            <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
              {tx("Débloque ton")} <span className="text-body">{tx("domaine personnalisé")}</span> {tx("(ton propre nom de domaine via CNAME) et l'")}<span className="text-body">{tx("envoi d'e-mails depuis ton serveur")}</span>{" "}
              {tx("(SMTP), pour une expérience 100 % à ta marque.")}</p>
            <SubscribeButton priceLabel={`${(priceCents / 100).toFixed(2)} €/mois`} />
          </>
        ) : (
          <p className="text-[13px] text-muted">
            {tx("Ton revendeur ne propose pas encore cette option. Contacte-le pour l'activer.")}</p>
        )}
      </Card>
    );
  }

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand" />
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Marque blanche active")}</div>
      </div>
      <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
        {tx("Ton domaine personnalisé est débloqué (ci-dessus). Configure ici l'envoi d'e-mails depuis")} <span className="text-body">{tx("ton")}</span> {tx("serveur SMTP — tes clients recevront des e-mails à ta marque.")}</p>
      <SmtpForm smtp={smtp} encryptionReady={encryptionReady} />
    </Card>
  );
}

function SubscribeButton({ priceLabel }: { priceLabel: string }) {
  const tx = usePhrase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function go() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/whitelabel-checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Paiement indisponible.");
    } catch {
      setError("Réseau indisponible. Réessaie.");
    }
    setLoading(false);
  }
  return (
    <div className="flex flex-col gap-1">
      <Button type="button" onClick={go} loading={loading} className="self-start h-11">
        {tx("Activer —")} {priceLabel}
      </Button>
      {error ? <span className="text-[12px] text-[#C4471A]">{error}</span> : null}
    </div>
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
            <>{tx("Aucun SMTP — les e-mails partent du service par défaut.")}</>
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
