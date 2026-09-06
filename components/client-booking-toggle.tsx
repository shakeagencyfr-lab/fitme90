"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { setClientBookingAction, type BookingState } from "@/app/admin/reservations/actions";
import { Alert, Button, Card, MonoLabel } from "@/components/ui";

/**
 * Fiche client : le coach ouvre ou ferme la réservation en ligne de séances
 * en présentiel pour CE client. Ouvert, un onglet « Réservation » apparaît
 * dans son espace et, s'il a le Coach IA, celui-ci prend ses rendez-vous.
 */
export function ClientBookingToggle({ clientId, enabled, packAllowed, spaceActive, coachAi }: { clientId: string; enabled: boolean; packAllowed: boolean; spaceActive: boolean; coachAi: boolean }) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(setClientBookingAction, {} as BookingState);
  const [on, setOn] = useState(enabled);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <MonoLabel>{tx("Réservation de séances en présentiel")}</MonoLabel>
        <p className="text-[12.5px] leading-[1.55] text-muted-2">
          {tx("Ouvert, ce client voit un onglet Réservation dans son espace et prend rendez-vous sur tes créneaux.")}{" "}
          {coachAi ? tx("Son Coach IA peut aussi réserver pour lui, en direct dans ton planning.") : tx("Avec la formule Max, son Coach IA pourrait aussi réserver pour lui.")}
        </p>
      </div>
      {!packAllowed ? (
        <Alert tone="info">
          {tx("Le pack réservation n'est pas ouvert sur ton compte.")}{" "}
          <Link href="/admin/reservations" className="text-brand underline">
            {tx("Voir le pack")}
          </Link>
        </Alert>
      ) : !spaceActive ? (
        <Alert tone="info">
          {tx("La réservation est éteinte dans ton espace.")}{" "}
          <Link href="/admin/reservations" className="text-brand underline">
            {tx("L'allumer")}
          </Link>
        </Alert>
      ) : null}
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <label className="flex items-center gap-2.5 text-[14.5px] text-ink">
          <input type="checkbox" name="enabled" checked={on} onChange={(e) => setOn(e.target.checked)} disabled={!packAllowed} className="size-4 accent-brand" />
          {tx("Ce client peut réserver en ligne")}
        </label>
        <Button type="submit" loading={pending} disabled={!packAllowed || on === enabled} className="h-10">
          {tx("Enregistrer")}
        </Button>
        {state.ok ? <span className="text-[12.5px] text-muted">{tx("Enregistré.")}</span> : null}
        {state.error ? <span className="text-[12.5px] text-alert-ink">{state.error}</span> : null}
      </form>
    </Card>
  );
}
