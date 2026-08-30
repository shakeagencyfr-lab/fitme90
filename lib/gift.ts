import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomCode } from "@/lib/codes";
import { stripeForTenant } from "@/lib/coach-payments";

// Cartes cadeaux : un code débloque GRATUITEMENT une offre (paiement unique)
// d'un coach pour son bénéficiaire. Deux origines : généré par le coach
// (kind 'coach_free') ou acheté en cadeau sur la landing (kind 'gift_purchase').

export interface GiftCodeRow {
  code: string;
  note: string | null;
  kind: string;
  offer_id: string | null;
  buyer_email: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}

export interface GiftCodeView extends GiftCodeRow {
  offer_name: string | null;
}

/** Insère un code unique (réessaie en cas de collision improbable). */
async function insertUnique(row: Record<string, unknown>): Promise<string | null> {
  const admin = createAdminClient();
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    const { error } = await admin.from("gift_codes").insert({ ...row, code });
    if (!error) return code;
    if (error.code !== "23505") return null; // erreur autre qu'un doublon
  }
  return null;
}

/**
 * Le coach génère `count` codes cadeaux gratuits pour une de ses offres à
 * paiement unique. Retourne les codes créés.
 */
export async function generateCoachGiftCodes(
  tenantId: string,
  offerId: string,
  count: number,
  note: string | null,
): Promise<{ ok: boolean; error?: string; codes?: string[] }> {
  const admin = createAdminClient();
  const { data: offer } = await admin
    .from("offers")
    .select("id, billing_type")
    .eq("id", offerId)
    .eq("tenant_id", tenantId)
    .maybeSingle<{ id: string; billing_type: string }>();
  if (!offer) return { ok: false, error: "Offre introuvable." };
  if (offer.billing_type === "subscription") {
    return { ok: false, error: "Les cartes cadeaux ne s'appliquent qu'aux offres à paiement unique." };
  }
  const n = Math.min(Math.max(1, Math.round(count)), 50);
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    const code = await insertUnique({
      tenant_id: tenantId,
      offer_id: offerId,
      kind: "coach_free",
      note: note?.slice(0, 200) || null,
    });
    if (code) codes.push(code);
  }
  if (codes.length === 0) return { ok: false, error: "Génération impossible." };
  return { ok: true, codes };
}

/**
 * Crée (idempotent par session Stripe) le code d'un cadeau acheté sur la
 * landing. Retourne le code (existant si la session a déjà été traitée).
 */
export async function createPurchasedGiftCode(
  tenantId: string,
  offerId: string,
  buyerEmail: string | null,
  sessionId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("gift_codes")
    .select("code")
    .eq("stripe_session_id", sessionId)
    .maybeSingle<{ code: string }>();
  if (existing) return existing.code;
  return insertUnique({
    tenant_id: tenantId,
    offer_id: offerId,
    kind: "gift_purchase",
    buyer_email: buyerEmail,
    stripe_session_id: sessionId,
    note: buyerEmail ? `Cadeau acheté par ${buyerEmail}` : "Cadeau acheté",
  });
}

export interface GiftConfirm {
  ok: boolean;
  code?: string;
  offerName?: string | null;
  error?: string;
}

/**
 * Confirme un achat cadeau au retour de Stripe (BYOK) : relit la session avec la
 * clé du coach, vérifie le paiement, et génère (idempotent) le code cadeau.
 */
export async function confirmGiftPurchase(tenantId: string, sessionId: string): Promise<GiftConfirm> {
  if (!sessionId) return { ok: false, error: "Session manquante." };
  const stripe = await stripeForTenant(tenantId);
  if (!stripe) return { ok: false, error: "Paiement indisponible." };
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.gift !== "1") {
      return { ok: false, error: "Paiement non confirmé." };
    }
    const offerId = session.metadata?.offer_id ?? null;
    if (!offerId) return { ok: false, error: "Offre manquante." };
    const email = session.customer_details?.email ?? session.metadata?.buyer_email ?? null;
    const code = await createPurchasedGiftCode(tenantId, offerId, email, sessionId);
    if (!code) return { ok: false, error: "Génération du code impossible." };

    const admin = createAdminClient();
    const { data: offer } = await admin
      .from("offers")
      .select("name")
      .eq("id", offerId)
      .maybeSingle<{ name: string }>();
    return { ok: true, code, offerName: offer?.name ?? null };
  } catch {
    return { ok: false, error: "Vérification impossible." };
  }
}

/** Liste des codes cadeaux d'un coach, avec le nom de l'offre. */
export async function listGiftCodes(tenantId: string): Promise<GiftCodeView[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("gift_codes")
    .select("code, note, kind, offer_id, buyer_email, used_by, used_at, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .returns<GiftCodeRow[]>();
  const rows = data ?? [];
  const offerIds = [...new Set(rows.map((r) => r.offer_id).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (offerIds.length) {
    const { data: offers } = await admin
      .from("offers")
      .select("id, name")
      .in("id", offerIds)
      .returns<{ id: string; name: string }[]>();
    for (const o of offers ?? []) names.set(o.id, o.name);
  }
  return rows.map((r) => ({ ...r, offer_name: r.offer_id ? names.get(r.offer_id) ?? null : null }));
}
