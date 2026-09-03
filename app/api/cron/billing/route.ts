import { NextResponse } from "next/server";
import { syncAllSubscriptions } from "@/lib/subscription";
import { syncAllTenantSubscriptions } from "@/lib/tenant-billing";
import { autoAppendBlocks } from "@/lib/blocks";
import { purgeLapsedClients } from "@/lib/lapsed";
import { reconcileTenantPayments } from "@/lib/coach-payments";
import { dispatchScheduledPushes } from "@/lib/scheduled-push";
import { vapidReady } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 300; // la régénération appelle le modèle (peut être long)

// Cron quotidien (voir vercel.json) :
// 1) resynchronise l'état des abonnements Stripe (BYOK, sans webhook plateforme)
//    en relisant chaque abonnement avec la clé du coach ; l'accès en lecture
//    seule est ensuite appliqué au vol par le guard sur défaut de paiement.
// 2) construit le BLOC SUIVANT (3 cycles) des clients dont la fin de bloc
//    approche : produit 12 mois (4 blocs) et abonnés mensuels en règle. Chaque
//    bloc est bâti sur le vécu du précédent (lib/blocks.ts).
// Protégé par CRON_SECRET (Vercel envoie « Authorization: Bearer <secret> »).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }
  // Notifications programmées : le plan Hobby n'autorise qu'un cron par jour,
  // alors on vide la file à chaque passage de N'IMPORTE quel cron. Vider la
  // file n'envoie que ce qui est dû, la répétition est donc sans effet de bord.
  const broadcast = vapidReady() ? await dispatchScheduledPushes() : { due: 0, sent: 0 };
  // Rattrapage des paiements clients. Sans Stripe Connect, un achat n'est
  // constaté qu'au RETOUR du client sur la page de confirmation : s'il ferme
  // l'onglet, il a payé et n'a rien, et personne ne le sait. On repasse donc
  // sur les sessions récentes de chaque coach, avec sa clé.
  const reconciled = await reconcileTenantPayments();
  const { synced, restricted } = await syncAllSubscriptions();
  // Abonnements des comptes à leur parent (Lot C·3b) : renouvellements +
  // défaut de paiement -> retour au palier gratuit.
  const { synced: tenantSynced, downgraded: tenantDowngraded } = await syncAllTenantSubscriptions();
  const blocks = await autoAppendBlocks();
  // 3) Suppression des comptes clients en impayé prolongé (> 14 j). DRY-RUN tant
  //    que ENABLE_ACCOUNT_PURGE≠"1" : on compte sans supprimer.
  const purge = await purgeLapsedClients();
  return NextResponse.json({ reconciled, synced, restricted, tenantSynced, tenantDowngraded, blocks, purge, broadcast });
}
