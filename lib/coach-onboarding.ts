import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { freeTierLimit } from "@/lib/plans";
import { applyPlanModel } from "@/lib/plan-apply";
import { normalizeSlug } from "@/lib/config";
import { platformTenantId } from "@/lib/hierarchy";

// Provisionnement d'un nouveau coach (Lot B multi-coach, phase 1) : à la
// confirmation d'e-mail, si le compte a été créé via /inscription-coach
// (métadonnée coach_signup), on crée son tenant et on le passe « owner ».
// Best-effort : ne bloque jamais la confirmation.

/** Trouve un slug libre à partir d'un nom (suffixe -2, -3… si déjà pris). */
export async function freeSlug(admin: ReturnType<typeof createAdminClient>, name: string): Promise<string> {
  const base = normalizeSlug(name) || "coach";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const { data } = await admin.from("tenants").select("id").eq("slug", candidate).maybeSingle<{ id: string }>();
    if (!data) return candidate;
  }
  // Repli très improbable : suffixe aléatoire.
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Parent (qui facture) d'un nouveau coach : le revendeur dont le slug est passé
 * dans les métadonnées d'inscription (reseller_slug), s'il existe et est bien un
 * revendeur ; sinon la plateforme. Un coach est ainsi rattaché soit à un
 * revendeur, soit directement à la plateforme.
 */
async function resolveCoachParent(
  admin: ReturnType<typeof createAdminClient>,
  meta: Record<string, unknown> | null | undefined,
): Promise<string | null> {
  const slug = (typeof meta?.reseller_slug === "string" ? meta.reseller_slug : "").trim().toLowerCase();
  if (slug) {
    const { data } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .eq("kind", "reseller")
      .maybeSingle<{ id: string }>();
    if (data?.id) return data.id;
  }
  return platformTenantId();
}

/**
 * Crée le tenant du coach et le rattache en « owner », si son compte vient
 * d'une inscription coach et qu'il n'a pas encore de tenant. Idempotent.
 */
export async function provisionCoachIfPending(
  userId: string,
  meta: Record<string, unknown> | null | undefined,
): Promise<void> {
  if (!meta || meta.coach_signup !== "1") return;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null; role: string | null }>();

  // Déjà provisionné : ne rien refaire.
  if (profile?.tenant_id) return;

  const tenantName = (typeof meta.tenant_name === "string" ? meta.tenant_name : "").trim().slice(0, 60) || "Mon coaching";
  const coachName = (typeof meta.coach_name === "string" ? meta.coach_name : "").trim().slice(0, 40);

  const slug = await freeSlug(admin, tenantName);
  // Rattachement récursif : un nouveau coach est un enfant de son revendeur (si
  // inscrit via son lien) ou de la plateforme. kind='coach' -> capacité en
  // clients. parent_id -> qui le facture (Lot C·3).
  const parentId = await resolveCoachParent(admin, meta);
  const { data: tenant, error } = await admin
    .from("tenants")
    // La place offerte dépend du parent : un client si son palier gratuit
    // est ouvert, aucun sinon. Le nouveau compte ne part pas d'une valeur
    // par défaut de la base, il part de ce que son vendeur a décidé.
    .insert({ slug, name: tenantName, kind: "coach", parent_id: parentId, client_limit: await freeTierLimit(parentId) })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !tenant) return;

  const patch: Record<string, string> = { tenant_id: tenant.id, role: "owner" };
  if (coachName) patch.name = coachName;
  await admin.from("profiles").update(patch).eq("id", userId);
  // Le palier gratuit porte son modèle (fourniture d'IA, crédits de départ).
  await applyPlanModel(tenant.id, null);
}

/**
 * Crée le tenant d'un nouveau REVENDEUR (kind='reseller'), rattaché à la
 * plateforme, si son compte vient d'une inscription revendeur. Idempotent.
 */
export async function provisionResellerIfPending(
  userId: string,
  meta: Record<string, unknown> | null | undefined,
): Promise<void> {
  if (!meta || meta.reseller_signup !== "1") return;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null }>();
  if (profile?.tenant_id) return;

  const tenantName = (typeof meta.tenant_name === "string" ? meta.tenant_name : "").trim().slice(0, 60) || "Mon réseau";
  const contactName = (typeof meta.contact_name === "string" ? meta.contact_name : "").trim().slice(0, 40);

  const slug = await freeSlug(admin, tenantName);
  const parentId = await platformTenantId();
  const { data: tenant, error } = await admin
    .from("tenants")
    .insert({ slug, name: tenantName, kind: "reseller", parent_id: parentId, client_limit: await freeTierLimit(parentId) })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !tenant) return;

  const patch: Record<string, string> = { tenant_id: tenant.id, role: "owner" };
  if (contactName) patch.name = contactName;
  await admin.from("profiles").update(patch).eq("id", userId);
  await applyPlanModel(tenant.id, null);
}
