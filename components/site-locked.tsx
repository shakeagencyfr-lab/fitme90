"use client";

import { useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { buySiteAddon } from "@/app/admin/actions";
import { Button, Card } from "@/components/ui";
import { formatEuros } from "@/lib/config";

/**
 * L'écran que voit un compte dont le revendeur n'a pas ouvert « Mon site ».
 *
 * Il MONTRE la fonctionnalité au lieu de la cacher. Un onglet grisé sans
 * explication se lit comme un bug ; une page qui décrit ce qu'on rate, avec le
 * prix et le bouton, se lit comme une offre. Et quand le revendeur ne la vend
 * pas du tout, on le dit franchement plutôt que de laisser espérer.
 */
export function SiteLocked({ priceCents, erreur }: { priceCents: number | null; erreur?: boolean }) {
  const tx = usePhrase();
  const [envoi, setEnvoi] = useState(false);

  const ARGUMENTS = [
    tx("Une adresse à ton nom, distincte de ta page de vente."),
    tx("Qui tu es, ce que tu proposes, où tu es et quand tu ouvres."),
    tx("Tes photos et tes avis Google, repris automatiquement."),
    tx("Une dernière section qui envoie vers tes programmes en ligne."),
  ];

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
          {tx("Option")}
        </span>
        <div className="font-archivo text-[21px] font-bold leading-[1.2] text-ink">
          {tx("Une page de présentation, en plus de ta page de vente")}
        </div>
        <p className="max-w-[68ch] text-[14px] leading-[1.6] text-muted">
          {tx("Ta page de vente argumente et fait payer. Celle-ci répond à ce qu'on cherche en tombant sur un professionnel pour la première fois, et amène vers la première.")}
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
        <form action={buySiteAddon} onSubmit={() => setEnvoi(true)} className="flex flex-col gap-2">
          <Button type="submit" loading={envoi} className="h-11 self-start">
            {tx("Activer pour")} {formatEuros(priceCents)}{tx(" / mois")}
          </Button>
          <span className="text-[12px] text-muted-2">
            {tx("Abonnement mensuel auprès de ton revendeur, résiliable quand tu veux. Ta page reste modifiable et se rallume telle quelle si tu reviens.")}
          </span>
          {erreur ? (
            <span className="text-[12.5px] text-[#C4471A]">
              {tx("Le paiement n'a pas pu démarrer. Réessaie, ou préviens ton revendeur si cela persiste.")}
            </span>
          ) : null}
        </form>
      ) : (
        <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[13px] leading-[1.6] text-muted">
          {tx("Ton revendeur ne propose pas encore cette option. Parle-lui-en : il peut l'inclure dans ton palier ou la vendre à part, depuis son tableau de bord.")}
        </div>
      )}
    </Card>
  );
}
