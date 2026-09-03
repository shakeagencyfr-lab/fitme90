"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessType, type TemplateState } from "@/app/admin/actions";
import { Alert, Card, Button, MonoLabel } from "@/components/ui";
import type { BusinessType } from "@/lib/offers";

// Nature de l'activité. Ce réglage ne touche ni aux droits ni aux tarifs : il
// choisit le DISCOURS de la page publique. Un coach indépendant vend sa
// signature ; une salle vend son équipe, son parc de machines et la continuité
// entre la séance sur place et le reste de la semaine. Écrire les deux avec
// les mêmes phrases affaiblirait les deux.

const CHOICES: { value: BusinessType; title: string; body: string; icon: React.ReactNode }[] = [
  {
    value: "coach",
    title: "Coach indépendant",
    body: "La page met en avant ta méthode, ta signature et ton suivi personnel.",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M16 19a4 4 0 0 0-8 0" />
        <path d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
      </svg>
    ),
  },
  {
    value: "gym",
    title: "Salle de sport",
    body: "La page met en avant ton équipe de coachs, ton parc de machines et le suivi des adhérents entre deux venues.",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6.5 9.5v5M17.5 9.5v5M4 11v2M20 11v2M6.5 12h11" />
      </svg>
    ),
  },
];

export function BusinessTypeForm({ current }: { current: BusinessType }) {
  const tx = usePhrase();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveBusinessType, {} as TemplateState);
  const [value, setValue] = useState<BusinessType>(current);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <MonoLabel>{tx("Nature de ton activité")}</MonoLabel>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          {tx("Change les textes de ta page publique, pas tes tarifs ni tes fonctionnalités. Choisis ce qui te décrit : les deux versions ne racontent pas la même histoire.")}</p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="business_type" value={value} />
        <div className="grid gap-2.5 sm:grid-cols-2">
          {CHOICES.map((c) => {
            const on = value === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setValue(c.value)}
                aria-pressed={on}
                className={[
                  "tap lift flex flex-col items-start gap-2 rounded-control border p-4 text-left",
                  on ? "border-brand bg-brand/[0.06]" : "border-line-3 bg-surface hover:border-ink/40",
                ].join(" ")}
              >
                <span className={on ? "text-brand" : "text-muted-2"}>{c.icon}</span>
                <span className="font-archivo text-[15px] font-bold text-ink">{tx(c.title)}</span>
                <span className="text-[12.5px] leading-[1.55] text-muted">{tx(c.body)}</span>
              </button>
            );
          })}
        </div>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Textes de la page mis à jour.")}</Alert> : null}

        <Button type="submit" loading={pending} disabled={value === current} className="h-11 self-start">
          {tx("Enregistrer")}</Button>
      </form>
    </Card>
  );
}
