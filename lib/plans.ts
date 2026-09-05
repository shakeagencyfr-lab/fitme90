import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_RIGHTS, planRefusal, resolveSupply, type PlanAiSupply, type SupplyRights } from "@/lib/supply-rights";

export type { PlanAiSupply };

/**
 * Paliers d'abonnement d'un vendeur.
 *
 * Primitif générique : la plateforme propose des paliers aux revendeurs, un
 * revendeur en propose à ses coachs et salles. `tenant_id` est le VENDEUR.
 *
 * Un palier ne dit pas seulement un prix et une capacité : il PORTE SON
 * MODÈLE. Ce qu'on y achète, c'est aussi la façon dont l'IA est fournie
 * (sa propre clé ou des crédits achetés au vendeur), la marque blanche incluse
 * ou non, et, pour un revendeur, ce qu'il aura le droit de proposer à ses
 * propres coachs. Régler tout cela compte par compte, à côté du palier, c'était
 * demander au vendeur de refaire à la main ce qu'il venait de vendre.
 *
 * LE PALIER GRATUIT est une ligne comme les autres, marquée `is_free` : sans
 * prix, un client inclus, et les mêmes réglages (fourniture d'IA, marque
 * blanche, droits). La case « proposer un palier gratuit » n'est que son
 * `is_active`. Les crédits de départ n'ont de sens que sur lui.
 */

/** Nombre maximum de paliers payants par vendeur (garde-fou UI). */
export const MAX_PLANS_PER_TENANT = 8;

/** Capacité du palier gratuit : le premier client, offert. */
export const FREE_PLAN_CLIENT_LIMIT = 1;

export interface Plan {
  id: string;
  tenant_id: string;
  name: string;
  price_month_cents: number | null;
  price_year_cents: number | null;
  /** Capacité accordée à l'acheteur ; null = illimité. */
  client_limit: number | null;
  setup_fee_cents: number;
  /** Le pack marque blanche (domaine, SMTP, site) est inclus. */
  whitelabel_included: boolean;
  /** L'acheteur branche sa clé (byok) ou achète ses crédits au vendeur. */
  ai_supply: PlanAiSupply;
  /** Plateforme -> revendeur : le revendeur pourra laisser ses coachs en clé personnelle. */
  coach_byok_allowed: boolean;
  /** Plateforme -> revendeur : le revendeur pourra revendre des crédits à ses coachs. */
  coach_credits_allowed: boolean;
  /** Le palier gratuit du vendeur (une ligne par vendeur, sans prix). */
  is_free: boolean;
  /** Crédits IA offerts à l'inscription (palier gratuit en crédits). */
  starter_credits: number;
  is_active: boolean;
  position: number;
  created_at: string;
}

export const PLAN_COLS =
  "id, tenant_id, name, price_month_cents, price_year_cents, client_limit, setup_fee_cents, whitelabel_included, ai_supply, coach_byok_allowed, coach_credits_allowed, is_free, starter_credits, is_active, position, created_at";

/** Le palier a un prix : il se vend. Le gratuit n'en a pas, il s'offre. */
export function planIsSellable(p: Plan): boolean {
  return !p.is_free && p.is_active && (p.price_month_cents != null || p.price_year_cents != null);
}

/**
 * Paliers d'un vendeur, ordonnés. Le palier gratuit y figure en premier quand
 * il existe : c'est par lui qu'un compte commence.
 */
export async function listPlans(tenantId: string): Promise<Plan[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("plans")
    .select(PLAN_COLS)
    .eq("tenant_id", tenantId)
    .order("is_free", { ascending: false })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as Plan[];
}

/** Les paliers qu'on peut acheter : actifs, payants. */
export async function listSellablePlans(tenantId: string): Promise<Plan[]> {
  return (await listPlans(tenantId)).filter(planIsSellable);
}

export async function planById(planId: string): Promise<Plan | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("plans").select(PLAN_COLS).eq("id", planId).maybeSingle<Plan>();
  return (data as Plan) ?? null;
}

/**
 * Le palier gratuit d'un vendeur, créé à la première demande.
 *
 * Créé désactivé pour un revendeur et activé pour la plateforme ? Non : activé
 * dans les deux cas. « Le premier client est offert » est la promesse de toutes
 * les pages de vente depuis le début ; un vendeur qui ne la veut plus décoche
 * la case, ce qui est un choix, alors qu'un palier gratuit muet par défaut
 * serait une promesse rompue sans que personne l'ait décidé.
 */
export async function freePlanOf(tenantId: string): Promise<Plan> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("plans")
    .select(PLAN_COLS)
    .eq("tenant_id", tenantId)
    .eq("is_free", true)
    .maybeSingle<Plan>();
  if (data) return data as Plan;

  // Un vendeur qui fournit déjà l'IA à son réseau (revendeur d'IA) ne vend
  // rien d'autre : son palier gratuit naît en crédits. Le créer en clé
  // personnelle aurait dispensé ses nouveaux coachs, IA coupée, sans que
  // personne l'ait décidé. Et dans tous les cas, il naît dans une fourniture
  // que ses droits lui ouvrent : un revendeur BYOK n'a pas de palier en
  // crédits, même gratuit.
  const seller = await sellerFacts(tenantId);
  const aiSupply: PlanAiSupply =
    seller.kind === "reseller" ? resolveSupply(seller.rights, seller.aiMode === "provider" ? "credits" : "byok") : "byok";

  const { data: created } = await admin
    .from("plans")
    .insert({
      tenant_id: tenantId,
      name: "Démarrez gratuitement",
      client_limit: FREE_PLAN_CLIENT_LIMIT,
      is_free: true,
      is_active: true,
      ai_supply: aiSupply,
      // La plateforme offre la marque blanche complète à ses revendeurs dès
      // le départ : c'est la promesse du programme revendeur.
      whitelabel_included: seller.kind === "platform",
      position: -1,
    })
    .select(PLAN_COLS)
    .maybeSingle<Plan>();
  if (created) return created as Plan;

  // Course avec une autre requête : l'index unique a refusé le doublon, la
  // ligne existe maintenant.
  const { data: again } = await admin
    .from("plans")
    .select(PLAN_COLS)
    .eq("tenant_id", tenantId)
    .eq("is_free", true)
    .maybeSingle<Plan>();
  if (again) return again as Plan;

  // La base n'a rien rendu (indisponible, ou faux client de test) : on rend
  // le palier gratuit tel qu'il serait créé, plutôt qu'un null qui ferait
  // tomber tout ce qui compte sur lui. Il n'est pas persisté, et c'est
  // voulu : la prochaine lecture retentera.
  return {
    id: "",
    tenant_id: tenantId,
    name: "Démarrez gratuitement",
    price_month_cents: null,
    price_year_cents: null,
    client_limit: FREE_PLAN_CLIENT_LIMIT,
    setup_fee_cents: 0,
    whitelabel_included: seller.kind === "platform",
    ai_supply: aiSupply,
    coach_byok_allowed: true,
    coach_credits_allowed: false,
    is_free: true,
    starter_credits: 0,
    is_active: true,
    position: -1,
    created_at: new Date().toISOString(),
  };
}

/**
 * Le palier gratuit tel qu'un ACHETEUR le reçoit, ou null si le vendeur ne le
 * propose pas. Ce que reçoit un compte sans abonnement dépend de lui : sa
 * capacité (un client, ou aucun), sa fourniture d'IA, ses crédits de départ.
 */
export async function freePlanOffered(sellerId: string | null): Promise<Plan | null> {
  if (!sellerId) return null;
  const plan = await freePlanOf(sellerId);
  return plan.is_active ? plan : null;
}

/**
 * Capacité d'un compte SANS abonnement chez ce vendeur. C'est la valeur que
 * prennent `client_limit` à l'inscription, au retour au gratuit et au
 * déclassement pour impayé : un vendeur qui ferme son palier gratuit ferme
 * aussi la place offerte.
 */
export async function freeTierLimit(sellerId: string | null): Promise<number> {
  return (await freePlanOffered(sellerId)) ? FREE_PLAN_CLIENT_LIMIT : 0;
}

export interface FreePlanInput {
  active: boolean;
  aiSupply: PlanAiSupply;
  starterCredits: number;
  whitelabelIncluded: boolean;
  coachByokAllowed: boolean;
  coachCreditsAllowed: boolean;
}

/** Le vendeur règle son palier gratuit. */
export async function saveFreePlan(tenantId: string, input: FreePlanInput): Promise<CreatePlanResult> {
  const starter = Math.trunc(input.starterCredits);
  if (!Number.isFinite(starter) || starter < 0 || starter > 100000) {
    return { ok: false, error: "Nombre de crédits de départ invalide." };
  }
  const refus = planRefusal(await sellerFacts(tenantId), {
    aiSupply: input.aiSupply,
    coachByokAllowed: input.coachByokAllowed,
    coachCreditsAllowed: input.coachCreditsAllowed,
  });
  if (refus) return { ok: false, error: refus };
  const plan = await freePlanOf(tenantId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("plans")
    .update({
      is_active: input.active,
      ai_supply: input.aiSupply,
      // Des crédits de départ sur un palier en clé personnelle ne seraient
      // jamais dépensés : on les remet à zéro plutôt que de les laisser
      // promettre quelque chose.
      starter_credits: input.aiSupply === "credits" ? starter : 0,
      whitelabel_included: input.whitelabelIncluded,
      coach_byok_allowed: input.coachByokAllowed,
      coach_credits_allowed: input.coachCreditsAllowed,
    })
    .eq("id", plan.id)
    .eq("tenant_id", tenantId);
  if (error) return { ok: false, error: "Enregistrement impossible." };
  return { ok: true };
}

/**
 * Ce qu'il faut savoir du vendeur pour juger un palier : son étage, et pour
 * un revendeur, les droits que son propre palier lui ouvre. Un revendeur ne
 * vend que ce qu'on lui a ouvert (lib/supply-rights.ts) ; la garde est ici,
 * côté serveur, et pas seulement dans le formulaire : masquer une case
 * n'empêche pas de la poster.
 */
async function sellerFacts(
  sellerId: string,
): Promise<{ kind: "platform" | "reseller" | "coach"; rights: SupplyRights; aiMode: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("kind, ai_mode, coach_byok_allowed, coach_credits_allowed")
    .eq("id", sellerId)
    .maybeSingle<{ kind: string | null; ai_mode: string | null; coach_byok_allowed: boolean | null; coach_credits_allowed: boolean | null }>();
  const kind = data?.kind === "platform" || data?.kind === "reseller" ? data.kind : "coach";
  const rights: SupplyRights =
    kind === "reseller" ? { byok: data?.coach_byok_allowed !== false, credits: data?.coach_credits_allowed !== false } : ALL_RIGHTS;
  return { kind, rights, aiMode: data?.ai_mode ?? null };
}

export interface CreatePlanInput {
  name: string;
  priceMonthCents?: number | null;
  priceYearCents?: number | null;
  /** null = illimité. */
  clientLimit?: number | null;
  setupFeeCents?: number | null;
  whitelabelIncluded?: boolean;
  aiSupply?: PlanAiSupply;
  coachByokAllowed?: boolean;
  coachCreditsAllowed?: boolean;
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

  // Un palier revendeur qui n'ouvre ni la clé personnelle ni les crédits ne
  // laisserait au revendeur aucune façon de fournir l'IA à ses coachs ; et un
  // revendeur ne vend que ce que son propre palier lui ouvre.
  const byok = input.coachByokAllowed ?? true;
  const credits = input.coachCreditsAllowed ?? false;
  const refus = planRefusal(await sellerFacts(tenantId), {
    aiSupply: input.aiSupply ?? "byok",
    coachByokAllowed: byok,
    coachCreditsAllowed: credits,
  });
  if (refus) return { ok: false, error: refus };

  const admin = createAdminClient();
  const { count } = await admin
    .from("plans")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_free", false);
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
    whitelabel_included: !!input.whitelabelIncluded,
    ai_supply: input.aiSupply === "credits" ? "credits" : "byok",
    coach_byok_allowed: byok,
    coach_credits_allowed: credits,
    position: count ?? 0,
  });
  if (error) return { ok: false, error: "Création impossible." };
  return { ok: true };
}

/**
 * Ouvre ou ferme la marque blanche sur un palier existant.
 *
 * Une bascule à part, et pas un champ de plus dans un formulaire d'édition :
 * c'est la seule chose qu'un vendeur ait de bonnes raisons de changer sur un
 * palier déjà vendu. Le prix et la capacité, eux, décrivent ce que ses
 * abonnés ont acheté.
 *
 * L'effet est immédiat pour tous les comptes du palier : l'accès à la marque
 * blanche relit cette colonne à chaque visite, personne n'a à se réabonner.
 */
export async function setPlanWhitelabelIncluded(
  tenantId: string,
  planId: string,
  included: boolean,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("plans")
    .update({ whitelabel_included: included })
    .eq("id", planId)
    .eq("tenant_id", tenantId);
}

/** Active / désactive un palier. */
export async function setPlanActive(tenantId: string, planId: string, active: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin.from("plans").update({ is_active: active }).eq("id", planId).eq("tenant_id", tenantId);
}

/** Supprime un palier payant. Le gratuit ne se supprime pas, il se ferme. */
export async function deletePlan(tenantId: string, planId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("plans").delete().eq("id", planId).eq("tenant_id", tenantId).eq("is_free", false);
}
