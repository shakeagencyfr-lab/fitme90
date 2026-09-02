"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateGiftCodesAction, type GiftGenState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";

interface Offer {
  id: string;
  name: string;
}

export function GiftGenerator({ offers }: { offers: Offer[] }) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(generateGiftCodesAction, {} as GiftGenState);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  async function copyAll() {
    if (!state.codes?.length) return;
    try {
      await navigator.clipboard.writeText(state.codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  }

  if (offers.length === 0) {
    return (
      <Alert tone="info">
        {tx("Crée d'abord une offre à paiement unique (onglet Ma page) pour pouvoir générer des codes cadeaux.")}</Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="font-archivo font-bold text-[16px] text-ink">{tx("Générer des codes cadeaux gratuits")}</div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Offre offerte")}</MonoLabel>
          <select
            name="offer_id"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            {offers.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Combien de codes")}</MonoLabel>
          <input
            type="text"
            inputMode="numeric"
            name="count"
            defaultValue="1"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <MonoLabel>{tx("Note (facultatif)")}</MonoLabel>
        <input
          type="text"
          name="note"
          maxLength={200}
          placeholder={tx("Ex : concours Instagram")}
          className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
        />
      </label>

      {state.error ? <Alert>{state.error}</Alert> : null}

      {state.ok && state.codes?.length ? (
        <div className="flex flex-col gap-2 rounded-control border border-brand/30 bg-brand/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand">
              {state.codes.length} {tx("code")}{state.codes.length > 1 ? "s" : ""} {tx("généré")}{state.codes.length > 1 ? "s" : ""}
            </span>
            <button type="button" onClick={copyAll} className="text-[12px] font-semibold text-brand underline hover:text-ink">
              {copied ? "Copié ✓" : "Tout copier"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.codes.map((c) => (
              <span key={c} className="select-all rounded-btn bg-surface px-2.5 py-1 font-mono text-[13px] font-semibold tracking-[0.1em] text-ink">
                {c}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Button type="submit" loading={pending} className="self-start h-11">
        {tx("Générer")}</Button>
    </form>
  );
}
