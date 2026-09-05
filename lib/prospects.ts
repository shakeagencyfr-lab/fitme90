import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGoal, isLevel, isEquipment } from "@/lib/lead-magnet";
import { normalizeTheme, withPrimary, type TenantTheme } from "@/lib/theme";
import { MAX_FOLLOWUPS, type FollowupCopyMap } from "@/lib/prospect-followup";

// Prospects captés par le lead magnet (mini-programme gratuit). Stockés par
// tenant (coach), visibles dans le CRM. Accès service_role uniquement.

export interface Prospect {
  id: string;
  name: string;
  email: string;
  goal: string | null;
  level: string | null;
  days: number | null;
  equipment: string | null;
  status: string;
  created_at: string;
}

const COLS = "id, name, email, goal, level, days, equipment, status, created_at";

export interface PublicLeadMagnet {
  tenantId: string;
  name: string;
  slug: string;
  brandColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  /** Thème de marque : la page découverte doit être aux couleurs du coach. */
  theme: TenantTheme;
}

/** Résout un coach par slug pour la page découverte, si le lead magnet est actif. */
export async function publicLeadMagnetBySlug(slug: string): Promise<PublicLeadMagnet | null> {
  const key = (slug ?? "").toLowerCase();
  if (!/^[a-z0-9-]{1,63}$/.test(key)) return null;
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tenants")
    .select("id, name, slug, app_name, brand_color, logo_url, favicon_url, theme")
    .or(`slug.eq.${key},subdomain.eq.${key}`)
    .limit(1)
    .maybeSingle<{ id: string; name: string; slug: string; app_name: string | null; brand_color: string | null; logo_url: string | null; favicon_url: string | null; theme: unknown }>();
  if (!t) return null;
  if (!(await leadMagnetEnabled(t.id))) return null;
  return {
    tenantId: t.id,
    name: t.app_name?.trim() || t.name,
    slug: t.slug,
    brandColor: t.brand_color,
    logoUrl: t.logo_url,
    faviconUrl: t.favicon_url,
    theme: withPrimary(normalizeTheme(t.theme), t.brand_color),
  };
}

/** Le lead magnet est-il activé pour ce tenant ? */
export async function leadMagnetEnabled(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_config")
    .select("lead_magnet_enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ lead_magnet_enabled: boolean | null }>();
  return !!data?.lead_magnet_enabled;
}

export interface CreateProspectInput {
  name: string;
  email: string;
  goal: string;
  level: string;
  days: number;
  equipment: string;
}

/** Enregistre un prospect. Valide et borne les champs. Renvoie l'ok. */
export async function createProspect(tenantId: string, input: CreateProspectInput): Promise<boolean> {
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 160);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;

  const admin = createAdminClient();
  const row = {
    name,
    goal: isGoal(input.goal) ? input.goal : null,
    level: isLevel(input.level) ? input.level : null,
    days: Number.isFinite(input.days) ? Math.max(1, Math.min(7, Math.round(input.days))) : null,
    equipment: isEquipment(input.equipment) ? input.equipment : null,
  };
  // Une adresse, une fiche : le formulaire est public, et le rejouer avec la
  // même adresse ne doit ni remplir le CRM de doublons, ni relancer autant de
  // fois la même personne. Une deuxième demande met la fiche à jour.
  const { data: existing } = await admin
    .from("prospects")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("email", email)
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (existing) {
    const { error } = await admin.from("prospects").update(row).eq("id", existing.id);
    return !error;
  }
  const { error } = await admin.from("prospects").insert({ tenant_id: tenantId, email, ...row });
  return !error;
}

/** Liste les prospects d'un tenant (CRM). */
export async function listProspects(tenantId: string): Promise<Prospect[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("prospects")
    .select(COLS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<Prospect[]>();
  return data ?? [];
}

const STATUSES = new Set(["nouveau", "contacté", "converti", "ignoré"]);

/** Met à jour le statut d'un prospect (cloisonné au tenant). */
export async function setProspectStatus(tenantId: string, id: string, status: string): Promise<void> {
  if (!STATUSES.has(status)) return;
  const admin = createAdminClient();
  await admin.from("prospects").update({ status }).eq("id", id).eq("tenant_id", tenantId);
}

/** Supprime un prospect (cloisonné au tenant). */
export async function deleteProspect(tenantId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("prospects").delete().eq("id", id).eq("tenant_id", tenantId);
}

/**
 * Les textes de relance réécrits par ce coach.
 *
 * Tout ce qui n'a pas la forme attendue est ignoré silencieusement : la
 * colonne est du JSON libre, et un enregistrement abîmé ne doit pas empêcher
 * les relances de partir. Une étape écartée retombe simplement sur son texte
 * d'origine.
 */
export async function prospectFollowupCopy(tenantId: string | null): Promise<FollowupCopyMap> {
  if (!tenantId) return {};
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_config")
    .select("prospect_followup_copy")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ prospect_followup_copy: unknown }>();
  return readFollowupCopy(data?.prospect_followup_copy);
}

/** Valide une carte de textes venue de la base ou d'un formulaire. Pure. */
export function readFollowupCopy(raw: unknown): FollowupCopyMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: FollowupCopyMap = {};
  for (const [cle, val] of Object.entries(raw as Record<string, unknown>)) {
    const step = Number(cle);
    if (!Number.isInteger(step) || step < 1 || step > MAX_FOLLOWUPS) continue;
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const o = val as { subject?: unknown; body?: unknown };
    const subject = typeof o.subject === "string" ? o.subject.trim().slice(0, 200) : "";
    const body = typeof o.body === "string" ? o.body.trim().slice(0, 4000) : "";
    // Une étape vide des deux côtés n'est pas une personnalisation : la garder
    // ferait croire à l'éditeur qu'un texte existe alors qu'il est d'origine.
    if (!subject && !body) continue;
    out[step] = { subject, body };
  }
  return out;
}

/** Enregistre les textes de relance. Cloisonné au tenant. */
export async function saveProspectFollowupCopy(tenantId: string, raw: unknown): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("coach_config")
    .update({ prospect_followup_copy: readFollowupCopy(raw) })
    .eq("tenant_id", tenantId);
}

/** Les relances automatiques sont-elles activées pour ce tenant ? */
export async function prospectFollowupEnabled(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_config")
    .select("prospect_followup_enabled")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ prospect_followup_enabled: boolean | null }>();
  return !!data?.prospect_followup_enabled;
}
