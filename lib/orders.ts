import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Journal des ventes.
 *
 * Une ligne par encaissement réellement constaté, figée au moment où il a lieu.
 * Avant cette table le chiffre d'affaires se déduisait de `profiles` : la date
 * d'achat valait la date d'inscription, un changement d'offre réécrivait le
 * passé, et un remboursement n'apparaissait nulle part.
 *
 * Toute écriture passe par `stripe_ref`, qui identifie l'objet Stripe à
 * l'origine du mouvement (session de paiement, facture ou charge). C'est ce qui
 * rend l'enregistrement idempotent : le webhook rejoue ses événements, et la
 * réconciliation nocturne repasse sur les mêmes paiements chaque nuit.
 */

/** Forme d'un identifiant Stripe : « ch_3Q… », « pi_3Q… », « cs_test_… ». */
const STRIPE_ID = /^[A-Za-z0-9_]{1,255}$/;

export type OrderKind = "one_time" | "subscription";
export type OrderStatus = "paid" | "refunded";

export interface OrderInput {
  tenantId: string;
  userId: string | null;
  offerId?: string | null;
  offerName?: string | null;
  kind: OrderKind;
  amountCents: number;
  currency?: string;
  /** Identifiant Stripe du mouvement. Deux appels avec la même valeur = une seule vente. */
  stripeRef: string;
  /** Intention de paiement : c'est par elle qu'arrive un remboursement. */
  paymentIntent?: string | null;
  /** Date réelle de l'encaissement, pas celle du traitement. */
  paidAt?: Date;
}

export interface OrderRow {
  id: string;
  user_id: string | null;
  offer_name: string | null;
  kind: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string;
  refunded_at: string | null;
}

/**
 * Enregistre un encaissement. Renvoie `true` si la vente est NOUVELLE, `false`
 * si elle était déjà connue : l'appelant s'en sert pour ne notifier qu'une fois.
 */
export async function recordOrder(input: OrderInput): Promise<boolean> {
  if (!input.tenantId || !input.stripeRef) return false;
  const admin = createAdminClient();

  // Un select avant l'insert plutôt qu'un upsert : on a besoin de distinguer
  // « déjà vue » de « nouvelle », ce qu'un upsert ne dit pas.
  const { data: seen } = await admin
    .from("orders")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("stripe_ref", input.stripeRef)
    .maybeSingle<{ id: string }>();
  if (seen) return false;

  const { error } = await admin.from("orders").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    offer_id: input.offerId ?? null,
    offer_name: input.offerName ?? null,
    kind: input.kind,
    amount_cents: Math.max(0, Math.round(input.amountCents || 0)),
    currency: (input.currency || "eur").toLowerCase(),
    status: "paid",
    stripe_ref: input.stripeRef,
    stripe_payment_intent: input.paymentIntent ?? null,
    paid_at: (input.paidAt ?? new Date()).toISOString(),
  });
  // L'index unique peut rejeter en cas de course entre le webhook et la
  // réconciliation : ce n'est pas une erreur, la vente est simplement déjà là.
  return !error;
}

/**
 * Marque une vente remboursée. Le montant reste au journal, seul le statut
 * change : effacer la ligne ferait disparaître un encaissement qui a bien eu
 * lieu, et le mois passé changerait de total.
 *
 * La recherche se fait sur la seule référence Stripe, sans tenant : un
 * événement de remboursement ne dit pas toujours de quel compte il vient, et la
 * référence est déjà unique chez Stripe.
 */
export async function markOrderRefunded(stripeRef: string): Promise<boolean> {
  // Le filtre `or` ci-dessous concatène la référence dans une expression
  // PostgREST. Les identifiants Stripe sont alphanumériques ; tout ce qui
  // sort de ce format est refusé plutôt qu'échappé, pour ne laisser aucune
  // chance à une virgule ou une parenthèse de détourner le filtre.
  if (!STRIPE_ID.test(stripeRef)) return false;
  const admin = createAdminClient();
  // La vente a été enregistrée sous l'identifiant de sa session, le
  // remboursement arrive sous celui de l'intention de paiement : on cherche
  // sous les deux, sinon aucun remboursement ne retrouve jamais sa vente.
  const { data } = await admin
    .from("orders")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .or(`stripe_ref.eq.${stripeRef},stripe_payment_intent.eq.${stripeRef}`)
    .eq("status", "paid")
    .select("id")
    .returns<{ id: string }[]>();
  return (data ?? []).length > 0;
}

/** Ventes d'un tenant, les plus récentes d'abord. */
export async function tenantOrders(tenantId: string, limit = 500): Promise<OrderRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("id, user_id, offer_name, kind, amount_cents, currency, status, paid_at, refunded_at")
    .eq("tenant_id", tenantId)
    .order("paid_at", { ascending: false })
    .limit(limit)
    .returns<OrderRow[]>();
  return data ?? [];
}

/** Le tenant a-t-il au moins une vente enregistrée ? */
export async function hasOrders(tenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  return (count ?? 0) > 0;
}
