import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { freePlanOffered, type Plan } from "@/lib/plans";
import { supplySwitchPatch } from "@/lib/ai-supply";
import { creditWallet } from "@/lib/credits";
import { forcedSupply, rightsPatch, type SupplyRights } from "@/lib/supply-rights";

/**
 * Applique à un compte le MODÈLE du palier qu'il vient d'obtenir.
 *
 * Le palier dit comment l'IA est fournie, ce qu'un revendeur a le droit de
 * proposer à ses coachs, et les crédits offerts pour démarrer. Tout cela
 * vivait en réglages épars sur le compte : ici, c'est le palier qui les pose,
 * au moment où il est acheté, offert, ou retrouvé après un déclassement.
 *
 * `plan` à null signifie « le palier gratuit du parent ». S'il n'en propose
 * pas, il n'y a pas de modèle à appliquer : le compte garde ce qu'il avait,
 * et c'est sa capacité (réglée par l'appelant) qui dit qu'il ne peut rien
 * faire.
 *
 * La marque blanche n'est pas recopiée : son accès relit le palier courant à
 * chaque visite (lib/whitelabel.ts), ce qui la ferme d'elle-même quand le
 * palier tombe.
 */
export async function applyPlanModel(buyerTenantId: string, plan: Plan | null): Promise<void> {
  const admin = createAdminClient();
  const { data: buyer } = await admin
    .from("tenants")
    .select("id, kind, parent_id, reseller_model")
    .eq("id", buyerTenantId)
    .maybeSingle<{ id: string; kind: string | null; parent_id: string | null; reseller_model: string | null }>();
  if (!buyer) return;

  const effective = plan ?? (await freePlanOffered(buyer.parent_id));
  if (!effective) return;

  if (buyer.kind === "reseller") {
    const { data: secret } = await admin
      .from("tenant_secrets")
      .select("anthropic_key_enc")
      .eq("tenant_id", buyerTenantId)
      .maybeSingle<{ anthropic_key_enc: string | null }>();
    const rights: SupplyRights = { byok: effective.coach_byok_allowed, credits: effective.coach_credits_allowed };
    const buysPlatformCredits = effective.ai_supply === "credits";
    // Un droit retiré s'applique tout de suite (lib/supply-rights.ts) : sans
    // la revente de crédits, le revendeur ne fournit plus l'IA et repasse en
    // abonnement ; sans la clé personnelle, il fournit, point.
    const patch: Record<string, string | boolean> = {
      ...supplySwitchPatch(buysPlatformCredits ? "platform_credits" : "byok", !!secret?.anthropic_key_enc),
      coach_byok_allowed: rights.byok,
      coach_credits_allowed: rights.credits,
      ...rightsPatch(rights, { buysPlatformCredits, resellerModel: buyer.reseller_model }),
    };
    await admin.from("tenants").update(patch).eq("id", buyerTenantId);
    await alignNetworkWithRights(buyerTenantId, rights);
  } else if (buyer.kind === "coach") {
    // Le coach tourne sur sa propre clé (dispensé) ou sur celle de son
    // revendeur. Sans revendeur fournisseur au-dessus, la dispense est sans
    // effet : le coach tourne sur sa clé de toute façon.
    await admin
      .from("tenants")
      .update({ ai_self_managed: effective.ai_supply === "byok" })
      .eq("id", buyerTenantId);
  }

  await grantStarterCredits(buyerTenantId, effective);
}

/**
 * Quand une seule fourniture est permise au revendeur, ses paliers existants
 * et ses coachs la prennent, tout de suite.
 *
 * Un palier posé avant que la plateforme retire un droit continuerait sinon
 * de vendre ce que le revendeur n'a plus le droit de vendre : un « Démarrez
 * gratuitement » en crédits chez un revendeur BYOK, avec des crédits offerts
 * à l'inscription que personne ne fournira. Les crédits de départ d'un palier
 * en clé personnelle ne seraient jamais dépensés : on les remet à zéro.
 *
 * Les coachs suivent : en clé personnelle, chacun est dispensé (il tourne sur
 * sa clé) ; en crédits, personne ne l'est. Quand le revendeur choisit, on ne
 * touche à rien : c'est à lui de décider, palier par palier.
 */
async function alignNetworkWithRights(resellerId: string, rights: SupplyRights): Promise<void> {
  const only = forcedSupply(rights);
  if (!only) return;
  const admin = createAdminClient();
  await admin
    .from("plans")
    .update({ ai_supply: only, ...(only === "byok" ? { starter_credits: 0 } : {}) })
    .eq("tenant_id", resellerId)
    .neq("ai_supply", only);
  await admin
    .from("tenants")
    .update({ ai_self_managed: only === "byok" })
    .eq("parent_id", resellerId)
    .eq("kind", "coach");
}

/**
 * Le vendeur vient de changer son palier gratuit : les comptes qui sont
 * dessus en reprennent le modèle. Un revendeur à qui la plateforme ouvre la
 * revente de crédits en cochant une case doit la voir apparaître, pas
 * attendre de racheter un palier ; un coach dont le revendeur passe son
 * gratuit en crédits doit tourner sur son IA dès maintenant.
 *
 * Seuls les comptes SANS palier payant sont concernés : les autres tiennent
 * leur modèle du palier qu'ils ont acheté.
 *
 * Pour un revendeur, on ne rejoue que les DROITS, pas sa source d'IA : la
 * plateforme a pu le passer à la main en crédits plateforme depuis son réseau,
 * et une case cochée sur le palier gratuit ne doit pas défaire ce geste. Un
 * coach, lui, n'a que sa dispense à reprendre du palier.
 */
export async function reapplyFreePlan(sellerId: string): Promise<void> {
  const free = await freePlanOffered(sellerId);
  if (!free) return;
  const admin = createAdminClient();
  const { data: children } = await admin
    .from("tenants")
    .select("id, kind, ai_supply, reseller_model")
    .eq("parent_id", sellerId)
    .is("plan_id", null)
    .returns<{ id: string; kind: string | null; ai_supply: string | null; reseller_model: string | null }[]>();
  for (const child of children ?? []) {
    if (child.kind !== "reseller") {
      await applyPlanModel(child.id, null);
      continue;
    }
    const rights: SupplyRights = { byok: free.coach_byok_allowed, credits: free.coach_credits_allowed };
    await admin
      .from("tenants")
      .update({
        coach_byok_allowed: rights.byok,
        coach_credits_allowed: rights.credits,
        ...rightsPatch(rights, { buysPlatformCredits: child.ai_supply === "platform_credits", resellerModel: child.reseller_model }),
      })
      .eq("id", child.id);
    await alignNetworkWithRights(child.id, rights);
    await grantStarterCredits(child.id, free);
  }
}

/**
 * Les crédits de départ du palier gratuit, versés UNE fois par compte.
 *
 * Un compte peut retomber sur le gratuit plusieurs fois (résiliation, impayé
 * régularisé) : le journal garde la trace du premier versement, et il n'y en
 * a pas de second. Sans quoi résilier puis revenir serait une façon de se
 * recharger gratuitement.
 */
async function grantStarterCredits(buyerTenantId: string, plan: Plan): Promise<void> {
  if (!plan.is_free || plan.ai_supply !== "credits" || plan.starter_credits <= 0) return;
  const ref = `starter:${buyerTenantId}`;
  const admin = createAdminClient();
  const { data: already } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("tenant_id", buyerTenantId)
    .eq("ref", ref)
    .limit(1)
    .maybeSingle<{ id: number }>();
  if (already) return;
  await creditWallet(buyerTenantId, plan.starter_credits, "adjust", ref);
}
