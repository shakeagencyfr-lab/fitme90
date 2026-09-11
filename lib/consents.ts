import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSENT_TEXT_VERSION, type ConsentKind } from "@/lib/gdpr";

// Enregistrer, retirer et relire les consentements.
//
// LE PROBLÈME QU'ON CORRIGE. La case « j'accepte les CGV » de l'inscription
// était `required` dans le formulaire, et vérifiée côté serveur, mais rien
// n'en gardait trace. Si un client contestait, on n'avait rien à montrer :
// l'article 7.1 demande pourtant au responsable d'être en mesure de
// DÉMONTRER que la personne a consenti.
//
// POURQUOI L'ÉCRITURE PASSE PAR LE SERVEUR. Un consentement que le navigateur
// pourrait écrire lui-même ne prouverait rien du tout. La policy RLS n'ouvre
// donc que la lecture au titulaire ; l'écriture est en service_role.
//
// CE QU'ON NE FAIT PAS ÉCHOUER. Si l'écriture rate, l'inscription continue.
// Refuser un compte parce qu'une ligne de journal n'est pas partie punirait
// la personne pour un incident qui n'est pas le sien ; l'erreur est remontée
// dans les logs serveur.

export interface ConsentRow {
  kind: ConsentKind;
  text_version: string;
  granted_at: string;
  withdrawn_at: string | null;
}

/**
 * Écrit un ou plusieurs consentements pour une personne.
 *
 * Chaque accord crée une LIGNE DE PLUS, jamais une mise à jour : on veut
 * l'historique, pas le dernier état. Une personne qui accepte, retire, puis
 * réaccepte doit laisser ces trois moments derrière elle.
 */
export async function recordConsents(userId: string, kinds: readonly ConsentKind[]): Promise<void> {
  if (!userId || !kinds.length) return;
  const admin = createAdminClient();
  const { error } = await admin.from("consents").insert(
    kinds.map((kind) => ({ user_id: userId, kind, text_version: CONSENT_TEXT_VERSION })),
  );
  if (error) console.error("[consents] écriture impossible", { kinds, message: error.message });
}

/**
 * Retire un consentement : on date la ligne au lieu de l'effacer.
 *
 * Effacer la ligne ferait disparaître la preuve qu'on a cessé de traiter à
 * partir de telle date, qui est précisément ce qu'on doit pouvoir montrer.
 */
export async function withdrawConsent(userId: string, kind: ConsentKind): Promise<void> {
  if (!userId) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("consents")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("kind", kind)
    .is("withdrawn_at", null);
  if (error) console.error("[consents] retrait impossible", { kind, message: error.message });
}

/** Tous les consentements d'une personne, du plus récent au plus ancien. */
export async function listConsents(userId: string): Promise<ConsentRow[]> {
  if (!userId) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("consents")
    .select("kind, text_version, granted_at, withdrawn_at")
    .eq("user_id", userId)
    .order("granted_at", { ascending: false });
  return (data ?? []) as ConsentRow[];
}

/**
 * Ce consentement est-il en vigueur, dans la version courante du texte ?
 *
 * Deux raisons de répondre non : il a été retiré, ou il a été donné sur une
 * version antérieure du texte. Le second cas est le plus facile à oublier, et
 * c'est celui qui rend un consentement caduc quand on ajoute une finalité.
 */
export async function hasCurrentConsent(userId: string, kind: ConsentKind): Promise<boolean> {
  const rows = await listConsents(userId);
  return rows.some((r) => r.kind === kind && !r.withdrawn_at && r.text_version === CONSENT_TEXT_VERSION);
}
