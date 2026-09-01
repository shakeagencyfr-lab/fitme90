import "server-only";
import { stripeForTenant } from "@/lib/coach-payments";
import { billingParentId } from "@/lib/hierarchy";
import { creditPackById, applyPackPurchase } from "@/lib/credits";
import { creditPackContents } from "@/lib/config";

// Achat d'un pack de crédits par un COACH auprès de son revendeur. Paiement
// UNIQUE (mode "payment") sur le compte Stripe DU REVENDEUR (BYOK, pas de
// webhook plateforme) ; le crédit du portefeuille se fait au retour, de façon
// idempotente (applyPurchaseCredit).

export interface PackCheckoutResult {
  url?: string;
  error?: string;
}

export async function startPackCheckout(
  coachTenantId: string,
  packId: number,
  email: string | null,
): Promise<PackCheckoutResult> {
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return { error: "Aucun revendeur à facturer." };

  const pack = await creditPackById(resellerId, packId);
  if (!pack || !pack.is_active) return { error: "Pack introuvable." };

  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return { error: "Ton revendeur n'a pas encore configuré ses paiements." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const label = `${pack.name} : ${creditPackContents(pack.ai_credits, pack.program_credits)}`;
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: coachTenantId,
      customer_email: email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (pack.currency || "eur").toLowerCase(),
            unit_amount: pack.price_cents,
            product_data: { name: label },
          },
        },
      ],
      metadata: {
        buyer_tenant_id: coachTenantId,
        pack_id: String(pack.id),
        ai_credits: String(pack.ai_credits),
        program_credits: String(pack.program_credits),
      },
      success_url: `${site}/admin/credits?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/admin/credits?annule=1`,
    });
    return { url: checkout.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

export interface PackVerifyResult {
  credited: boolean;
  /** Crédits IA effectivement ajoutés lors de cet appel. */
  aiCredits?: number;
  /** Crédits programme effectivement ajoutés lors de cet appel. */
  programCredits?: number;
}

/**
 * Vérifie la session Stripe au retour (clé du revendeur) et crédite le
 * portefeuille du coach si le paiement est confirmé. Idempotent : recharger la
 * page ne recrédite jamais (applyPurchaseCredit + ref = session).
 */
export async function verifyPackCheckout(coachTenantId: string, sessionId: string): Promise<PackVerifyResult> {
  if (!sessionId) return { credited: false };
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return { credited: false };
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return { credited: false };

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns =
      session.metadata?.buyer_tenant_id === coachTenantId || session.client_reference_id === coachTenantId;
    if (!owns) return { credited: false };
    if (session.payment_status !== "paid") return { credited: false };

    // On se fie aux métadonnées de la session (ce qui a VRAIMENT été payé) ;
    // repli sur le pack courant si elles manquent. Le pack a pu être modifié
    // entre le paiement et le retour : le client doit recevoir ce qu'il a payé.
    const packId = Number(session.metadata?.pack_id ?? 0);
    const pack = packId ? await creditPackById(resellerId, packId) : null;
    const metaAi = Number(session.metadata?.ai_credits ?? NaN);
    const metaProg = Number(session.metadata?.program_credits ?? NaN);
    const ai = Number.isFinite(metaAi) ? metaAi : (pack?.ai_credits ?? 0);
    const program = Number.isFinite(metaProg) ? metaProg : (pack?.program_credits ?? 0);
    if (ai + program <= 0) return { credited: false };

    const got = await applyPackPurchase(coachTenantId, ai, program, sessionId);
    return {
      credited: got.ai + got.program > 0,
      aiCredits: got.ai,
      programCredits: got.program,
    };
  } catch {
    return { credited: false };
  }
}
