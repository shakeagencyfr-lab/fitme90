import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PURGE_AFTER_DAYS } from "@/lib/config";
import { purgeClientAccount } from "@/lib/account-deletion";

// Nettoyage des comptes clients en IMPAYÉ prolongé. Règle produit : à un défaut
// de paiement, l'IA se coupe et l'accès passe en lecture seule (guard) ; si
// l'abonnement reste non régularisé au-delà de PURGE_AFTER_DAYS (14 j après la
// fin de la dernière période payée), le compte est supprimé (RGPD : on ne
// conserve pas indéfiniment des données non payées).
//
// SÉCURITÉ (suppression irréversible) :
//  - DRY-RUN par défaut : rien n'est supprimé tant que ENABLE_ACCOUNT_PURGE≠"1".
//    Le cron renvoie alors le nombre de comptes QUI SERAIENT supprimés, pour
//    valider la règle sur données réelles avant de l'activer.
//  - Plafond par exécution : jamais plus de MAX_PER_RUN, pour qu'une erreur de
//    logique ne puisse pas déclencher une suppression de masse.
//  - Cible étroite : uniquement des `client` avec un abonnement mort et une
//    période payée expirée depuis > 14 j. Les programmes à prix unique (sans
//    abonnement, subscription_status = null) ne sont JAMAIS concernés.

// Statuts Stripe considérés comme « abonnement mort » (non régularisé).
const DEAD_STATUSES = ["past_due", "unpaid", "incomplete_expired", "canceled"] as const;
const MAX_PER_RUN = 100;

export interface LapsedPurgeResult {
  candidates: number;
  deleted: number;
  dryRun: boolean;
}

type Candidate = { id: string };

export async function purgeLapsedClients(now: Date = new Date()): Promise<LapsedPurgeResult> {
  const enabled = process.env.ENABLE_ACCOUNT_PURGE === "1";
  const admin = createAdminClient();
  const cutoff = new Date(now.getTime() - PURGE_AFTER_DAYS * 86_400_000).toISOString();

  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "client")
    .in("subscription_status", DEAD_STATUSES as unknown as string[])
    .lt("subscription_current_period_end", cutoff)
    .limit(MAX_PER_RUN)
    .returns<Candidate[]>();
  const candidates = data ?? [];

  if (!enabled) return { candidates: candidates.length, deleted: 0, dryRun: true };

  let deleted = 0;
  for (const c of candidates) {
    await purgeClientAccount(c.id); // garde-fou owner à l'intérieur
    deleted++;
  }
  return { candidates: candidates.length, deleted, dryRun: false };
}
