import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Portefeuille de crédits IA (Modèle B « revendeur en crédits »). Chaque COACH a
// un solde de deux types de crédits, alimenté par l'achat de packs auprès de son
// revendeur, et débité à chaque action (1 crédit IA) ou génération de programme
// (N crédits programme). Tout est verrouillé au service_role (RLS deny-all).

export type CreditKind = "ai" | "program";

export interface Wallet {
  aiCredits: number;
  programCredits: number;
}

const ZERO: Wallet = { aiCredits: 0, programCredits: 0 };

/** Solde du coach. Crée la ligne (à 0) si elle n'existe pas encore. */
export async function getWallet(tenantId: string | null): Promise<Wallet> {
  if (!tenantId) return ZERO;
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_wallets")
    .select("ai_credits, program_credits")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ ai_credits: number; program_credits: number }>();
  if (data) return { aiCredits: data.ai_credits, programCredits: data.program_credits };
  // Pas encore de portefeuille : on l'initialise à zéro (idempotent).
  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });
  return ZERO;
}

const COL: Record<CreditKind, "ai_credits" | "program_credits"> = {
  ai: "ai_credits",
  program: "program_credits",
};

/** Crédite le portefeuille (achat de pack, ajustement). Renvoie le nouveau solde. */
export async function creditWallet(
  tenantId: string,
  kind: CreditKind,
  amount: number,
  reason: string,
  ref?: string | null,
): Promise<number> {
  const admin = createAdminClient();
  const col = COL[kind];
  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });
  const current = await getWallet(tenantId);
  const next = (kind === "ai" ? current.aiCredits : current.programCredits) + Math.max(0, amount);
  await admin.from("credit_wallets").update({ [col]: next, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
  await admin.from("credit_ledger").insert({ tenant_id: tenantId, kind, delta: Math.max(0, amount), reason, ref: ref ?? null });
  return next;
}

/**
 * Crédite un ACHAT de façon idempotente (une session Stripe ne peut créditer
 * qu'une fois). On « réserve » d'abord le mouvement (insert du ledger avec ref
 * unique) : si le ref existe déjà, l'achat a déjà été traité → on ne recrédite
 * pas. Sinon on incrémente le solde. Renvoie true si le crédit vient d'être posé.
 */
export async function applyPurchaseCredit(
  tenantId: string,
  kind: CreditKind,
  credits: number,
  sessionRef: string,
): Promise<boolean> {
  if (!credits || credits <= 0 || !sessionRef) return false;
  const admin = createAdminClient();
  // Claim-first : l'index unique partiel bloque un second crédit du même ref.
  const { error } = await admin
    .from("credit_ledger")
    .insert({ tenant_id: tenantId, kind, delta: credits, reason: "purchase", ref: sessionRef });
  if (error) return false; // conflit d'unicité = déjà crédité

  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });
  const w = await getWallet(tenantId);
  const col = COL[kind];
  const next = (kind === "ai" ? w.aiCredits : w.programCredits) + credits;
  await admin.from("credit_wallets").update({ [col]: next, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
  return true;
}

export interface PackCredited {
  ai: number;
  program: number;
}

/**
 * Crédite l'achat d'un pack HYBRIDE : un seul paiement, jusqu'à deux types de
 * crédits. Chaque type est réservé séparément dans le ledger (index unique sur
 * (ref, kind)), donc recharger la page ne recrédite rien, et un type déjà posé
 * n'empêche pas l'autre d'être posé. Renvoie ce qui vient d'être ajouté.
 */
export async function applyPackPurchase(
  tenantId: string,
  aiCredits: number,
  programCredits: number,
  sessionRef: string,
): Promise<PackCredited> {
  const ai = (await applyPurchaseCredit(tenantId, "ai", aiCredits, sessionRef)) ? aiCredits : 0;
  const program = (await applyPurchaseCredit(tenantId, "program", programCredits, sessionRef))
    ? programCredits
    : 0;
  return { ai, program };
}

export interface DebitResult {
  ok: boolean;
  remaining: number;
}

/**
 * Débite ATOMIQUEMENT le portefeuille (une seule requête UPDATE conditionnelle,
 * donc pas de course entre deux actions simultanées). Renvoie ok=false sans rien
 * débiter si le solde est insuffisant.
 */
export async function debitWallet(
  tenantId: string,
  kind: CreditKind,
  amount: number,
  reason: string,
  ref?: string | null,
): Promise<DebitResult> {
  const need = Math.max(1, amount);
  const admin = createAdminClient();
  // S'assure qu'un portefeuille existe (sinon rien à débiter → solde 0).
  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });

  // Débit atomique côté Postgres : renvoie le solde restant, ou NULL si insuffisant.
  const { data: remaining } = await admin.rpc("debit_credit", {
    p_tenant: tenantId,
    p_kind: kind,
    p_amount: need,
  });

  if (typeof remaining !== "number") {
    const bal = await getWallet(tenantId);
    return { ok: false, remaining: kind === "ai" ? bal.aiCredits : bal.programCredits };
  }
  await admin.from("credit_ledger").insert({ tenant_id: tenantId, kind, delta: -need, reason, ref: ref ?? null });
  return { ok: true, remaining };
}

// ------------------------------------------------------------------ modèle revendeur
/** Modèle de monétisation d'un revendeur : 'subscription' (défaut) ou 'credits'. */
export async function resellerModel(tenantId: string | null): Promise<"subscription" | "credits"> {
  if (!tenantId) return "subscription";
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("reseller_model")
    .eq("id", tenantId)
    .maybeSingle<{ reseller_model: string | null }>();
  return data?.reseller_model === "credits" ? "credits" : "subscription";
}

/**
 * Les clients de ce coach consomment-ils des CRÉDITS (revendeur parent en
 * Modèle crédits) plutôt que les plafonds journaliers ? Utilisé par les routes
 * IA pour choisir la porte d'accès : solde de crédits vs plafonds.
 */
export async function clientUsesCredits(coachTenantId: string | null): Promise<boolean> {
  if (!coachTenantId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", coachTenantId)
    .maybeSingle<{ parent_id: string | null }>();
  if (!data?.parent_id) return false;
  return (await resellerModel(data.parent_id)) === "credits";
}

// ------------------------------------------------------------------ packs de crédits
/**
 * Un pack vendu par le revendeur. HYBRIDE : il peut contenir des crédits IA et
 * des crédits programme à la fois, réglés en un seul paiement. Un pack mono-type
 * n'est que le cas particulier où l'un des deux compteurs vaut 0.
 */
export interface CreditPack {
  id: number;
  tenant_id: string;
  name: string;
  ai_credits: number;
  program_credits: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  position: number;
}

const PACK_COLS =
  "id, tenant_id, name, ai_credits, program_credits, price_cents, currency, is_active, position";

/** Packs proposés par un revendeur (tous, pour son dashboard). */
export async function listCreditPacks(resellerId: string): Promise<CreditPack[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_packs")
    .select(PACK_COLS)
    .eq("tenant_id", resellerId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<CreditPack[]>();
  return data ?? [];
}

export interface PackResult {
  ok?: boolean;
  error?: string;
}

export async function createCreditPack(
  resellerId: string,
  input: { name: string; aiCredits: number; programCredits: number; priceCents: number; currency?: string },
): Promise<PackResult> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: "Donne un nom au pack." };
  const ai = Number.isInteger(input.aiCredits) ? input.aiCredits : NaN;
  const prog = Number.isInteger(input.programCredits) ? input.programCredits : NaN;
  if (!Number.isFinite(ai) || !Number.isFinite(prog) || ai < 0 || prog < 0) {
    return { error: "Nombre de crédits invalide." };
  }
  if (ai + prog <= 0) return { error: "Mets au moins un crédit IA ou un crédit programme." };
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) return { error: "Prix invalide." };
  const admin = createAdminClient();
  const { error } = await admin.from("credit_packs").insert({
    tenant_id: resellerId,
    name,
    ai_credits: ai,
    program_credits: prog,
    price_cents: input.priceCents,
    currency: (input.currency ?? "eur").toLowerCase(),
  });
  if (error) return { error: "Enregistrement impossible." };
  return { ok: true };
}

export async function setCreditPackActive(resellerId: string, id: number, active: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("credit_packs").update({ is_active: active }).eq("id", id).eq("tenant_id", resellerId);
}

export async function deleteCreditPack(resellerId: string, id: number): Promise<void> {
  const admin = createAdminClient();
  await admin.from("credit_packs").delete().eq("id", id).eq("tenant_id", resellerId);
}

/** Un pack précis appartenant à ce revendeur (pour le paiement). */
export async function creditPackById(resellerId: string, id: number): Promise<CreditPack | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_packs")
    .select(PACK_COLS)
    .eq("id", id)
    .eq("tenant_id", resellerId)
    .maybeSingle<CreditPack>();
  return data ?? null;
}
