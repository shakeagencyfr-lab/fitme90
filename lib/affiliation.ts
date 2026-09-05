import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Affiliation / parrainage : le coach l'active pour ses clients (option vendue
// par le revendeur). Chaque client dispose d'un lien personnel ; une personne
// qui s'inscrit via ce lien est rattachée à son parrain. Le coach définit la
// récompense et suit les parrainages ; chaque client voit qui a rejoint via lui.

export interface AffiliationConfig {
  enabled: boolean;
  reward: string | null;
}

/** Réglages d'affiliation d'un coach. */
export async function affiliationConfig(tenantId: string | null): Promise<AffiliationConfig> {
  if (!tenantId) return { enabled: false, reward: null };
  const admin = createAdminClient();
  const { data } = await admin
    .from("coach_config")
    .select("affiliation_enabled, affiliation_reward")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ affiliation_enabled: boolean | null; affiliation_reward: string | null }>();
  return { enabled: !!data?.affiliation_enabled, reward: data?.affiliation_reward ?? null };
}

/** Active/désactive l'affiliation et enregistre la récompense (coach). */
export async function setAffiliation(tenantId: string, enabled: boolean, reward: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("coach_config")
    .upsert(
      {
        tenant_id: tenantId,
        affiliation_enabled: enabled,
        affiliation_reward: reward.trim().slice(0, 200) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
}

function randomCode(): string {
  // 8 caractères base36 lisibles (sans ambiguïté forte), en majuscules.
  const s = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
  return s.toUpperCase();
}

/** Récupère (ou crée) le code de parrainage personnel d'un client. */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle<{ referral_code: string | null }>();
  if (data?.referral_code) return data.referral_code;

  for (let i = 0; i < 5; i++) {
    const code = randomCode();
    const { error } = await admin.from("profiles").update({ referral_code: code }).eq("id", userId);
    if (!error) return code;
    // collision improbable : on retente avec un autre code
  }
  return null;
}

/**
 * Résout un code de parrainage vers l'id du parrain, à condition qu'il soit un
 * client du même tenant. Renvoie null sinon.
 */
export async function resolveReferrer(code: string, tenantId: string): Promise<string | null> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(clean)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", clean)
    .eq("tenant_id", tenantId)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

/**
 * Rattache un nouveau client à son parrain (via le code), si l'affiliation est
 * active pour le tenant et que le code est valide. Idempotent, ne s'auto-parraine
 * jamais.
 */
export async function attachReferral(newUserId: string, tenantId: string, code: string): Promise<void> {
  const cfg = await affiliationConfig(tenantId);
  if (!cfg.enabled) return;
  const sponsor = await resolveReferrer(code, tenantId);
  if (!sponsor || sponsor === newUserId) return;
  const admin = createAdminClient();
  // N'écrase pas un parrain déjà posé.
  const { data: prof } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", newUserId)
    .maybeSingle<{ referred_by: string | null }>();
  if (prof?.referred_by) return;
  await admin.from("profiles").update({ referred_by: sponsor }).eq("id", newUserId);
}

export interface ReferralEntry {
  id: string;
  name: string | null;
  joinedAt: string;
  converted: boolean;
}

function isConverted(p: { paid: boolean | null; subscription_status: string | null }): boolean {
  return !!p.paid || p.subscription_status === "active" || p.subscription_status === "trialing";
}

export interface ClientAffiliation {
  enabled: boolean;
  reward: string | null;
  code: string | null;
  referrals: ReferralEntry[];
}

/** Vue parrainage d'un client : son lien, la récompense, ses filleuls. */
export async function clientAffiliation(userId: string, tenantId: string | null): Promise<ClientAffiliation> {
  const cfg = await affiliationConfig(tenantId);
  if (!cfg.enabled) return { enabled: false, reward: cfg.reward, code: null, referrals: [] };

  const code = await ensureReferralCode(userId);
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, name, created_at, paid, subscription_status")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false })
    .returns<{ id: string; name: string | null; created_at: string; paid: boolean | null; subscription_status: string | null }[]>();

  const referrals: ReferralEntry[] = (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    joinedAt: p.created_at,
    converted: isConverted(p),
  }));
  return { enabled: true, reward: cfg.reward, code, referrals };
}

export interface CoachReferralRow {
  sponsorId: string | null;
  sponsorName: string | null;
  sponsorEmail: string | null;
  referredId: string;
  referredName: string | null;
  referredEmail: string | null;
  joinedAt: string;
  converted: boolean;
}

export interface CoachAffiliationOverview {
  enabled: boolean;
  reward: string | null;
  total: number;
  converted: number;
  rows: CoachReferralRow[];
}

/** Vue coach : tous les parrainages de ses clients. */
export async function coachAffiliationOverview(tenantId: string): Promise<CoachAffiliationOverview> {
  const cfg = await affiliationConfig(tenantId);
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, name, email, created_at, paid, subscription_status, referred_by")
    .eq("tenant_id", tenantId)
    .not("referred_by", "is", null)
    .order("created_at", { ascending: false })
    .returns<
      { id: string; name: string | null; email: string | null; created_at: string; paid: boolean | null; subscription_status: string | null; referred_by: string | null }[]
    >();

  const list = data ?? [];
  // Noms et adresses des parrains (une requête).
  const sponsorIds = Array.from(new Set(list.map((p) => p.referred_by).filter(Boolean))) as string[];
  const parrains = new Map<string, { name: string | null; email: string | null }>();
  if (sponsorIds.length > 0) {
    const { data: sponsors } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", sponsorIds)
      .returns<{ id: string; name: string | null; email: string | null }[]>();
    for (const s of sponsors ?? []) parrains.set(s.id, { name: s.name, email: s.email });
  }

  const rows: CoachReferralRow[] = list.map((p) => ({
    sponsorId: p.referred_by,
    sponsorName: p.referred_by ? parrains.get(p.referred_by)?.name ?? null : null,
    sponsorEmail: p.referred_by ? parrains.get(p.referred_by)?.email ?? null : null,
    referredId: p.id,
    referredName: p.name,
    referredEmail: p.email,
    joinedAt: p.created_at,
    converted: isConverted(p),
  }));

  return {
    enabled: cfg.enabled,
    reward: cfg.reward,
    total: rows.length,
    converted: rows.filter((r) => r.converted).length,
    rows,
  };
}

/** Une personne dans une relation de parrainage, telle que le coach la lit. */
export interface ReferralPerson {
  id: string;
  name: string | null;
  email: string | null;
  joinedAt: string;
  converted: boolean;
}

export interface ClientReferralLinks {
  /** Qui l'a amené, s'il est venu par un lien de parrainage. */
  sponsor: ReferralPerson | null;
  /** Qui il a amené. */
  referees: ReferralPerson[];
}

const PERSON_COLS = "id, name, email, created_at, paid, subscription_status";
type PersonRow = { id: string; name: string | null; email: string | null; created_at: string; paid: boolean | null; subscription_status: string | null };

function toPerson(p: PersonRow): ReferralPerson {
  return { id: p.id, name: p.name, email: p.email, joinedAt: p.created_at, converted: isConverted(p) };
}

/**
 * Les deux sens du parrainage sur une fiche client : son parrain, ses
 * filleuls. Le tout borné au tenant du coach, même si un parrain venait à
 * changer de coach. Indépendant de l'activation : un parrainage déjà fait
 * reste lisible même si le coach a coupé l'option depuis.
 */
export async function clientReferralLinks(userId: string, tenantId: string): Promise<ClientReferralLinks> {
  const admin = createAdminClient();
  const { data: me } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle<{ referred_by: string | null }>();

  const [{ data: sponsor }, { data: referees }] = await Promise.all([
    me?.referred_by
      ? admin.from("profiles").select(PERSON_COLS).eq("id", me.referred_by).eq("tenant_id", tenantId).maybeSingle<PersonRow>()
      : Promise.resolve({ data: null as PersonRow | null }),
    admin
      .from("profiles")
      .select(PERSON_COLS)
      .eq("referred_by", userId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .returns<PersonRow[]>(),
  ]);

  return {
    sponsor: sponsor ? toPerson(sponsor) : null,
    referees: (referees ?? []).map(toPerson),
  };
}
