"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { deleteMyAccount, type DeleteAccountState } from "@/app/admin/actions";
import { Alert, Card, Button } from "@/components/ui";

// Zone dangereuse : résiliation totale + suppression irréversible du compte
// coach (lui, ses clients, toutes les données). Double garde : ouverture
// explicite + saisie exacte de « SUPPRIMER ».
export function DeleteAccountCard() {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(deleteMyAccount, {} as DeleteAccountState);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <Card className="flex flex-col gap-3 border-alert-line bg-alert/40">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[16px] text-alert-ink">{tx("Résilier et supprimer mon compte")}</div>
        <p className="text-[13px] leading-[1.6] text-body">
          {tx("Résiliation totale et")} <span className="font-semibold">{tx("définitive")}</span> {tx(": ton abonnement est coupé, et ton compte ainsi que")} <span className="font-semibold">{tx("tous tes clients et leurs données")}</span> {tx("sont supprimés. Cette action est")} <span className="font-semibold">{tx("irréversible")}</span>.
        </p>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap self-start rounded-btn border border-alert-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-alert-ink hover:border-brand"
        >
          {tx("Résilier définitivement")}</button>
      ) : (
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] text-body">
              {tx("Pour confirmer, tape")} <span className="font-mono font-semibold text-alert-ink">SUPPRIMER</span> :
            </span>
            <input
              name="confirm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="SUPPRIMER"
              className="w-full max-w-[280px] rounded-control border border-alert-line bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-alert-ink"
            />
          </label>

          {state.error ? <Alert>{state.error}</Alert> : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              variant="danger"
              loading={pending}
              disabled={text.trim() !== "SUPPRIMER"}
              className="h-11"
            >
              {tx("Tout supprimer définitivement")}</Button>
            <button
              type="button"
              onClick={() => { setOpen(false); setText(""); }}
              className="tap rounded-btn border border-line-4 bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-body hover:border-ink"
            >
              {tx("Annuler")}</button>
          </div>
        </form>
      )}
    </Card>
  );
}
