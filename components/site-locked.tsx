"use client";

import { useState } from "react";
import Link from "next/link";
import { usePhrase } from "@/components/locale-provider";
import { buyWhitelabelPack } from "@/app/admin/actions";
import { Button, Card } from "@/components/ui";
import { formatEuros } from "@/lib/config";

/**
 * L'écran que voit un compte sans le pack marque blanche sur « Mon site ».
 *
 * Il MONTRE la fonctionnalité au lieu de la cacher. Un onglet grisé sans
 * explication se lit comme un bug ; une page qui décrit ce qu'on rate, avec le
 * prix et le bouton, se lit comme une offre. Le site n'est pas vendu seul : il
 * vient avec le domaine, les e-mails et l'application au nom du coach, et on
 * le dit, sinon le coach croit payer une page et découvre un pack.
 */
export function SiteLocked({ priceCents, erreur, annule }: { priceCents: number | null; erreur?: boolean; annule?: boolean }) {
  const tx = usePhrase();
  const [envoi, setEnvoi] = useState(false);

  const ARGUMENTS = [
    tx("Une page de présentation à ton nom : qui tu es, où tu es, quand tu ouvres, tes photos et tes avis Google."),
    tx("Ton propre nom de domaine, branché sur ta page de vente."),
    tx("Des e-mails envoyés depuis ton serveur, à ton adresse."),
    tx("L'application installée au nom et à l'icône de ta marque, sans badge « Propulsé par »."),
  ];

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-2">
          {tx("Pack marque blanche")}
        </span>
        <div className="font-archivo text-[21px] font-bold leading-[1.2] text-ink">
          {tx("Ton site de présentation fait partie du pack marque blanche")}
        </div>
        <p className="max-w-[68ch] text-[14px] leading-[1.6] text-muted">
          {tx("Ta page de vente argumente et fait payer. Le site répond à ce qu'on cherche en tombant sur un professionnel pour la première fois, et amène vers la première. Il vient avec tout ce qui fait disparaître notre marque derrière la tienne.")}
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
        <form action={buyWhitelabelPack} onSubmit={() => setEnvoi(true)} className="flex flex-col gap-2">
          <input type="hidden" name="return_to" value="site" />
          <Button type="submit" loading={envoi} className="h-11 self-start">
            {tx("Activer le pack pour")} {formatEuros(priceCents)}{tx(" / mois")}
          </Button>
          <span className="text-[12px] text-muted-2">
            {tx("Abonnement mensuel auprès de ton revendeur, résiliable quand tu veux. Ta page reste modifiable et se rallume telle quelle si tu reviens.")}
          </span>
          {erreur ? (
            <span className="text-[12.5px] text-[#C4471A]">
              {tx("Le paiement n'a pas pu démarrer. Réessaie, ou préviens ton revendeur si cela persiste.")}
            </span>
          ) : null}
          {annule ? <span className="text-[12.5px] text-muted">{tx("Souscription annulée.")}</span> : null}
        </form>
      ) : (
        <div className="rounded-control border border-line-4 bg-surface-2 p-3.5 text-[13px] leading-[1.6] text-muted">
          {tx("Ton revendeur ne propose pas encore ce pack. Parle-lui-en : il peut l'inclure dans ton palier ou le vendre à part, depuis son tableau de bord.")}
        </div>
      )}

      <p className="text-[12.5px] leading-[1.6] text-muted-2">
        {tx("Le même pack se règle depuis")}{" "}
        <Link href="/admin/marque-blanche" className="text-brand hover:underline">{tx("Marque blanche")}</Link>
        {tx(", où tu brancheras ton domaine et tes e-mails.")}
      </p>
    </Card>
  );
}
