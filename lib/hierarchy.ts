import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeClientCount } from "@/lib/entitlements";

// Fondation récursive (Lot D·1) : chaîne plateforme -> revendeurs -> coachs/salles.
// Chaque tenant a un `kind` (niveau) et un `parent_id` (l'étage qui le facture).
// Sert de socle à la facturation : « qui facture qui » + « combien de comptes
// enfants » (base de la capacité facturée à chaque niveau).

export type TenantKind = "platform" | "reseller" | "coach";

export interface TenantNode {
  id: string;
  kind: TenantKind;
  parentId: string | null;
}

function asKind(raw: string | null | undefined): TenantKind {
  return raw === "platform" || raw === "reseller" ? raw : "coach";
}

/** Id du tenant racine (plateforme), ou null s'il n'est pas provisionné. */
export async function platformTenantId(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id")
    .eq("kind", "platform")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

/** Niveau + parent d'un tenant. */
export async function tenantNode(tenantId: string): Promise<TenantNode | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id, kind, parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ id: string; kind: string | null; parent_id: string | null }>();
  if (!data) return null;
  return { id: data.id, kind: asKind(data.kind), parentId: data.parent_id };
}

/** Le tenant qui facture celui-ci (son parent). null pour la plateforme. */
export async function billingParentId(tenantId: string): Promise<string | null> {
  const node = await tenantNode(tenantId);
  return node?.parentId ?? null;
}

/**
 * Nombre de comptes enfants d'un tenant — base de la capacité facturée.
 * Pour un coach : ses clients. Pour un revendeur / la plateforme : ses tenants
 * enfants (coachs, salles, revendeurs rattachés).
 */
export async function childAccountCount(tenantId: string, kind: TenantKind): Promise<number> {
  if (kind === "coach") return activeClientCount(tenantId);
  const admin = createAdminClient();
  const { count } = await admin
    .from("tenants")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", tenantId);
  return count ?? 0;
}

export interface ChildTenant {
  id: string;
  name: string;
  slug: string;
  kind: TenantKind;
  clientCount: number;
  clientLimit: number | null;
  subStatus: string | null;
  /** Utilisateur « owner » du tenant enfant (null s'il n'en a pas). */
  ownerUserId: string | null;
}

/** Comptes enfants d'un tenant (coachs/salles d'un revendeur, ou d'une plateforme). */
export async function listChildTenants(parentId: string): Promise<ChildTenant[]> {
  const admin = createAdminClient();
  const { data: kids } = await admin
    .from("tenants")
    .select("id, name, slug, kind, client_limit, sub_status")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .returns<
      { id: string; name: string; slug: string; kind: string | null; client_limit: number | null; sub_status: string | null }[]
    >();
  const list = kids ?? [];
  if (list.length === 0) return [];

  // Profils des enfants en une requête : compte des clients + owner de chaque
  // tenant (pour l'accès d'assistance). Agrégé en mémoire.
  const { data: profs } = await admin
    .from("profiles")
    .select("tenant_id, id, role")
    .in("tenant_id", list.map((k) => k.id))
    .in("role", ["client", "owner"])
    .returns<{ tenant_id: string; id: string; role: string | null }[]>();
  const counts = new Map<string, number>();
  const owners = new Map<string, string>();
  for (const p of profs ?? []) {
    if (p.role === "client") counts.set(p.tenant_id, (counts.get(p.tenant_id) ?? 0) + 1);
    else if (p.role === "owner" && !owners.has(p.tenant_id)) owners.set(p.tenant_id, p.id);
  }

  return list.map((k) => ({
    id: k.id,
    name: k.name,
    slug: k.slug,
    kind: asKind(k.kind),
    clientCount: counts.get(k.id) ?? 0,
    clientLimit: k.client_limit,
    subStatus: k.sub_status,
    ownerUserId: owners.get(k.id) ?? null,
  }));
}
