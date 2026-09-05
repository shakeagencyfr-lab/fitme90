import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Paliers d'abonnement d'un vendeur (facturation Lot C). Primitif générique :
// la plateforme propose des paliers aux revendeurs, un revendeur en propose à
// ses coachs/salles. `tenant_id` = le VENDEUR. Chaque palier accorde une
// capacité clients (client_limit ; NULL = illimité) et un prix récurrent, plus
// d'éventuels frais de mise en place one-shot (salles).

/** Nombre maximum de paliers par vendeur (garde-fou UI). */
export const MAX_PLANS_PER_TENANT = 8;

export interface Plan {
  id: string;
  tenant_id: string;
  name: string;
  price_month_cents: number | null;
  price_year_cents: number | null;
  /** Capacité clients accordée à l'acheteur ; null = illimité. */
  client_limit: number | null;
  setup_fee_cents: number;
  /** Ce palier inclut-il le mini-site « Mon site » de ses coachs ? */
  site_included: boolean;
  is_active: boolean;
  position: number;
  created_at: string;
}

const PLAN_COLS =
  "id, tenant_id, name, price_month_cents, price_year_cents, client_limit, setup_fee_cents, site_included, is_active, position, created_at";

/** Paliers d'un vendeur, ordonnés (pour le dashboard). */
export async function listPlans(tenantId: string): Promise<Plan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("plans")
    .select(PLAN_COLS)
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Plan[];
}

export interface CreatePlanInput {
  name: string;
  priceMonthCents?: number | null;
  priceYearCents?: number | null;
  /** null = illimité. */
  clientLimit?: number | null;
  setupFeeCents?: number | null;
  /** Le palier ouvre-t-il « Mon site » à ses coachs, sans supplément ? */
  siteIncluded?: boolean;
}

export interface CreatePlanResult {
  ok: boolean;
  error?: string;
}

function validCents(c: number | null | undefined): boolean {
  return c == null || (Number.isFinite(c) && c >= 0);
}

export async function createPlan(tenantId: string, input: CreatePlanInput): Promise<CreatePlanResult> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Donne un nom au palier." };

  const priceMonthCents = input.priceMonthCents ?? null;
  const priceYearCents = input.priceYearCents ?? null;
  const setupFeeCents = input.setupFeeCents ?? 0;
  if (!validCents(priceMonthCents) || !validCents(priceYearCents) || !validCents(setupFeeCents)) {
    return { ok: false, error: "Prix invalide." };
  }
  if (priceMonthCents == null && priceYearCents == null) {
    return { ok: false, error: "Renseigne au moins un prix (mensuel ou annuel)." };
  }

  // clientLimit : null = illimité ; sinon entier >= 0.
  const clientLimit = input.clientLimit ?? null;
  if (clientLimit != null && (!Number.isInteger(clientLimit) || clientLimit < 0)) {
    return { ok: false, error: "Nombre de clients invalide." };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("plans")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((count ?? 0) >= MAX_PLANS_PER_TENANT) {
    return { ok: false, error: `Maximum ${MAX_PLANS_PER_TENANT} paliers par compte.` };
  }

  const { error } = await admin.from("plans").insert({
    tenant_id: tenantId,
    name,
    price_month_cents: priceMonthCents,
    price_year_cents: priceYearCents,
    client_limit: clientLimit,
    setup_fee_cents: setupFeeCents ?? 0,
    site_included: !!input.siteIncluded,
    position: count ?? 0,
  });
  if (error) return { ok: false, error: "Création impossible." };
  return { ok: true };
}

/**
 * Ouvre ou ferme « Mon site » sur un palier existant.
 *
 * Une bascule à part, et pas un champ de plus dans un formulaire d'édition :
 * c'est la seule chose qu'un revendeur ait de bonnes raisons de changer sur un
 * palier déjà vendu. Le prix et la capacité, eux, décrivent ce que ses coachs
 * ont acheté.
 *
 * L'effet est immédiat pour tous les coachs du palier : `siteAccess` relit
 * cette colonne à chaque visite, personne n'a à se réabonner.
 */
export async function setPlanSiteIncluded(
  tenantId: string,
  planId: string,
  included: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("plans")
    .update({ site_included: included })
    .eq("id", planId)
    .eq("tenant_id", tenantId);
}

/** Active / désactive un palier. */
export async function setPlanActive(tenantId: string, planId: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("plans").update({ is_active: active }).eq("id", planId).eq("tenant_id", tenantId);
}

/** Supprime un palier. */
export async function deletePlan(tenantId: string, planId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("plans").delete().eq("id", planId).eq("tenant_id", tenantId);
}
