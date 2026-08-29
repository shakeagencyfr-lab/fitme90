"use client";

import { useActionState } from "react";
import { saveStripeKey, removeStripeKey, type StripeKeyState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

interface Props {
  configured: boolean;
  hint: string | null;
  encryptionReady: boolean;
}

export function StripeKeyForm({ configured, hint, encryptionReady }: Props) {
  const [saveState, saveAction, saving] = useActionState(saveStripeKey, {} as StripeKeyState);
  const [removeState, removeAction, removing] = useActionState(removeStripeKey, {} as StripeKeyState);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Ta clé Stripe</div>
        <p className="max-w-[70ch] text-[13px] leading-[1.6] text-muted">
          Tes clients paient <span className="text-body">directement sur ton compte Stripe</span>,
          avec ta propre clé. La plateforme ne touche jamais l&apos;argent et ne prélève aucune
          commission. Ta clé est chiffrée et n&apos;est jamais réaffichée. Récupère-la sur{" "}
          <span className="font-plex text-body">dashboard.stripe.com/apikeys</span> (clé secrète).
        </p>
      </div>

      {!encryptionReady ? (
        <Alert>
          Le chiffrement des secrets n&apos;est pas configuré sur le serveur (variable
          SECRETS_ENC_KEY manquante). Impossible d&apos;enregistrer une clé pour l&apos;instant.
        </Alert>
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
              Compte Stripe connecté{hint ? <> : <span className="font-plex text-muted">{hint}</span></> : null}. Tu peux
              vendre tes offres.
            </>
          ) : (
            <>Aucune clé Stripe configurée — tu ne peux pas encore encaisser.</>
          )}
        </span>
      </div>

      <form action={saveAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{configured ? "Remplacer la clé" : "Ta clé secrète Stripe"}</MonoLabel>
          <input
            type="password"
            name="stripe_key"
            autoComplete="off"
            placeholder="sk_live_…"
            disabled={!encryptionReady}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 font-plex text-[14px] text-ink outline-none focus:border-ink disabled:opacity-50"
          />
          <span className="text-[12px] text-muted-2">
            Elle est testée par un petit appel avant d&apos;être enregistrée. Astuce : tu peux
            créer une clé restreinte (rk_live_…) limitée aux paiements.
          </span>
        </label>

        {saveState.error ? <Alert>{saveState.error}</Alert> : null}
        {saveState.ok ? (
          <Alert tone="info">Clé vérifiée et enregistrée. Tu peux maintenant vendre tes offres.</Alert>
        ) : null}

        <Button type="submit" loading={saving} disabled={!encryptionReady} className="self-start h-11">
          {configured ? "Mettre à jour la clé" : "Enregistrer la clé"}
        </Button>
      </form>

      {configured ? (
        <form action={removeAction} className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="text-[13px] text-muted">
            Supprimer la clé : tes offres repasseront en « indisponible » et tu ne pourras plus encaisser.
          </p>
          {removeState.error ? <Alert>{removeState.error}</Alert> : null}
          {removeState.ok ? <Alert tone="info">Clé supprimée.</Alert> : null}
          <Button type="submit" variant="ghost" loading={removing} className="self-start h-10">
            Supprimer la clé
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
