"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState } from "react";
import { saveAnthropicKey, removeAnthropicKey, type ByokState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

interface Props {
  configured: boolean;
  hint: string | null;
  encryptionReady: boolean;
}

export function ByokForm({ configured, hint, encryptionReady }: Props) {
  const tx = usePhrase();
  const [saveState, saveAction, saving] = useActionState(saveAnthropicKey, {} as ByokState);
  const [removeState, removeAction, removing] = useActionState(removeAnthropicKey, {} as ByokState);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Clé Anthropic (BYOK)")}</div>
        <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
          {tx("Ton compte utilise")} <span className="text-body">{tx("ta propre")}</span> {tx("clé Anthropic pour générer les programmes, les recettes et faire fonctionner le coach IA. La clé est chiffrée au repos et n'est jamais réaffichée. Obtiens-la sur")}{" "}
          <span className="font-plex text-body">{tx("console.anthropic.com")}</span>.
        </p>
      </div>

      {!encryptionReady ? (
        <Alert>
          {tx("Le chiffrement des secrets n'est pas configuré sur le serveur (variable SECRETS_ENC_KEY manquante). Impossible d'enregistrer une clé pour l'instant.")}</Alert>
      ) : null}

      <div className="flex items-center gap-2.5 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3">
        <span
          className={[
            "inline-block h-2.5 w-2.5 rounded-full",
            configured ? "bg-brand" : "bg-line-4",
          ].join(" ")}
        />
        <span className="text-[14px] text-body">
          {configured ? (
            <>
              {tx("Clé configurée")}{hint ? <> : <span className="font-plex text-muted">{hint}</span></> : null}.
            </>
          ) : (
            <>{tx("Aucune clé configurée — repli sur la clé d'environnement par défaut.")}</>
          )}
        </span>
      </div>

      <form action={saveAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{configured ? "Remplacer la clé" : "Ta clé Anthropic"}</MonoLabel>
          <input
            type="password"
            name="anthropic_key"
            autoComplete="off"
            placeholder={tx("sk-ant-…")}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 font-plex text-[14px] text-ink outline-none focus:border-ink"
          />
          <span className="text-[12px] text-muted-2">
            {tx("Elle est testée par un petit appel avant d'être enregistrée.")}</span>
        </label>

        {saveState.error ? <Alert>{saveState.error}</Alert> : null}
        {saveState.ok ? (
          <Alert tone="info">{tx("Clé vérifiée et enregistrée. Elle s'applique dès maintenant.")}</Alert>
        ) : null}

        <Button type="submit" loading={saving} className="self-start h-11">
          {configured ? "Mettre à jour la clé" : "Enregistrer la clé"}
        </Button>
      </form>

      {configured ? (
        <form action={removeAction} className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-[13px] text-muted">
            {tx("Supprimer la clé : le compte repassera sur la clé d'environnement par défaut.")}</p>
          {removeState.error ? <Alert>{removeState.error}</Alert> : null}
          {removeState.ok ? <Alert tone="info">{tx("Clé supprimée.")}</Alert> : null}
          <Button type="submit" variant="ghost" loading={removing} className="self-start h-10">
            {tx("Supprimer la clé")}</Button>
        </form>
      ) : null}
    </Card>
  );
}
