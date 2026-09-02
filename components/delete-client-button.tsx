"use client";

import { usePhrase } from "@/components/locale-provider";

import { useState } from "react";
import { deleteClient } from "@/app/admin/actions";

// Supprime définitivement un client (données + compte), avec confirmation en
// deux temps : il faut retaper « SUPPRIMER » pour éviter tout accident.
export function DeleteClientButton({ clientId, name }: { clientId: string; name: string }) {
  const tx = usePhrase();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const ok = confirm.trim().toUpperCase() === "SUPPRIMER";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap self-start rounded-btn border border-alert-line bg-alert px-4 py-2.5 text-[13.5px] font-semibold text-alert-ink hover:border-brand"
      >
        {tx("Supprimer ce client")}</button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button aria-label={tx("Fermer")} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <div className="relative z-10 flex w-full max-w-[460px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
            <h2 className="font-archivo font-extrabold text-[20px] tracking-[-0.02em] text-ink">{tx("Supprimer")} {name} ?</h2>
            <p className="text-[14px] leading-relaxed text-body">
              {tx("Cette action est")} <span className="font-semibold text-ink">{tx("irréversible")}</span>{tx(". Tout est effacé : programme, séances, pesées, mensurations, messages, notes, et le compte du client. Il pourra se réinscrire de zéro.")}</p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted-2">
                {tx("Tape")} <span className="font-mono font-semibold text-ink">SUPPRIMER</span> {tx("pour confirmer.")}</span>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] uppercase tracking-[0.08em] text-ink outline-none focus:border-ink"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              <form action={deleteClient}>
                <input type="hidden" name="id" value={clientId} />
                <button
                  type="submit"
                  disabled={!ok}
                  className="tap inline-flex h-11 items-center justify-center rounded-btn bg-alert-ink px-4 text-[14px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {tx("Supprimer définitivement")}</button>
              </form>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="tap rounded-btn border border-line-4 px-4 py-2.5 text-[14px] font-semibold text-body hover:border-ink"
              >
                {tx("Annuler")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
