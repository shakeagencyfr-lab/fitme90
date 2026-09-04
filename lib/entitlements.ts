import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Capacité clients d'un tenant (facturation Lot C : forfait selon le nombre de
// clients actifs, 1er client offert). Une « place » = un compte client rattaché
// au tenant ; elle ne se libère qu'à la SUPPRESSION du compte (pas à la fin d'un
// programme). NULL en base = illimité.

export interface TenantCapacity {
  /** Limite de clients actifs. null = illimité. */
  limit: number | null;
  /** Comptes clients actuellement rattachés au tenant. */
  used: number;
  /** Places restantes ; null si illimité. */
  remaining: number | null;
  /** true si la limite est atteinte (jamais si illimité). */
  full: boolean;
  unlimited: boolean;
}

function capacityFrom(limit: number | null, used: number): TenantCapacity {
  const unlimited = limit === null;
  return {
    limit,
    used,
    remaining: unlimited ? null : Math.max(0, (limit ?? 0) - used),
    full: !unlimited && used >= (limit ?? 0),
    unlimited,
  };
}

/** Compte les comptes clients rattachés à un tenant (une place = un compte). */
export async function activeClientCount(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("role", "client");
  return count ?? 0;
}

/** Capacité (limite + usage) d'un tenant à partir de son id. */
export async function tenantCapacity(tenantId: string): Promise<TenantCapacity> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("client_limit")
    .eq("id", tenantId)
    .maybeSingle<{ client_limit: number | null }>();
  const used = await activeClientCount(tenantId);
  return capacityFrom(data?.client_limit ?? null, used);
}

/**
 * Capacité d'un tenant résolu par slug — utilisé au moment de l'inscription
 * d'un client sur la landing d'un coach (le slug voyage dans le formulaire).
 * Renvoie null si le slug n'existe pas (inscription My Fitness App directe : pas de
 * limite à appliquer).
 */
export async function capacityForSlug(slug: string): Promise<TenantCapacity | null> {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, client_limit")
    .eq("slug", slug)
    .maybeSingle<{ id: string; client_limit: number | null }>();
  if (!tenant) return null;
  const used = await activeClientCount(tenant.id);
  return capacityFrom(tenant.client_limit ?? null, used);
}

// ------------------------------------------------------------------ capacité d'un revendeur

/**
 * Capacité d'un REVENDEUR, comptée en comptes et non en clients.
 *
 * Un revendeur n'a aucun client en direct : les siens sont chez ses coachs. La
 * même colonne `client_limit` sert donc à plafonner ce qu'il vend réellement,
 * à savoir le nombre de comptes coach ou salle sous sa marque. Sans cette
 * distinction, sa jauge affichait « 0 / 1 » alors qu'il avait déjà un coach en
 * activité, et rien ne l'empêchait d'en ouvrir cent.
 *
 * La limite reste posée par le palier que la plateforme lui accorde ou lui
 * vend, exactement comme celle d'un coach.
 */

/** Comptes enfants d'un tenant : coachs, salles, sous-revendeurs. */
export async function childAccountCount(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", tenantId);
  return count ?? 0;
}

/** Capacité en comptes d'un revendeur, à partir de son id. */
export async function accountCapacity(tenantId: string): Promise<TenantCapacity> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("client_limit")
    .eq("id", tenantId)
    .maybeSingle<{ client_limit: number | null }>();
  const used = await childAccountCount(tenantId);
  return capacityFrom(data?.client_limit ?? null, used);
}

/**
 * Capacité en comptes d'un revendeur résolu par slug.
 *
 * Sert au moment où un coach s'inscrit par le lien d'un revendeur
 * (`/inscription-coach?r=<slug>`) : le slug voyage dans le formulaire, comme
 * celui du coach dans l'inscription d'un client. Renvoie null si le slug ne
 * désigne pas un revendeur, auquel cas il n'y a pas de limite à appliquer.
 */
export async function accountCapacityForResellerSlug(slug: string): Promise<TenantCapacity | null> {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, client_limit")
    .eq("slug", slug)
    .eq("kind", "reseller")
    .maybeSingle<{ id: string; client_limit: number | null }>();
  if (!tenant) return null;
  const used = await childAccountCount(tenant.id);
  return capacityFrom(tenant.client_limit ?? null, used);
}
