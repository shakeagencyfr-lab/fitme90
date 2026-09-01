import "server-only";
import { stripeForTenant } from "@/lib/coach-payments";
import { billingParentId } from "@/lib/hierarchy";
import { creditPackById, applyPurchaseCredit } from "@/lib/credits";
import { creditPackContents } from "@/lib/config";

// Achat d'un pack de crédits par un tenant auprès de son FOURNISSEUR (un coach
// chez son revendeur, un revendeur chez la plateforme). Paiement UNIQUE (mode
// "payment") sur le compte Stripe DU FOURNISSEUR (BYOK, pas de webhook
// plateforme) ; le crédit du portefeuille se fait au retour, de façon
// idempotente (applyPurchaseCredit).

export interface PackCheckoutResult {
  url?: string;
  error?: string;
}

export async function startPackCheckout(
  buyerTenantId: string,
  packId: number,
  email: string | null,
): Promise<PackCheckoutResult> {
  const supplierId = await billingParentId(buyerTenantId);
  if (!supplierId) return { error: "Aucun fournisseur à facturer." };

  const pack = await creditPackById(supplierId, packId);
  if (!pack || !pack.is_active) return { error: "Pack introuvable." };

  const stripe = await stripeForTenant(supplierId);
  if (!stripe) return { error: "Ton fournisseur n'a pas encore configuré ses paiements." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const label = `${pack.name} : ${creditPackContents(pack.credits)}`;
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: buyerTenantId,
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
        buyer_tenant_id: buyerTenantId,
        pack_id: String(pack.id),
        credits: String(pack.credits),
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
  /** Crédits effectivement ajoutés lors de cet appel. */
  credits?: number;
}

/**
 * Vérifie la session Stripe au retour (clé du fournisseur) et crédite le
 * portefeuille de l'acheteur si le paiement est confirmé. Idempotent.
 */
export async function verifyPackCheckout(buyerTenantId: string, sessionId: string): Promise<PackVerifyResult> {
  if (!sessionId) return { credited: false };
  const supplierId = await billingParentId(buyerTenantId);
  if (!supplierId) return { credited: false };
  const stripe = await stripeForTenant(supplierId);
  if (!stripe) return { credited: false };

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns =
      session.metadata?.buyer_tenant_id === buyerTenantId || session.client_reference_id === buyerTenantId;
    if (!owns) return { credited: false };
    if (session.payment_status !== "paid") return { credited: false };

    // Ce qui a VRAIMENT été payé (métadonnées), repli sur le pack courant.
    const packId = Number(session.metadata?.pack_id ?? 0);
    const pack = packId ? await creditPackById(supplierId, packId) : null;
    const meta = Number(session.metadata?.credits ?? NaN);
    const credits = Number.isFinite(meta) && meta > 0 ? meta : (pack?.credits ?? 0);
    if (credits <= 0) return { credited: false };

    const credited = await applyPurchaseCredit(buyerTenantId, credits, sessionId);
    return { credited, credits: credited ? credits : 0 };
  } catch {
    return { credited: false };
  }
}
