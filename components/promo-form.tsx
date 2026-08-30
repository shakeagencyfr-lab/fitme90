"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addPromo, type PromoFormState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";

export function PromoForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(addPromo, {} as PromoFormState);
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="font-archivo font-bold text-[16px] text-ink">Nouveau code promo</div>

      <label className="flex flex-col gap-1.5">
        <MonoLabel>Code</MonoLabel>
        <input
          type="text"
          name="code"
          maxLength={32}
          placeholder="Ex : RENTREE20"
          className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] uppercase tracking-[0.08em] text-ink outline-none focus:border-ink"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Type de remise</MonoLabel>
          <select
            name="discount_type"
            value={type}
            onChange={(e) => setType(e.target.value as "percent" | "fixed")}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            <option value="percent">Pourcentage (%)</option>
            <option value="fixed">Montant fixe (€)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{type === "percent" ? "Remise (%)" : "Remise (€)"}</MonoLabel>
          <input
            type="text"
            inputMode="decimal"
            name="value"
            placeholder={type === "percent" ? "20" : "15"}
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Utilisations max</MonoLabel>
          <input
            type="text"
            inputMode="numeric"
            name="max_uses"
            placeholder="illimité"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Expire le</MonoLabel>
          <input
            type="date"
            name="expires_at"
            className="w-full rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
          />
        </label>
      </div>

      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.ok ? <Alert tone="info">Code promo créé.</Alert> : null}

      <Button type="submit" loading={pending} className="self-start h-11">
        Créer le code
      </Button>
      <p className="text-[12px] text-muted-2">
        S&apos;applique aux offres à paiement unique. La remise ne peut pas descendre en dessous de 0,50 €.
      </p>
    </form>
  );
}
