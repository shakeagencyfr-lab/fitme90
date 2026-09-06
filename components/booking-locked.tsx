"use client";

import { useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { buyBookingPack } from "@/app/admin/actions";
import { Button, Card } from "@/components/ui";
import { formatEuros } from "@/lib/config";

/**
 * L'écran que voit un coach sans le pack réservation.
 *
 * Il MONTRE la fonctionnalité au lieu de la cacher, avec le prix et le
 * bouton quand le revendeur la vend à part, et à qui la demander sinon.
 */
export function BookingLocked({ priceCents, erreur, annule }: { priceCents: number | null; erreur?: boolean; annule?: boolean }) {
  const tx = usePhrase();
  const [envoi, setEnvoi] = useState(false);

  const ARGUMENTS = [
    tx("Tes clients réservent leurs séances en présentiel depuis leur espace, sur les créneaux que tu ouvres."),
    tx("Un ou plusieurs plannings (une salle : un par coach), des prestations à ta durée et à ton prix."),
    tx("Paiement en ligne à la réservation si tu le veux, sur ton compte Stripe."),
    tx("Le Coach IA prend les rendez-vous en direct dans ton planning pour les clients en formule Max."),
    tx("Rappels automatiques, annulation encadrée, tout dans ton fuseau horaire."),
  ];

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">{tx("Pack réservation")}</span>
        <div className="font-archivo text-[21px] font-bold leading-[1.2] text-ink">{tx("Prends tes rendez-vous en présentiel depuis le même espace")}</div>
        <p className="max-w-[68ch] text-[14px] leading-[1.6] text-muted">
          {tx("Un agenda de réservation au niveau des meilleurs outils du marché, mais relié à ton suivi : le client réserve dans l'app où il voit son programme, et ton Coach IA connaît ton planning.")}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {ARGUMENTS.map((a) => (
          <li key={a} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-body">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-[3px] shrink-0 text-brand" aria-hidden>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {a}
          </li>
        ))}
      </ul>

      {priceCents != null ? (
        <form action={buyBookingPack} onSubmit={() => setEnvoi(true)} className="flex flex-col gap-2">
          <Button type="submit" loading={envoi} className="h-11 self-start">
            {tx("Activer le pack pour")} {formatEuros(priceCents)}
            {tx(" / mois")}
          </Button>
          <span className="text-[12px] text-muted-2">{tx("Abonnement mensuel auprès de ton revendeur, résiliable quand tu veux. Tes plannings et rendez-vous restent enregistrés si tu reviens.")}</span>
          {erreur ? <span className="text-[12.5px] text-[#C4471A]">{tx("Le paiement n'a pas pu démarrer. Réessaie, ou préviens ton revendeur si cela persiste.")}</span> : null}
          {annule ? <span className="text-[12.5px] text-muted">{tx("Souscription annulée.")}</span> : null}
        </form>
      ) : (
        <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[13px] leading-[1.6] text-muted">
          {tx("Ton revendeur ne propose pas encore ce pack. Parle-lui-en : il peut l'inclure dans ton palier ou le vendre à part, depuis son tableau de bord.")}
        </div>
      )}
    </Card>
  );
}
