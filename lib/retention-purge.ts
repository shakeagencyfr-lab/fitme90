import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { RETENTION } from "@/lib/gdpr";

// Purge des données arrivées au bout de leur durée de conservation.
//
// POURQUOI ELLE EXISTE. Une durée de conservation annoncée et jamais appliquée
// vaut moins que pas de durée du tout : c'est un engagement écrit qu'on ne
// tient pas. L'article 5.1.e ne demande pas d'annoncer un délai, il demande de
// ne pas garder au-delà. Ce fichier est ce qui fait passer les chiffres de
// lib/gdpr.ts du statut de promesse à celui de règle.
//
// CE QU'ELLE NE TOUCHE PAS. Les comptes. Supprimer un compte est irréversible
// et se décide ailleurs (lib/lapsed.ts, avec son propre garde-fou). Ici, on
// n'efface que des lignes de journal et des contacts jamais convertis.
//
// DRY-RUN PAR DÉFAUT. Tant que ENABLE_RETENTION_PURGE ≠ "1", rien n'est
// supprimé : la fonction renvoie ce QUI SERAIT supprimé. C'est ce qui permet
// de lire les chiffres sur les vraies données avant d'ouvrir la vanne, plutôt
// que de découvrir après coup qu'une règle était trop large.
//
// EN DEUX TEMPS, ET PLAFONNÉ. On relève d'abord les identifiants concernés,
// au plus MAX_PER_RUN, puis on supprime exactement ceux-là. Deux raisons : un
// DELETE ne se plafonne pas directement côté PostgREST, et une erreur de date
// ne peut alors pas vider une table entière en une exécution. Le reliquat part
// au passage suivant du cron.

const MAX_PER_RUN = 2000;

export interface RetentionLot {
  /** Ce qui est purgé, dit en français. */
  label: string;
  table: string;
  /** Lignes au-delà de la durée annoncée, relevées ce passage-ci. */
  candidates: number;
  deleted: number;
  /** La table n'existe pas dans cette base (migration pas encore passée). */
  unavailable?: boolean;
}

export interface RetentionPurgeResult {
  dryRun: boolean;
  lots: RetentionLot[];
}

function monthsAgo(now: Date, months: number): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

type IdRow = { id: string | number };

/** Supprime les lignes désignées, ou les compte seulement en dry-run. */
async function applyLot(
  label: string,
  table: string,
  ids: IdRow[] | null,
  unavailable: boolean,
  dryRun: boolean,
): Promise<RetentionLot> {
  if (unavailable) return { label, table, candidates: 0, deleted: 0, unavailable: true };
  const candidates = ids?.length ?? 0;
  if (!candidates || dryRun) return { label, table, candidates, deleted: 0 };
  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().in(
    "id",
    (ids ?? []).map((r) => r.id),
  );
  return { label, table, candidates, deleted: error ? 0 : candidates };
}

export async function purgeExpiredRetention(now: Date = new Date()): Promise<RetentionPurgeResult> {
  const dryRun = process.env.ENABLE_RETENTION_PURGE !== "1";
  const admin = createAdminClient();

  // 1. Prospects du mini-programme gratuit, jamais convertis. Une adresse
  //    captée il y a trois ans et jamais recontactée n'est plus un prospect,
  //    c'est un fichier d'adresses. Recommandation CNIL : 3 ans.
  const prospects = await admin
    .from("prospects")
    .select("id")
    .neq("status", "converti")
    .lt("created_at", monthsAgo(now, RETENTION.prospectMonths))
    .limit(MAX_PER_RUN)
    .returns<IdRow[]>();

  // 2. Journal technique des appels au modèle. Il sert à facturer et à
  //    diagnostiquer ; passé un an, il ne sert plus qu'à exister.
  const aiCalls = await admin
    .from("ai_calls")
    .select("id")
    .lt("created_at", monthsAgo(now, RETENTION.aiLogMonths))
    .limit(MAX_PER_RUN)
    .returns<IdRow[]>();

  // 3. Journal des accès en assistance. Même logique : c'est une trace de
  //    contrôle, pas une archive.
  const support = await admin
    .from("support_access_log")
    .select("id")
    .lt("created_at", monthsAgo(now, RETENTION.supportLogMonths))
    .limit(MAX_PER_RUN)
    .returns<IdRow[]>();

  // 4. Preuves de consentements RETIRÉS depuis longtemps. On garde la preuve
  //    le temps qu'elle puisse servir (montrer à partir de quelle date on a
  //    cessé de traiter), pas au-delà. Les accords EN VIGUEUR ne sont jamais
  //    touchés : withdrawn_at doit être renseigné pour entrer dans le lot.
  const consents = await admin
    .from("consents")
    .select("id")
    .not("withdrawn_at", "is", null)
    .lt("withdrawn_at", monthsAgo(now, RETENTION.consentProofMonths))
    .limit(MAX_PER_RUN)
    .returns<IdRow[]>();

  const lots = await Promise.all([
    applyLot("Prospects sans suite", "prospects", prospects.data, Boolean(prospects.error), dryRun),
    applyLot("Journal des appels au modèle", "ai_calls", aiCalls.data, Boolean(aiCalls.error), dryRun),
    applyLot("Journal des accès en assistance", "support_access_log", support.data, Boolean(support.error), dryRun),
    applyLot("Preuves de consentements retirés", "consents", consents.data, Boolean(consents.error), dryRun),
  ]);

  return { dryRun, lots };
}
