import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { whoPays, type SupplyFacts, type UsageCharge } from "@/lib/ai-supply";
import { DEFAULT_PROGRAM_CREDITS, suggestedPackPriceCents } from "@/lib/config";

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

/** Un forfait tel qu'on le compare : ce qu'il donne, ce qu'il coûte. */
export interface PackLine {
  name: string;
  credits: number;
  priceCents: number;
}

/** Le forfait le plus intéressant d'une liste, au prix du crédit. */
export interface BestPack {
  name: string;
  credits: number;
  priceCents: number;
  /** Prix d'UN crédit dans ce forfait, en centimes. */
  unitCents: number;
}

/**
 * Le forfait au meilleur rapport, c'est-à-dire au prix du crédit le plus bas.
 *
 * Ce n'est pas le forfait le moins cher : un gros forfait coûte davantage à
 * l'achat mais fait souvent baisser le prix unitaire, et c'est ce prix-là qui
 * décide de ce qu'un plan coûtera vraiment. Comparer les prix affichés
 * désignerait systématiquement le plus petit forfait, le moins avantageux.
 *
 * Fonction pure, donc testable sans base : c'est le calcul qui compte, pas la
 * requête qui l'alimente.
 */
export function bestPackByUnit(packs: readonly PackLine[]): BestPack | null {
  let best: BestPack | null = null;
  for (const p of packs) {
    if (!(p.credits > 0) || !(p.priceCents >= 0)) continue;
    const unitCents = p.priceCents / p.credits;
    if (!best || unitCents < best.unitCents) {
      best = { name: p.name, credits: p.credits, priceCents: p.priceCents, unitCents };
    }
  }
  return best;
}

/**
 * Le meilleur forfait que le FOURNISSEUR de ce compte propose aujourd'hui.
 *
 * Sert à chiffrer en euros ce qu'un plafond en crédits représente. On prend le
 * tarif le plus avantageux à dessein : annoncer au coach une somme qu'il
 * pourrait dépasser en achetant mal serait injuste, tandis que « au mieux, ce
 * plan te coûtera tant » est une borne qu'il maîtrise, puisqu'il lui suffit de
 * prendre ce forfait-là.
 */
export async function bestSupplierPack(buyerTenantId: string | null): Promise<BestPack | null> {
  if (!buyerTenantId) return null;
  const supplierId = await parentOf(buyerTenantId);
  if (!supplierId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_packs")
    .select("name, credits, price_cents")
    .eq("tenant_id", supplierId)
    .eq("is_active", true)
    .limit(50)
    .returns<{ name: string; credits: number; price_cents: number }[]>();
  return bestPackByUnit((data ?? []).map((p) => ({ name: p.name, credits: p.credits, priceCents: p.price_cents })));
}

/**
 * Ce qu'un crédit coûte AUJOURD'HUI à un acheteur, en centimes.
 *
 * L'ordre a été inversé, et c'est un vrai correctif. On partait de la moyenne
 * des achats déjà payés, au motif que c'était « la vérité ». Conséquence : un
 * coach qui avait acheté à l'ancien tarif continuait de voir l'ancien tarif
 * indéfiniment, même après que son revendeur avait changé de prix. Le barème
 * et le coût d'un plan affichaient donc un chiffre périmé, et c'est précisément
 * le chiffre sur lequel il décide d'acheter et de fixer ses prix.
 *
 * Un barème sert à décider, donc il doit montrer le prix EN VIGUEUR :
 *   1. le meilleur tarif unitaire des packs actifs de son fournisseur, c'est-à-
 *      dire ce qu'il paierait en rechargeant maintenant ;
 *   2. sinon le prix unitaire affiché par ce fournisseur ;
 *   3. sinon la moyenne de ses achats passés, faute de mieux ;
 *   4. sinon null, et l'appelant n'annonce aucun chiffre.
 */
export async function creditPriceToday(buyerTenantId: string | null): Promise<number | null> {
  if (!buyerTenantId) return null;
  const admin = createAdminClient();
  const supplierId = await parentOf(buyerTenantId);

  if (supplierId) {
    const { data: packs } = await admin
      .from("credit_packs")
      .select("credits, price_cents")
      .eq("tenant_id", supplierId)
      .eq("is_active", true)
      .limit(50)
      .returns<{ credits: number; price_cents: number }[]>();

    const best = bestPackByUnit(
      (packs ?? []).map((p) => ({ name: "", credits: p.credits, priceCents: p.price_cents })),
    );
    if (best) return best.unitCents;

    // Aucun pack : le prix unitaire que le fournisseur affiche fait foi.
    const { data: sup } = await admin
      .from("tenants")
      .select("ai_credit_price_cents")
      .eq("id", supplierId)
      .maybeSingle<{ ai_credit_price_cents: number | null }>();
    if (sup?.ai_credit_price_cents != null) return Math.max(0, sup.ai_credit_price_cents);
  }

  // Dernier recours : ce qu'il a payé jusqu'ici. Mieux que rien, mais on ne
  // s'en sert que si le fournisseur n'annonce aucun tarif.
  const { data: rows } = await admin
    .from("credit_ledger")
    .select("delta, price_cents")
    .eq("tenant_id", buyerTenantId)
    .eq("reason", "purchase")
    .not("price_cents", "is", null)
    .limit(500)
    .returns<{ delta: number; price_cents: number }[]>();

  return averagePurchaseCostCents(
    (rows ?? []).map((r) => ({ credits: r.delta, priceCents: r.price_cents })),
  );
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
  return whoPays(await coachSupplyFacts(coachTenantId)).coach;
}

/**
 * Les faits de fourniture VUS DEPUIS UN COACH, dispense comprise.
 *
 * `resellerBilling` décrit le revendeur ; il ignore qu'un coach précis peut
 * avoir été dispensé et tourner sur sa propre clé. Un coach dispensé se
 * comporte exactement comme un coach dont le revendeur ne fournit pas : aucun
 * portefeuille ne bouge, il règle Anthropic lui-même.
 */
export async function coachSupplyFacts(coachTenantId: string | null): Promise<SupplyFacts> {
  const aucun: SupplyFacts = { resellerSupplies: false, model: "subscription", supply: "byok" };
  if (!coachTenantId) return aucun;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("parent_id, ai_self_managed")
    .eq("id", coachTenantId)
    .maybeSingle<{ parent_id: string | null; ai_self_managed: boolean | null }>();
  if (!data?.parent_id) return aucun;
  if (data.ai_self_managed) return aucun;
  return resellerBilling(data.parent_id);
}

/**
 * Combien de crédits ce FOURNISSEUR doit débiter à ses filleuls pour une
 * génération de programme.
 *
 * Le nombre de crédits d'une génération n'est pas un levier commercial, c'est
 * une UNITÉ DE COMPTE : il dit combien une génération coûte, rapporté au coût
 * d'une action simple. Celui qui paie l'IA en euros définit cette unité ; ceux
 * qui achètent des crédits la reçoivent.
 *
 * Un revendeur qui achète ses crédits à la plateforme est donc débité dans
 * l'unité de la PLATEFORME. S'il pouvait en choisir une autre pour ses coachs,
 * il vendrait une génération dans une unité différente de celle qu'on lui
 * facture, et perdrait de l'argent à chaque génération sans le voir. C'est
 * exactement ce qui se produisait : plateforme à 30 crédits, revendeur à 10,
 * revendeur débité 30 et encaissant 10.
 *
 * Un revendeur qui a sa PROPRE clé Anthropic, lui, ne reçoit aucune unité :
 * il paie en dollars. Il définit donc librement la sienne.
 *
 * @param depth garde-fou : la chaîne est plateforme → revendeur → coach, mais
 *   une boucle de parenté en base ne doit pas faire tourner la récursion.
 */
export async function supplierProgramCredits(supplierTenantId: string | null, depth = 0): Promise<number> {
  if (!supplierTenantId || depth > 4) return DEFAULT_PROGRAM_CREDITS;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("parent_id, ai_supply, ai_program_credits")
    .eq("id", supplierTenantId)
    .maybeSingle<{ parent_id: string | null; ai_supply: string | null; ai_program_credits: number | null }>();
  if (!data) return DEFAULT_PROGRAM_CREDITS;

  // Il achète ses crédits plus haut : il est facturé dans l'unité de son
  // fournisseur, il la répercute telle quelle.
  if (data.ai_supply === "platform_credits" && data.parent_id) {
    return supplierProgramCredits(data.parent_id, depth + 1);
  }
  const n = data.ai_program_credits;
  return n != null && n > 0 ? n : DEFAULT_PROGRAM_CREDITS;
}

/**
 * Coût d'une génération de programme, en crédits, pour un tenant ACHETEUR :
 * l'unité de son fournisseur, résolue jusqu'à celui qui la définit vraiment.
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
  return supplierProgramCredits(t.parent_id);
}

/**
 * Ce fournisseur peut-il CHOISIR son unité, ou la reçoit-il de plus haut ?
 * Vrai seulement s'il paie l'IA lui-même (plateforme, ou revendeur avec sa
 * propre clé).
 */
export async function canSetProgramCredits(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("parent_id, ai_supply")
    .eq("id", tenantId)
    .maybeSingle<{ parent_id: string | null; ai_supply: string | null }>();
  return !(data?.ai_supply === "platform_credits" && data.parent_id);
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

/**
 * Les trois faits de facturation d'un revendeur, en UNE lecture.
 *
 * Ils vivent sur la même ligne et se lisent toujours ensemble : les demander
 * séparément faisait trois allers-retours par action IA, et laissait la porte
 * ouverte à des décisions prises sur deux d'entre eux seulement.
 *
 * `supplies` est le fait qui commande : si le revendeur ne fournit pas l'IA,
 * ses coachs tournent sur leur propre clé et aucun modèle de facturation ne
 * s'applique.
 */
export async function resellerBilling(tenantId: string | null): Promise<SupplyFacts> {
  const aucun: SupplyFacts = { resellerSupplies: false, model: "subscription", supply: "byok" };
  if (!tenantId) return aucun;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("ai_mode, reseller_model, ai_supply")
    .eq("id", tenantId)
    .maybeSingle<{ ai_mode: string | null; reseller_model: string | null; ai_supply: string | null }>();
  if (!data) return aucun;
  return {
    resellerSupplies: data.ai_mode === "provider",
    model: data.reseller_model === "credits" ? "credits" : "subscription",
    supply: data.ai_supply === "platform_credits" ? "platform_credits" : "byok",
  };
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
 * Ce qu'une réponse du coach doit débiter : UN CRÉDIT, toujours.
 *
 * Y compris quand le client signale une blessure et que `adapter_programme`
 * reconstruit un bloc entier. Ce n'est pas un oubli, c'est une décision.
 *
 * Une adaptation n'est pas un achat, elle est SUBIE. Le client ne demande pas
 * un second programme, il signale qu'il ne peut plus faire le premier. La lui
 * facturer comme une génération (50 crédits, 20 € au tarif par défaut) revient
 * à lui faire payer sa douleur, et surtout à le dissuader de la signaler, ce
 * qui est exactement l'inverse de ce que ce produit doit encourager : un
 * programme adapté à une épaule qui tient est le cœur de la promesse.
 *
 * Le fournisseur absorbe donc la régénération. Elle ne disparaît pas pour
 * autant : l'appel a sa propre ligne dans le journal d'utilisation, avec ses
 * jetons et son vrai modèle, à zéro crédit. On sait ce qu'on absorbe.
 *
 * Les deux autres outils (changement de jours, nutrition) n'appelaient déjà
 * aucun modèle : ce sont des recalculs déterministes.
 */
export function coachUsageToCharge(): AiUsageKind[] {
  return ["action"];
}

// La règle « qui paie » vit dans lib/ai-supply.ts, avec la résolution de clé
// qu'elle doit suivre. Réexportée ici pour les appelants qui raisonnent en
// crédits.
export { whoPays };
export type { SupplyFacts, UsageCharge };

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

  // Les faits vus DEPUIS LE COACH : un coach dispensé par son revendeur tourne
  // sur sa propre clé, et aucun portefeuille ne doit bouger pour lui.
  const faits = await coachSupplyFacts(coachTenantId);
  // Les débits suivent la chaîne de fourniture, exactement comme la résolution
  // de clé : si le revendeur ne fournit pas, le coach tourne sur la sienne et
  // personne n'est débité.
  const pays = whoPays(faits);
  if (!pays.coach && !pays.reseller) return none;

  const coachCost = pays.coach ? (kind === "program" ? await programCreditCost(coachTenantId) : 1) : 0;
  const resellerCost = pays.reseller ? (kind === "program" ? await programCreditCost(resellerId) : 1) : 0;
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
  return (await chargeAiUsageDetailed(coachTenantId, kind, reason, clientId)).coach;
}

/** Ce qu'une action a débité à chaque étage. */
export interface AiCharge {
  /** Crédits pris au coach (0 en BYOK ou quand l'IA est comprise). */
  coach: number;
  /** Crédits pris au revendeur par la plateforme (0 s'il tourne sur sa clé). */
  supplier: number;
}

/**
 * Comme `chargeAiUsage`, mais rend AUSSI le débit du revendeur : le journal
 * l'enregistre en face de l'action, et c'est ce que lit un revendeur en
 * crédits plateforme à la place d'un montant en dollars.
 */
export async function chargeAiUsageDetailed(
  coachTenantId: string | null,
  kind: AiUsageKind,
  reason: LedgerReason,
  clientId?: string | null,
): Promise<AiCharge> {
  if (!coachTenantId) return { coach: 0, supplier: 0 };
  const a = await checkAiAllowance(coachTenantId, kind);
  let charged = 0;
  let supplier = 0;
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
    if ((await debitWallet(a.resellerId, a.resellerCost, reason, owner?.id ?? null)).ok) {
      supplier = a.resellerCost;
    }
  }
  return { coach: charged, supplier };
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

/**
 * Quand un fournisseur change son prix unitaire, ses packs restés au prix
 * conseillé (crédits × ancien prix) suivent le nouveau. Un pack qu'il a
 * lui-même remisé garde son prix : c'est une décision, pas un calcul.
 *
 * Sans ça, le prix affiché aux acheteurs ne bougeait pas : `creditPriceToday`
 * lit d'abord le meilleur pack actif, et un pack créé à 4 centimes le crédit
 * continuait d'annoncer 4 centimes après un passage à 1. Le fournisseur
 * voyait son nouveau prix, ses coachs voyaient l'ancien.
 */
export async function repriceSuggestedPacks(supplierId: string, oldUnitCents: number, newUnitCents: number): Promise<number> {
  if (oldUnitCents === newUnitCents) return 0;
  const admin = createAdminClient();
  const { data } = await admin
    .from("credit_packs")
    .select("id, credits, price_cents")
    .eq("tenant_id", supplierId)
    .returns<{ id: number; credits: number; price_cents: number }[]>();
  const aSuivre = (data ?? []).filter((p) => p.price_cents === suggestedPackPriceCents(p.credits, oldUnitCents));
  let n = 0;
  for (const p of aSuivre) {
    const price = suggestedPackPriceCents(p.credits, newUnitCents);
    if (price <= 0) continue;
    const { error } = await admin.from("credit_packs").update({ price_cents: price }).eq("id", p.id).eq("tenant_id", supplierId);
    if (!error) n++;
  }
  return n;
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
