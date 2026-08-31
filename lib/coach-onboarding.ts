import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSlug } from "@/lib/config";
import { platformTenantId } from "@/lib/hierarchy";

// Provisionnement d'un nouveau coach (Lot B multi-coach, phase 1) : à la
// confirmation d'e-mail, si le compte a été créé via /inscription-coach
// (métadonnée coach_signup), on crée son tenant et on le passe « owner ».
// Best-effort : ne bloque jamais la confirmation.

/** Trouve un slug libre à partir d'un nom (suffixe -2, -3… si déjà pris). */
async function freeSlug(admin: ReturnType<typeof createAdminClient>, name: string): Promise<string> {
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
  // Rattachement récursif : un nouveau coach est un enfant de la plateforme
  // (plus tard : de son revendeur). kind='coach' -> sa capacité se compte en
  // clients. parent_id -> qui le facture (Lot C·3).
  const parentId = await platformTenantId();
  const { data: tenant, error } = await admin
    .from("tenants")
    .insert({ slug, name: tenantName, kind: "coach", parent_id: parentId })
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error || !tenant) return;

  const patch: Record<string, string> = { tenant_id: tenant.id, role: "owner" };
  if (coachName) patch.name = coachName;
  await admin.from("profiles").update(patch).eq("id", userId);
}
