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
  /** Clients rattachés EN DIRECT à ce compte. Toujours 0 pour un revendeur :
   *  ses clients appartiennent aux tenants de ses coachs, pas au sien. */
  clientCount: number;
  /** Clients de tout le sous-réseau : ceux du compte, plus ceux de ses enfants.
   *  C'est le seul chiffre qui ait un sens pour un revendeur. */
  networkClientCount: number;
  /** Coachs et salles rattachés (0 pour un coach, qui n'a pas d'enfants). */
  childCount: number;
  clientLimit: number | null;
  /** Palier posé sur ce compte (acheté ou offert par le parent). */
  planId: string | null;
  subStatus: string | null;
  /** Utilisateur « owner » du tenant enfant (null s'il n'en a pas). */
  ownerUserId: string | null;
  /** Désactivé par le parent (manual) ou sur impayé (payment). */
  suspendedAt: string | null;
  suspendedReason: "manual" | "payment" | null;
  /** Revendeur : achète-t-il ses crédits IA à la plateforme ? */
  aiSupply: "byok" | "platform_credits";
  /** Coach : fournisseur IA de son revendeur (byok = sa propre clé). */
  aiMode: string | null;
  /** Dispensé par son parent : tourne sur sa propre clé malgré la fourniture. */
  aiSelfManaged: boolean;
}

/** Comptes enfants d'un tenant (coachs/salles d'un revendeur, ou d'une plateforme). */
export async function listChildTenants(parentId: string): Promise<ChildTenant[]> {
  const admin = createAdminClient();
  const { data: kids } = await admin
    .from("tenants")
    .select("id, name, slug, kind, client_limit, plan_id, sub_status, suspended_at, suspended_reason, ai_supply, ai_mode, ai_self_managed")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string; name: string; slug: string; kind: string | null; client_limit: number | null; plan_id: string | null; sub_status: string | null;
        suspended_at: string | null; suspended_reason: string | null; ai_supply: string | null; ai_mode: string | null;
        ai_self_managed: boolean | null;
      }[]
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

  // Un revendeur n'a AUCUN client en direct : ils sont rattachés aux tenants de
  // ses coachs. Ne compter que ses propres profils affichait « 0 client » à la
  // plateforme pour un revendeur qui en avait pourtant dans son réseau. On
  // descend donc d'un cran de plus, mais seulement sous les comptes qui peuvent
  // avoir des enfants : un coach n'en a pas, inutile de le chercher.
  const avecEnfants = list.filter((k) => asKind(k.kind) !== "coach").map((k) => k.id);
  /** Petit-enfant -> enfant dont il dépend. */
  const rattachement = new Map<string, string>();
  /** Enfant -> nombre de coachs et salles rattachés. */
  const childCounts = new Map<string, number>();
  /** Enfant -> clients de ses propres enfants. */
  const sousReseau = new Map<string, number>();

  if (avecEnfants.length > 0) {
    const { data: petits } = await admin
      .from("tenants")
      .select("id, parent_id")
      .in("parent_id", avecEnfants)
      .returns<{ id: string; parent_id: string }[]>();
    for (const g of petits ?? []) {
      rattachement.set(g.id, g.parent_id);
      childCounts.set(g.parent_id, (childCounts.get(g.parent_id) ?? 0) + 1);
    }
    if (rattachement.size > 0) {
      const { data: clients } = await admin
        .from("profiles")
        .select("tenant_id")
        .in("tenant_id", [...rattachement.keys()])
        .eq("role", "client")
        .returns<{ tenant_id: string }[]>();
      for (const c of clients ?? []) {
        const enfant = rattachement.get(c.tenant_id);
        if (enfant) sousReseau.set(enfant, (sousReseau.get(enfant) ?? 0) + 1);
      }
    }
  }

  return list.map((k) => ({
    id: k.id,
    name: k.name,
    slug: k.slug,
    kind: asKind(k.kind),
    clientCount: counts.get(k.id) ?? 0,
    networkClientCount: (counts.get(k.id) ?? 0) + (sousReseau.get(k.id) ?? 0),
    childCount: childCounts.get(k.id) ?? 0,
    clientLimit: k.client_limit,
    planId: k.plan_id,
    subStatus: k.sub_status,
    ownerUserId: owners.get(k.id) ?? null,
    suspendedAt: k.suspended_at,
    suspendedReason: k.suspended_reason === "manual" || k.suspended_reason === "payment" ? k.suspended_reason : null,
    aiSupply: k.ai_supply === "platform_credits" ? "platform_credits" : "byok",
    aiMode: k.ai_mode,
    aiSelfManaged: !!k.ai_self_managed,
  }));
}
