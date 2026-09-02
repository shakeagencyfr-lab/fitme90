import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PROGRAM_CREDITS } from "@/lib/config";

// UN SEUL crédit IA. Toute action IA (message du chat, recette, alternative
// d'exercice, fiche exercice) coûte 1 crédit ; une génération de programme en
// coûte N, réglé par le fournisseur de crédits (défaut 10). Le portefeuille est
// celui du tenant qui ACHÈTE : un coach chez son revendeur, un revendeur chez la
// plateforme. Tout est verrouillé au service_role (RLS deny-all).

export interface Wallet {
  credits: number;
}

const ZERO: Wallet = { credits: 0 };

/** Solde d'un tenant. Crée la ligne (à 0) si elle n'existe pas encore. */
export async function getWallet(tenantId: string | null): Promise<Wallet> {
  if (!tenantId) return ZERO;
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_wallets")
    .select("credits")
    .eq("tenant_id", tenantId)
    .maybeSingle<{ credits: number }>();
  if (data) return { credits: data.credits };
  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });
  return ZERO;
}

/** Motifs de mouvement du journal. Les débits portent le client concerné. */
export type LedgerReason = "purchase" | "adjust" | "message" | "recipe" | "alternative" | "guide" | "generate" | "block";

/** Crédite le portefeuille (ajustement manuel, geste commercial). Renvoie le nouveau solde. */
export async function creditWallet(tenantId: string, amount: number, reason: LedgerReason = "adjust", ref?: string | null): Promise<number> {
  const admin = createAdminClient();
  const add = Math.max(0, Math.trunc(amount));
  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });
  const current = await getWallet(tenantId);
  const next = current.credits + add;
  await admin.from("credit_wallets").update({ credits: next, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
  await admin.from("credit_ledger").insert({ tenant_id: tenantId, delta: add, reason, ref: ref ?? null });
  return next;
}

/**
 * Crédite un ACHAT de façon idempotente : une session Stripe ne crédite qu'une
 * fois. On réserve d'abord le mouvement (ligne de journal avec ref unique) ;
 * si le ref existe déjà, l'achat a déjà été traité. Renvoie true si le crédit
 * vient d'être posé.
 */
export async function applyPurchaseCredit(
  tenantId: string,
  credits: number,
  sessionRef: string,
  /** Montant réellement payé, en centimes : base du coût réel du crédit. */
  priceCents?: number | null,
): Promise<boolean> {
  if (!credits || credits <= 0 || !sessionRef) return false;
  const admin = createAdminClient();
  const { error } = await admin.from("credit_ledger").insert({
    tenant_id: tenantId,
    delta: credits,
    reason: "purchase",
    ref: sessionRef,
    price_cents: priceCents != null && priceCents >= 0 ? Math.round(priceCents) : null,
  });
  if (error) return false; // conflit d'unicité = déjà crédité

  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });
  const w = await getWallet(tenantId);
  await admin
    .from("credit_wallets")
    .update({ credits: w.credits + credits, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
  return true;
}

export interface PurchaseLine {
  /** Crédits reçus. */
  credits: number;
  /** Montant payé, en centimes. */
  priceCents: number;
}

/**
 * Coût unitaire RÉEL d'un crédit, en centimes, moyenné sur les achats.
 *
 * Le prix unitaire affiché par le fournisseur n'est qu'un prix conseillé : le
 * montant facturé vient du PACK, que le fournisseur peut remiser au volume. Un
 * acheteur qui simulait sa marge sur le prix affiché se trompait donc dès qu'un
 * pack était remisé. Renvoie null si aucun achat chiffré n'existe, à charge de
 * l'appelant de retomber sur une autre base.
 */
export function averagePurchaseCostCents(lines: PurchaseLine[]): number | null {
  let credits = 0;
  let cents = 0;
  for (const l of lines) {
    if (!(l.credits > 0) || !(l.priceCents >= 0)) continue;
    credits += l.credits;
    cents += l.priceCents;
  }
  return credits > 0 ? cents / credits : null;
}

/**
 * Coût unitaire réel d'un crédit pour un acheteur, en centimes :
 *   1. moyenne de ses achats déjà payés (la vérité) ;
 *   2. sinon le meilleur tarif unitaire des packs actifs de son fournisseur
 *      (ce qu'il paierait s'il achetait maintenant) ;
 *   3. sinon null, l'appelant retombe sur le prix affiché du fournisseur.
 */
export async function realCreditCostCents(buyerTenantId: string | null): Promise<number | null> {
  if (!buyerTenantId) return null;
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("credit_ledger")
    .select("delta, price_cents")
    .eq("tenant_id", buyerTenantId)
    .eq("reason", "purchase")
    .not("price_cents", "is", null)
    .limit(500)
    .returns<{ delta: number; price_cents: number }[]>();

  const avg = averagePurchaseCostCents(
    (rows ?? []).map((r) => ({ credits: r.delta, priceCents: r.price_cents })),
  );
  if (avg != null) return avg;

  // Aucun achat chiffré : on montre le tarif qu'il obtiendrait en achetant.
  const supplierId = await parentOf(buyerTenantId);
  if (!supplierId) return null;
  const { data: packs } = await admin
    .from("credit_packs")
    .select("credits, price_cents")
    .eq("tenant_id", supplierId)
    .eq("is_active", true)
    .limit(50)
    .returns<{ credits: number; price_cents: number }[]>();

  const units = (packs ?? [])
    .filter((p) => p.credits > 0 && p.price_cents >= 0)
    .map((p) => p.price_cents / p.credits);
  return units.length ? Math.min(...units) : null;
}

export interface DebitResult {
  ok: boolean;
  remaining: number;
}

/**
 * Débite ATOMIQUEMENT le portefeuille (UPDATE conditionnel côté Postgres :
 * aucune course entre deux actions simultanées). Renvoie ok=false sans rien
 * débiter si le solde est insuffisant. `clientId` = le client à l'origine de
 * l'action, pour le journal de consommation du coach.
 */
export async function debitWallet(
  tenantId: string,
  amount: number,
  reason: LedgerReason,
  clientId?: string | null,
): Promise<DebitResult> {
  const need = Math.max(1, Math.trunc(amount));
  const admin = createAdminClient();
  await admin.from("credit_wallets").upsert({ tenant_id: tenantId }, { onConflict: "tenant_id" });
  const { data: remaining } = await admin.rpc("debit_credit", { p_tenant: tenantId, p_amount: need });
  if (typeof remaining !== "number") {
    const bal = await getWallet(tenantId);
    return { ok: false, remaining: bal.credits };
  }
  await admin.from("credit_ledger").insert({ tenant_id: tenantId, delta: -need, reason, client_id: clientId ?? null });
  return { ok: true, remaining };
}

// ------------------------------------------------------------------ fournisseur
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
 * modèle crédits) plutôt que les plafonds journaliers ? Porte d'accès des
 * routes IA.
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

/**
 * Coût d'une génération de programme, en crédits, pour un tenant ACHETEUR :
 * celui fixé par son fournisseur (le parent). Défaut 10.
 */
export async function programCreditCost(buyerTenantId: string | null): Promise<number> {
  if (!buyerTenantId) return DEFAULT_PROGRAM_CREDITS;
  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", buyerTenantId)
    .maybeSingle<{ parent_id: string | null }>();
  if (!t?.parent_id) return DEFAULT_PROGRAM_CREDITS;
  const { data: p } = await admin
    .from("tenants")
    .select("ai_program_credits")
    .eq("id", t.parent_id)
    .maybeSingle<{ ai_program_credits: number | null }>();
  const n = p?.ai_program_credits;
  return n != null && n > 0 ? n : DEFAULT_PROGRAM_CREDITS;
}

// ------------------------------------------------------------------ chaîne de fourniture
/**
 * Fourniture d'IA d'un revendeur : sa propre clé (byok) ou des crédits achetés
 * à la plateforme (platform_credits), qu'il revend à ses coachs avec sa marge.
 */
export async function resellerSupply(tenantId: string | null): Promise<"byok" | "platform_credits"> {
  if (!tenantId) return "byok";
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("ai_supply")
    .eq("id", tenantId)
    .maybeSingle<{ ai_supply: string | null }>();
  return data?.ai_supply === "platform_credits" ? "platform_credits" : "byok";
}

/** Revendeur (parent) d'un coach, ou null. */
async function parentOf(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ parent_id: string | null }>();
  return data?.parent_id ?? null;
}

export type AiUsageKind = "action" | "program";

/**
 * Ce qu'une réponse du coach doit débiter, selon ce qui s'est RÉELLEMENT passé.
 *
 * Trois outils modifient le programme, mais un seul rappelle le modèle :
 * `adapter_programme` régénère un bloc entier (coût réel mesuré 0,0706 $), là
 * où le changement de jours et la modification nutrition sont des recalculs
 * DÉTERMINISTES, sans appel IA. Les débiter comme une génération faisait payer
 * 10 crédits, soit 4 € au tarif par défaut, pour 0,0044 € de conso réelle.
 */
export function coachUsageToCharge(regenerated: boolean): AiUsageKind[] {
  return regenerated ? ["action", "program"] : ["action"];
}

export interface AiAllowance {
  ok: boolean;
  /** Message à afficher au client si refus. */
  error?: string;
  /** Crédits que l'action coûtera au coach (0 si le coach n'est pas en crédits). */
  coachCost: number;
  /** Crédits que l'action coûtera au revendeur (0 s'il n'achète pas à la plateforme). */
  resellerCost: number;
  resellerId: string | null;
}

/**
 * Une action IA peut-elle avoir lieu, et que coûtera-t-elle à chaque étage ?
 * Deux portefeuilles peuvent être concernés : celui du coach (s'il achète ses
 * crédits à son revendeur) et celui du revendeur (s'il achète les siens à la
 * plateforme). On vérifie AVANT l'appel modèle, on débite APRÈS succès.
 */
export async function checkAiAllowance(coachTenantId: string | null, kind: AiUsageKind): Promise<AiAllowance> {
  const none: AiAllowance = { ok: true, coachCost: 0, resellerCost: 0, resellerId: null };
  if (!coachTenantId) return none;
  const resellerId = await parentOf(coachTenantId);
  if (!resellerId) return none;

  const [model, supply] = await Promise.all([resellerModel(resellerId), resellerSupply(resellerId)]);
  const coachCost = model === "credits" ? (kind === "program" ? await programCreditCost(coachTenantId) : 1) : 0;
  const resellerCost =
    supply === "platform_credits" ? (kind === "program" ? await programCreditCost(resellerId) : 1) : 0;
  const base = { coachCost, resellerCost, resellerId };

  if (coachCost > 0) {
    const w = await getWallet(coachTenantId);
    if (w.credits < coachCost) {
      return {
        ...base,
        ok: false,
        error:
          kind === "program"
            ? `Crédits IA insuffisants (une génération en demande ${coachCost}). Ton coach doit recharger.`
            : "Crédits IA épuisés. Ton coach doit recharger des crédits pour réactiver l'assistant.",
      };
    }
  }
  if (resellerCost > 0) {
    const w = await getWallet(resellerId);
    if (w.credits < resellerCost) {
      return {
        ...base,
        ok: false,
        error: "L'IA est momentanément indisponible : le fournisseur de ton coach doit recharger ses crédits.",
      };
    }
  }
  return { ...base, ok: true };
}

/**
 * Débite chaque étage concerné après une action réussie. Le coach paie son
 * revendeur, le revendeur paie la plateforme : deux journaux, deux soldes, une
 * seule action. `clientId` alimente le journal du coach ; le journal du
 * revendeur porte le coach concerné.
 *
 * Renvoie les crédits RÉELLEMENT débités au coach (0 en BYOK), pour que
 * l'historique de consommation enregistre le débit constaté, pas une
 * estimation refaite de son côté.
 */
export async function chargeAiUsage(
  coachTenantId: string | null,
  kind: AiUsageKind,
  reason: LedgerReason,
  clientId?: string | null,
): Promise<number> {
  if (!coachTenantId) return 0;
  const a = await checkAiAllowance(coachTenantId, kind);
  let charged = 0;
  if (a.coachCost > 0 && (await debitWallet(coachTenantId, a.coachCost, reason, clientId)).ok) {
    charged = a.coachCost;
  }
  if (a.resellerCost > 0 && a.resellerId) {
    // Journal du revendeur : le « client » est le coach (owner) concerné.
    const admin = createAdminClient();
    const { data: owner } = await admin
      .from("profiles")
      .select("id")
      .eq("tenant_id", coachTenantId)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle<{ id: string }>();
    await debitWallet(a.resellerId, a.resellerCost, reason, owner?.id ?? null);
  }
  return charged;
}

// ------------------------------------------------------------------ packs
export interface CreditPack {
  id: number;
  tenant_id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  position: number;
}

const PACK_COLS = "id, tenant_id, name, credits, price_cents, currency, is_active, position";

/** Packs proposés par un fournisseur (revendeur ou plateforme). */
export async function listCreditPacks(supplierId: string): Promise<CreditPack[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_packs")
    .select(PACK_COLS)
    .eq("tenant_id", supplierId)
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
  supplierId: string,
  input: { name: string; credits: number; priceCents: number; currency?: string },
): Promise<PackResult> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: "Donne un nom au pack." };
  if (!Number.isInteger(input.credits) || input.credits <= 0) return { error: "Nombre de crédits invalide." };
  if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) return { error: "Prix invalide." };
  const admin = createAdminClient();
  const { error } = await admin.from("credit_packs").insert({
    tenant_id: supplierId,
    name,
    credits: input.credits,
    price_cents: input.priceCents,
    currency: (input.currency ?? "eur").toLowerCase(),
  });
  if (error) return { error: "Enregistrement impossible." };
  return { ok: true };
}

export async function setCreditPackActive(supplierId: string, id: number, active: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("credit_packs").update({ is_active: active }).eq("id", id).eq("tenant_id", supplierId);
}

export async function deleteCreditPack(supplierId: string, id: number): Promise<void> {
  const admin = createAdminClient();
  await admin.from("credit_packs").delete().eq("id", id).eq("tenant_id", supplierId);
}

/** Un pack précis appartenant à ce fournisseur (pour le paiement). */
export async function creditPackById(supplierId: string, id: number): Promise<CreditPack | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_packs")
    .select(PACK_COLS)
    .eq("id", id)
    .eq("tenant_id", supplierId)
    .maybeSingle<CreditPack>();
  return data ?? null;
}

// ------------------------------------------------------------------ journal
export interface LedgerEntry {
  id: number;
  delta: number;
  reason: LedgerReason | string;
  createdAt: string;
  clientId: string | null;
  clientName: string | null;
}

/**
 * Journal de consommation d'un tenant, le plus récent en premier, avec le nom
 * du client à l'origine de chaque débit. C'est l'écran « où passent mes
 * crédits » du coach.
 */
export async function listLedger(tenantId: string, limit = 200): Promise<LedgerEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_ledger")
    .select("id, delta, reason, created_at, client_id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<{ id: number; delta: number; reason: string; created_at: string; client_id: string | null }[]>();
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.client_id).filter((x): x is string => !!x)));
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, name, email")
      .in("id", ids)
      .returns<{ id: string; name: string | null; email: string | null }[]>();
    for (const p of profs ?? []) names.set(p.id, p.name || p.email || "Client");
  }
  return rows.map((r) => ({
    id: r.id,
    delta: r.delta,
    reason: r.reason,
    createdAt: r.created_at,
    clientId: r.client_id,
    clientName: r.client_id ? (names.get(r.client_id) ?? "Client supprimé") : null,
  }));
}
