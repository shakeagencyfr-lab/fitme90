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
