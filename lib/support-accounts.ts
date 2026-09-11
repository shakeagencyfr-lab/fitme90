import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { readSupportReturn } from "@/lib/support-return";

// Les comptes vers lesquels un opérateur peut basculer en assistance.
//
// POURQUOI CETTE LISTE EXISTE. Jusqu'ici, changer de compte assisté voulait
// dire : revenir à son espace, rouvrir la liste du réseau, retrouver la ligne,
// rouvrir le menu, cliquer. Cinq écrans pour une opération qu'on répète toute
// la journée quand on gère un réseau. Le sélecteur du bandeau la fait en un
// clic, et cette fonction lui donne de quoi remplir sa liste.
//
// CE QU'ELLE NE DÉCIDE PAS. L'autorisation. Elle sert à AFFICHER des comptes
// déjà rattachés à l'opérateur ; c'est supportLoginAs qui revérifie, à chaque
// bascule, que la cible est bien dans sa descendance. Une liste ne fait
// jamais foi.

export interface SwitchableAccount {
  tenantId: string;
  name: string;
  /** Le compte « owner » du tenant : c'est lui qu'on endosse. */
  ownerUserId: string;
  /** L'adresse du titulaire, pour distinguer deux comptes au nom proche. */
  email: string;
  kind: "reseller" | "coach";
  /** Désactivé par le parent ou sur impayé : on le dit plutôt que de le cacher. */
  suspended: boolean;
}

/**
 * Les comptes enfants directs d'un tenant, prêts pour le sélecteur.
 *
 * Enfants DIRECTS et non toute la descendance : c'est le périmètre que
 * l'opérateur voit déjà dans « Mon réseau », et celui qu'il a en tête. Un
 * revendeur qui veut descendre chez le client d'un de ses coachs passe par le
 * compte du coach, ce qui est aussi la bonne façon de raconter la hiérarchie.
 */
export async function listSwitchableAccounts(actorTenantId: string | null): Promise<SwitchableAccount[]> {
  if (!actorTenantId) return [];
  const admin = createAdminClient();
  const { data: kids } = await admin
    .from("tenants")
    .select("id, name, kind, suspended_at")
    .eq("parent_id", actorTenantId)
    .order("name", { ascending: true })
    .returns<{ id: string; name: string | null; kind: string | null; suspended_at: string | null }[]>();
  const list = kids ?? [];
  if (!list.length) return [];

  const { data: owners } = await admin
    .from("profiles")
    .select("tenant_id, id, email")
    .in(
      "tenant_id",
      list.map((k) => k.id),
    )
    .eq("role", "owner")
    .returns<{ tenant_id: string; id: string; email: string | null }[]>();

  const parOwner = new Map<string, { id: string; email: string }>();
  for (const o of owners ?? []) {
    if (!parOwner.has(o.tenant_id)) parOwner.set(o.tenant_id, { id: o.id, email: o.email ?? "" });
  }

  return list.flatMap((k) => {
    const owner = parOwner.get(k.id);
    // Un tenant sans compte titulaire n'est pas assistable : on ne le montre
    // pas, plutôt que d'offrir un bouton qui échouerait.
    if (!owner) return [];
    return [
      {
        tenantId: k.id,
        name: k.name ?? "",
        ownerUserId: owner.id,
        email: owner.email,
        kind: k.kind === "reseller" ? ("reseller" as const) : ("coach" as const),
        suspended: Boolean(k.suspended_at),
      },
    ];
  });
}

/**
 * L'opérateur d'origine d'une assistance en cours : son tenant et son nom.
 *
 * Sa session n'est plus active (c'est celle du compte assisté qui l'est), donc
 * on relit son profil en service_role à partir de l'identifiant conservé dans
 * le cookie signé. Le cookie ne donne aucun droit par lui-même : il ne fait
 * que désigner qui l'on doit considérer comme l'acteur.
 */
export async function supportActorContext(
  actorUserId: string,
): Promise<{ userId: string; tenantId: string; tenantName: string } | null> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", actorUserId)
    .maybeSingle<{ tenant_id: string | null }>();
  if (!prof?.tenant_id) return null;
  const { data: t } = await admin
    .from("tenants")
    .select("name")
    .eq("id", prof.tenant_id)
    .maybeSingle<{ name: string | null }>();
  return { userId: actorUserId, tenantId: prof.tenant_id, tenantName: t?.name ?? "" };
}

export interface SupportContext {
  /** Le compte (ou la personne) où l'on se trouve, tel qu'on l'affiche. */
  currentName: string;
  /** Le nom de l'espace d'origine, pour dire où mène le retour. */
  actorName: string;
  /** Les comptes vers lesquels basculer directement. Vide pour un coach. */
  accounts: SwitchableAccount[];
  /** Un coach qui saisit pour son client, plutôt qu'un opérateur dans un compte. */
  client: boolean;
}

/**
 * Tout ce dont l'interface a besoin pour parler de l'assistance en cours.
 *
 * Un seul point d'entrée pour le bandeau du haut ET la pastille du menu : les
 * deux montrent la même chose, il ne doit pas exister deux façons de la
 * calculer. Renvoie null quand on est chez soi, ce qui est le cas courant.
 *
 * Mémoïsé le temps d'une requête (React cache) : le layout l'appelle pour le
 * bandeau et pour la pastille, et ces deux appels ne doivent pas interroger la
 * base deux fois.
 */
export const supportContext = cache(async function supportContext(): Promise<SupportContext | null> {
  const back = await readSupportReturn();
  if (!back) return null;
  const client = back.kind === "client";
  // Un coach qui saisit pour son client ne bascule pas de compte en compte :
  // pas de liste à charger, donc pas de requête à faire.
  if (client) {
    return { currentName: back.targetName ?? "", actorName: back.actorName ?? "", accounts: [], client: true };
  }
  const origine = await supportActorContext(back.actorUserId);
  const accounts = await listSwitchableAccounts(origine?.tenantId ?? null);
  // Le nom du compte visité vient du cookie ; les cookies posés avant cette
  // option ne le portent pas, et on le retrouve alors par la liste.
  const currentName =
    back.targetName || accounts.find((a) => a.ownerUserId === back.targetUserId)?.name || "";
  return {
    currentName,
    actorName: origine?.tenantName ?? back.actorName ?? "",
    accounts,
    client: false,
  };
});
