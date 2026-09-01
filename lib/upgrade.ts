import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { getOffer, listOffers, type Offer } from "@/lib/offers";
import { pickUpgradeOffer, upgradePriceCents } from "@/lib/upgrade-logic";

// Bascule 3 mois → 12 mois (semaine 10). Le client PROLONGE : il règle la
// différence entre le 12 mois et ce qu'il a déjà payé, sur le compte Stripe du
// coach (BYOK, sans webhook plateforme : contrôle au retour). Son programme
// garde sa date de départ et son journal ; il passe simplement à 4 blocs, et le
// bloc 2 sera construit sur ses vrais résultats une semaine avant la fin du 1er.

export interface UpgradeQuote {
  target: Offer;
  alreadyPaidCents: number;
  dueCents: number;
}

/** L'offre 12 mois du coach et ce qu'il reste à payer pour y passer. */
export async function upgradeQuote(userId: string): Promise<UpgradeQuote | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id, selected_offer_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null; selected_offer_id: string | null }>();
  if (!profile?.tenant_id) return null;

  const [current, offers] = await Promise.all([
    profile.selected_offer_id ? getOffer(profile.selected_offer_id) : Promise.resolve(null),
    listOffers(profile.tenant_id),
  ]);
  const target = pickUpgradeOffer(offers, profile.selected_offer_id);
  if (!target) return null;
  const alreadyPaidCents = current?.billing_type === "one_time" ? (current.price_cents ?? 0) : 0;
  return { target, alreadyPaidCents, dueCents: upgradePriceCents(target.price_cents ?? 0, alreadyPaidCents) };
}

/**
 * Applique la bascule : offre sélectionnée → 12 mois, programme en cours →
 * 12 mois (les blocs suivants suivront), et le coach est prévenu une fois.
 * Idempotent : rappelée au rechargement de la page de retour, ne refait rien.
 */
export async function applyUpgrade(userId: string, targetOfferId: string): Promise<boolean> {
  const admin = createAdminClient();
  const target = await getOffer(targetOfferId);
  if (!target || target.duration_months !== 12) return false;

  const [{ data: profile }, { data: prog }] = await Promise.all([
    admin
      .from("profiles")
      .select("tenant_id, selected_offer_id, name, email")
      .eq("id", userId)
      .maybeSingle<{ tenant_id: string | null; selected_offer_id: string | null; name: string | null; email: string | null }>(),
    admin
      .from("programs")
      .select("id, duration_months")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; duration_months: number | null }>(),
  ]);
  if (!profile || profile.tenant_id !== target.tenant_id) return false;
  if (profile.selected_offer_id === target.id && prog?.duration_months === 12) return true; // déjà fait

  await admin.from("profiles").update({ selected_offer_id: target.id }).eq("id", userId);
  if (prog) await admin.from("programs").update({ duration_months: 12 }).eq("id", prog.id);

  const { addCoachNotification } = await import("@/lib/notifications");
  await addCoachNotification({
    tenantId: target.tenant_id,
    type: "purchase",
    title: `${profile.name || profile.email || "Un client"} passe sur « ${target.name} »`,
    body: "Bascule 3 mois → 12 mois : son programme continue, le bloc 2 sera construit sur ses résultats.",
    url: `/admin/clients/${userId}`,
    clientId: userId,
  });
  return true;
}

export interface UpgradeStart {
  url?: string;
  /** Rien à encaisser (12 mois pas plus cher que le 3 mois) : bascule appliquée directement. */
  applied?: boolean;
  error?: string;
}

/** Crée la session Stripe de la différence, sur le compte du coach. */
export async function startUpgradeCheckout(userId: string, email: string | null): Promise<UpgradeStart> {
  const quote = await upgradeQuote(userId);
  if (!quote) return { error: "Ton coach ne propose pas encore de programme 12 mois." };
  if (quote.dueCents <= 0) {
    const ok = await applyUpgrade(userId, quote.target.id);
    return ok ? { applied: true } : { error: "Bascule impossible pour l'instant." };
  }

  const stripe = await stripeForTenant(quote.target.tenant_id);
  if (!stripe) return { error: "Ton coach n'a pas encore configuré ses paiements." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: userId,
      customer_email: email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (quote.target.currency || "eur").toLowerCase(),
            unit_amount: quote.dueCents,
            product_data: {
              name: `${quote.target.name} (passage depuis le 3 mois, déjà payé déduit)`,
            },
          },
        },
      ],
      metadata: { user_id: userId, kind: "upgrade", offer_id: quote.target.id },
      success_url: `${site}/app?upgrade=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/app?upgrade=0`,
    });
    return { url: checkout.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

/** Au retour de Stripe : vérifie la session avec la clé du coach, puis applique. */
export async function confirmUpgrade(userId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string | null }>();
  if (!profile?.tenant_id) return false;
  const stripe = await stripeForTenant(profile.tenant_id);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns = session.metadata?.user_id === userId || session.client_reference_id === userId;
    if (!owns || session.metadata?.kind !== "upgrade") return false;
    if (session.payment_status !== "paid") return false;
    const offerId = session.metadata?.offer_id;
    if (!offerId) return false;
    return applyUpgrade(userId, offerId);
  } catch {
    return false;
  }
}
