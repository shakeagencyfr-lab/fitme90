import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDescendantTenant } from "@/lib/support-access";
import { creditWallet, debitWallet, resellerBilling } from "@/lib/credits";
import { purgeUser } from "@/lib/account-deletion";
import { stripeForTenant } from "@/lib/coach-payments";
import { grantTenantPlan } from "@/lib/tenant-billing";
import { whoPays } from "@/lib/ai-supply";

// Actions d'un opérateur réseau (plateforme ou revendeur) sur un compte de sa
// descendance : désactiver / réactiver, offrir des crédits IA, supprimer.
// Chaque action revérifie que la cible est bien sous l'étage de l'acteur.

export interface NetworkActionResult {
  ok: boolean;
  error?: string;
}

async function guard(actorTenantId: string, targetTenantId: string): Promise<string | null> {
  if (!(await isDescendantTenant(actorTenantId, targetTenantId))) return "Ce compte n'est pas dans ton réseau.";
  return null;
}

/** Désactive un compte (les clients perdent l'accès, rien n'est supprimé). */
export async function suspendTenant(actorTenantId: string, targetTenantId: string): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ suspended_at: new Date().toISOString(), suspended_reason: "manual" })
    .eq("id", targetTenantId);
  return error ? { ok: false, error: "Désactivation impossible." } : { ok: true };
}

/**
 * Le parent pose ou retire un palier sur un compte de son réseau, sans passer
 * par un paiement. La plateforme offre un palier à un revendeur, un revendeur à
 * un coach ou une salle : même geste, même garde.
 */
export async function setTenantPlan(
  actorTenantId: string,
  targetTenantId: string,
  planId: string | null,
): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  return grantTenantPlan(actorTenantId, targetTenantId, planId);
}

/** Réactive un compte désactivé manuellement. */
export async function reactivateTenant(actorTenantId: string, targetTenantId: string): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ suspended_at: null, suspended_reason: null }).eq("id", targetTenantId);
  return error ? { ok: false, error: "Réactivation impossible." } : { ok: true };
}

/**
 * L'acteur fournit-il les crédits IA de la cible ? Vrai si un coach dont le
 * revendeur vend l'IA en crédits, ou un revendeur qui achète ses crédits à la
 * plateforme. En BYOK, il n'y a pas de portefeuille à créditer.
 *
 * Pour un coach, la condition n'est pas seulement « mon modèle est en
 * crédits » : encore faut-il que je lui FOURNISSE l'IA. Un revendeur en
 * « coachs autonomes » proposait sinon d'offrir des crédits à un coach qui
 * tourne sur sa propre clé et n'en dépensera jamais un seul.
 */
export async function canGiftCredits(actorTenantId: string, targetTenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("tenants")
    .select("kind, ai_supply, parent_id")
    .eq("id", targetTenantId)
    .maybeSingle<{ kind: string; ai_supply: string | null; parent_id: string | null }>();
  if (!target || target.parent_id !== actorTenantId) return false;
  if (target.kind === "reseller") return target.ai_supply === "platform_credits";
  if (target.kind === "coach") return whoPays(await resellerBilling(actorTenantId)).coach;
  return false;
}

/**
 * Le donneur puise-t-il dans un stock qu'il a lui-même ACHETÉ ?
 *
 * Toute la question est là. Un compte alimenté en crédits plateforme possède
 * une réserve finie, payée : en donner doit la vider d'autant. Un compte qui
 * fait tourner l'IA sur SA propre clé Anthropic n'a pas de réserve, il a une
 * facture : les crédits qu'il accorde à ses filleuls sont une unité de compte
 * qu'il crée, et qu'il paiera à l'usage. Confondre les deux permettait à un
 * revendeur d'offrir plus de crédits qu'il n'en possède, en créant la
 * différence de rien.
 */
async function giverHasFiniteStock(tenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("ai_supply")
    .eq("id", tenantId)
    .maybeSingle<{ ai_supply: string | null }>();
  return data?.ai_supply === "platform_credits";
}

/**
 * Offre des crédits IA à un compte de sa descendance.
 *
 * C'EST UN TRANSFERT, PAS UNE CRÉATION, dès lors que le donneur achète
 * lui-même ses crédits. On débite d'abord son portefeuille, atomiquement, et
 * on ne crédite le filleul qu'ensuite : un solde insuffisant refuse le geste
 * en annonçant ce qui reste, au lieu de faire apparaître des crédits que
 * personne n'a payés.
 *
 * L'ordre compte. Créditer d'abord aurait laissé, en cas d'échec du débit, des
 * crédits offerts sans contrepartie, c'est à dire exactement le trou qu'on
 * ferme ici. Si c'est le crédit du filleul qui échoue, on rend au donneur ce
 * qu'on venait de lui prendre.
 */
export async function giftCredits(actorTenantId: string, targetTenantId: string, amount: number): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  if (!Number.isInteger(amount) || amount < 1 || amount > 100000) return { ok: false, error: "Montant invalide (1 à 100 000 crédits)." };
  if (!(await canGiftCredits(actorTenantId, targetTenantId))) {
    return { ok: false, error: "Ce compte utilise sa propre clé IA (BYOK) : il n'a pas de portefeuille de crédits à créditer." };
  }

  const ref = `gift:${actorTenantId}:${Date.now()}`;
  const transfert = await giverHasFiniteStock(actorTenantId);

  if (transfert) {
    const pris = await debitWallet(actorTenantId, amount, "adjust", null);
    if (!pris.ok) {
      return {
        ok: false,
        error: `Crédits insuffisants : il t'en reste ${pris.remaining.toLocaleString("fr-FR")}, tu en offres ${amount.toLocaleString("fr-FR")}. Recharge ton solde ou baisse le montant.`,
      };
    }
    try {
      await creditWallet(targetTenantId, amount, "adjust", ref);
      return { ok: true };
    } catch {
      // On rend ce qu'on a pris : un transfert à moitié fait est pire qu'un
      // transfert refusé, parce que personne ne le voit.
      await creditWallet(actorTenantId, amount, "adjust", `${ref}:rollback`).catch(() => {});
      return { ok: false, error: "Crédit impossible. Ton solde n'a pas bougé." };
    }
  }

  try {
    await creditWallet(targetTenantId, amount, "adjust", ref);
    return { ok: true };
  } catch {
    return { ok: false, error: "Crédit impossible." };
  }
}

/**
 * Supprime définitivement un compte de la descendance et tout ce qui s'y
 * rattache : ses propres comptes enfants (revendeur -> coachs), les profils
 * (coach + clients) puis le tenant (cascade sur les tables liées).
 */
export async function deleteTenantTree(actorTenantId: string, targetTenantId: string): Promise<NetworkActionResult> {
  const err = await guard(actorTenantId, targetTenantId);
  if (err) return { ok: false, error: err };
  try {
    await deleteTree(targetTenantId);
    return { ok: true };
  } catch {
    return { ok: false, error: "Suppression impossible." };
  }
}

async function deleteTree(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: kids } = await admin.from("tenants").select("id").eq("parent_id", tenantId).returns<{ id: string }[]>();
  for (const k of kids ?? []) await deleteTree(k.id);

  // Abonnement au parent : coupé (best effort) pour ne pas facturer un compte supprimé.
  const { data: t } = await admin
    .from("tenants")
    .select("sub_id, parent_id")
    .eq("id", tenantId)
    .maybeSingle<{ sub_id: string | null; parent_id: string | null }>();
  if (t?.sub_id && t.parent_id) {
    const stripe = await stripeForTenant(t.parent_id);
    if (stripe) {
      try {
        await stripe.subscriptions.cancel(t.sub_id);
      } catch {
        /* abonnement déjà clos ou clé absente */
      }
    }
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role")
    .eq("tenant_id", tenantId)
    .returns<{ id: string; role: string | null }[]>();
  const ordered = (profiles ?? []).sort((a, b) => (a.role === "owner" ? 1 : 0) - (b.role === "owner" ? 1 : 0));
  for (const p of ordered) {
    await purgeUser(p.id);
  }
  await admin.from("coach_notes").delete().eq("tenant_id", tenantId);
  await admin.from("profiles").delete().eq("tenant_id", tenantId);
  const { error } = await admin.from("tenants").delete().eq("id", tenantId);
  if (error) throw error;
}

// ─────────────────────────── Fourniture d'IA d'un revendeur ───────────────────────────

import { supplySwitchPatch, type AiSupply } from "@/lib/ai-supply";
export { supplySwitchPatch };
export type { AiSupply };

/** Ce qu'il faut savoir avant de proposer la bascule (avertissements de l'écran réseau). */
export interface SupplyContext {
  /** Étage concerné : le geste et son libellé ne sont pas les mêmes. */
  kind: "reseller" | "coach";
  current: AiSupply;
  /** Le revendeur a sa propre clé Anthropic. */
  targetHasKey: boolean;
  /** Le parent a une clé : sans elle, l'IA en crédits ne tourne pas. */
  supplierKeyReady: boolean;
  /** Le parent propose au moins un pack actif : sans pack, pas de recharge possible. */
  supplierHasPack: boolean;
  /** Solde de crédits du revendeur. */
  credits: number;
}

/**
 * Contexte de bascule pour tout un réseau d'un coup (l'écran liste revendeurs
 * ET coachs) : trois requêtes au total, quel que soit le nombre de comptes.
 */
export async function supplyContexts(
  actorTenantId: string,
  comptes: { id: string; kind: "reseller" | "coach"; aiSupply: AiSupply }[],
): Promise<Map<string, SupplyContext>> {
  const out = new Map<string, SupplyContext>();
  if (comptes.length === 0) return out;
  const admin = createAdminClient();
  const ids = comptes.map((r) => r.id);

  const [{ data: secrets }, { data: packs }, { data: wallets }] = await Promise.all([
    admin
      .from("tenant_secrets")
      .select("tenant_id, anthropic_key_enc")
      .in("tenant_id", [actorTenantId, ...ids])
      .returns<{ tenant_id: string; anthropic_key_enc: string | null }[]>(),
    admin
      .from("credit_packs")
      .select("id")
      .eq("tenant_id", actorTenantId)
      .eq("is_active", true)
      .limit(1)
      .returns<{ id: number }[]>(),
    admin
      .from("credit_wallets")
      .select("tenant_id, credits")
      .in("tenant_id", ids)
      .returns<{ tenant_id: string; credits: number }[]>(),
  ]);

  const keyed = new Set((secrets ?? []).filter((s) => s.anthropic_key_enc).map((s) => s.tenant_id));
  const balance = new Map((wallets ?? []).map((w) => [w.tenant_id, w.credits]));
  const supplierKeyReady = keyed.has(actorTenantId);
  const supplierHasPack = (packs ?? []).length > 0;

  for (const r of comptes) {
    out.set(r.id, {
      kind: r.kind,
      current: r.aiSupply,
      targetHasKey: keyed.has(r.id),
      supplierKeyReady,
      supplierHasPack,
      credits: balance.get(r.id) ?? 0,
    });
  }
  return out;
}

/**
 * Bascule un compte entre sa propre clé et l'IA fournie par son parent.
 * Réservé au parent direct : c'est lui qui fournit (et facture) l'IA.
 *
 * DEUX MÉCANIQUES SOUS UN SEUL GESTE, parce que les deux étages ne se règlent
 * pas de la même façon.
 *
 * Sur un REVENDEUR, la bascule change sa source : sa propre clé, ou des crédits
 * achetés à la plateforme. C'est un changement de modèle pour lui et pour tous
 * ses coachs.
 *
 * Sur un COACH, elle pose une DISPENSE. La règle générale veut qu'un coach
 * suive son revendeur, et cette règle protège le revenu du revendeur : sans
 * elle, n'importe quel coach collerait une clé et cesserait de payer ses
 * crédits. Mais elle laissait le revendeur sans solution pour le cas légitime,
 * un coach à qui il ACCEPTE de laisser l'autonomie. La dispense est cette
 * exception, et elle est posée par le revendeur, jamais par le coach : la
 * brèche reste fermée.
 */
export async function setResellerSupply(
  actorTenantId: string,
  targetTenantId: string,
  supply: AiSupply,
): Promise<NetworkActionResult> {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("tenants")
    .select("kind, parent_id, ai_supply, ai_self_managed")
    .eq("id", targetTenantId)
    .maybeSingle<{ kind: string; parent_id: string | null; ai_supply: string | null; ai_self_managed: boolean | null }>();
  if (!target || target.parent_id !== actorTenantId) return { ok: false, error: "Ce compte n'est pas rattaché à toi." };

  const [{ data: actorSecret }, { data: targetSecret }] = await Promise.all([
    admin.from("tenant_secrets").select("anthropic_key_enc").eq("tenant_id", actorTenantId).maybeSingle<{ anthropic_key_enc: string | null }>(),
    admin.from("tenant_secrets").select("anthropic_key_enc").eq("tenant_id", targetTenantId).maybeSingle<{ anthropic_key_enc: string | null }>(),
  ]);

  if (target.kind === "coach") {
    // La dispense, et rien d'autre : le coach garde son modèle de facturation,
    // ses offres et ses clients. Seule la source de son IA change.
    const dispense = supply === "byok";
    if (!!target.ai_self_managed === dispense) return { ok: true };
    // Dispenser un coach sans clé, c'est éteindre son IA sur-le-champ. Mieux
    // vaut le refuser que le laisser découvrir la panne par ses clients.
    if (dispense && !targetSecret?.anthropic_key_enc) {
      return { ok: false, error: "Ce coach n'a pas encore branché sa clé Anthropic : le dispenser couperait son IA immédiatement." };
    }
    const { error } = await admin
      .from("tenants")
      .update({ ai_self_managed: dispense })
      .eq("id", targetTenantId);
    return error ? { ok: false, error: "Changement impossible." } : { ok: true };
  }

  const current: AiSupply = target.ai_supply === "platform_credits" ? "platform_credits" : "byok";
  if (current === supply) return { ok: true };

  if (supply === "platform_credits" && !actorSecret?.anthropic_key_enc) {
    return { ok: false, error: "Branche d'abord ta clé Anthropic (Revenu IA) : c'est elle qui ferait tourner l'IA de ce revendeur." };
  }

  const { error } = await admin
    .from("tenants")
    .update(supplySwitchPatch(supply, !!targetSecret?.anthropic_key_enc))
    .eq("id", targetTenantId);
  return error ? { ok: false, error: "Changement impossible." } : { ok: true };
}
