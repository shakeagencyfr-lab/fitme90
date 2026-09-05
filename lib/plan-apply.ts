import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { freePlanOffered, type Plan } from "@/lib/plans";
import { supplySwitchPatch } from "@/lib/ai-supply";
import { creditWallet } from "@/lib/credits";

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
    const patch: Record<string, string | boolean> = {
      ...supplySwitchPatch(effective.ai_supply === "credits" ? "platform_credits" : "byok", !!secret?.anthropic_key_enc),
      coach_byok_allowed: effective.coach_byok_allowed,
      coach_credits_allowed: effective.coach_credits_allowed,
    };
    // Un droit retiré s'applique tout de suite : un revendeur qui revendait
    // des crédits sans y avoir plus droit repasse en abonnement. L'inverse
    // (forcer la revente de crédits) ne se décide pas ici : c'est son choix.
    if (!effective.coach_credits_allowed && buyer.reseller_model === "credits") {
      patch.reseller_model = "subscription";
    }
    await admin.from("tenants").update(patch).eq("id", buyerTenantId);
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
