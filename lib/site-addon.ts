import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeForTenant } from "@/lib/coach-payments";
import { billingParentId } from "@/lib/hierarchy";

/**
 * L'option « Mon site », vendue par le revendeur à ses coachs et salles.
 *
 * Elle suit le modèle de l'upsell marque blanche (lib/whitelabel.ts) avec une
 * porte de plus, parce que les revendeurs ne vendent pas tous pareil :
 *
 *   INCLUS DANS UN PALIER  `plans.site_included`. Les coachs abonnés à ce
 *                          palier ont le site, sans rien payer de plus et sans
 *                          rien avoir à faire. C'est l'argument de vente du
 *                          palier haut.
 *   VENDU À PART           `tenants.site_addon_price_cents`, un abonnement
 *                          mensuel dont le revendeur fixe le prix, encaissé
 *                          sur SON compte Stripe.
 *
 * Les deux coexistent : on inclut le site dans le palier haut et on le propose
 * en option à ceux du dessous. Il suffit qu'une porte soit ouverte.
 *
 * UN COMPTE SANS REVENDEUR N'EST JAMAIS BLOQUÉ. La plateforme, un revendeur,
 * un coach en direct : personne ne leur vend cette option, la leur refuser
 * reviendrait à condamner une fonctionnalité faute de vendeur.
 */

const ACTIVE = new Set(["active", "trialing"]);

/** Comment ce compte a obtenu son site (ou pourquoi il ne l'a pas). */
export type SiteAccessSource =
  /** Aucun revendeur au-dessus : rien à débloquer. */
  | "own"
  /** Le palier souscrit auprès du revendeur inclut le site. */
  | "plan"
  /** Le coach a souscrit l'option à part. */
  | "addon"
  /** Le revendeur propose l'option, le coach ne l'a pas prise. */
  | "offered"
  /** Le revendeur n'ouvre pas cette fonctionnalité. */
  | "closed";

export interface SiteAccess {
  allowed: boolean;
  source: SiteAccessSource;
  /** Prix mensuel proposé par le revendeur (centimes), ou null. */
  priceCents: number | null;
  subStatus: string | null;
}

/** Prix de l'option fixé par un revendeur (null = option non proposée). */
export async function resellerSitePrice(resellerId: string | null): Promise<number | null> {
  if (!resellerId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("site_addon_price_cents")
    .eq("id", resellerId)
    .maybeSingle<{ site_addon_price_cents: number | null }>();
  const c = data?.site_addon_price_cents ?? null;
  return c && c > 0 ? c : null;
}

/** Le revendeur fixe (ou retire) le prix de son option « Mon site ». */
export async function setResellerSitePrice(resellerId: string, cents: number | null): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenants").update({ site_addon_price_cents: cents }).eq("id", resellerId);
}

/**
 * État de l'option pour un compte : y a-t-il droit, par quel chemin, et à quel
 * prix son revendeur la propose s'il ne l'a pas encore.
 */
export async function siteAccess(tenantId: string | null): Promise<SiteAccess> {
  const refuse: SiteAccess = { allowed: false, source: "closed", priceCents: null, subStatus: null };
  if (!tenantId) return refuse;

  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("parent_id, plan_id, site_addon_enabled, site_addon_sub_status")
    .eq("id", tenantId)
    .maybeSingle<{
      parent_id: string | null;
      plan_id: string | null;
      site_addon_enabled: boolean | null;
      site_addon_sub_status: string | null;
    }>();
  if (!data) return refuse;

  const subStatus = data.site_addon_sub_status ?? null;

  // Sans revendeur, personne ne vend cette option : elle est acquise.
  if (!data.parent_id) return { allowed: true, source: "own", priceCents: null, subStatus };

  // L'option souscrite passe avant le palier : elle a été payée.
  if (data.site_addon_enabled) {
    return { allowed: true, source: "addon", priceCents: null, subStatus };
  }

  if (data.plan_id) {
    const { data: plan } = await admin
      .from("plans")
      .select("site_included")
      .eq("id", data.plan_id)
      .maybeSingle<{ site_included: boolean | null }>();
    if (plan?.site_included) {
      return { allowed: true, source: "plan", priceCents: null, subStatus };
    }
  }

  const priceCents = await resellerSitePrice(data.parent_id);
  return {
    allowed: false,
    source: priceCents != null ? "offered" : "closed",
    priceCents,
    subStatus,
  };
}

/**
 * Ce compte a-t-il droit au mini-site ?
 *
 * Appelée sur le chemin PUBLIC (/web/<adresse>) autant que dans le tableau de
 * bord : une option qui expire doit éteindre la page, pas seulement en cacher
 * le formulaire de réglage.
 */
export async function siteAllowed(tenantId: string | null): Promise<boolean> {
  return (await siteAccess(tenantId)).allowed;
}

export interface SiteCheckoutResult {
  url?: string;
  error?: string;
}

/** Démarre l'abonnement à l'option (sur le compte Stripe du revendeur). */
export async function startSiteCheckout(
  coachTenantId: string,
  email: string | null,
): Promise<SiteCheckoutResult> {
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return { error: "Aucun revendeur à facturer." };
  const price = await resellerSitePrice(resellerId);
  if (!price) return { error: "Ton revendeur ne propose pas cette option." };
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return { error: "Ton revendeur n'a pas configuré ses paiements." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: coachTenantId,
      customer_email: email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: price,
            recurring: { interval: "month" },
            product_data: { name: "Mon site, page de présentation publique" },
          },
        },
      ],
      metadata: { buyer_tenant_id: coachTenantId, kind: "site" },
      subscription_data: { metadata: { buyer_tenant_id: coachTenantId, kind: "site" } },
      success_url: `${site}/admin/site?site_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/admin/site?site_annule=1`,
    });
    return { url: checkout.url ?? undefined };
  } catch {
    return { error: "Paiement indisponible. Réessaie dans un instant." };
  }
}

/**
 * Vérifie l'abonnement au retour de Stripe et ouvre l'option.
 *
 * On vérifie que la session appartient bien à CE compte avant d'ouvrir quoi que
 * ce soit : un identifiant de session recopié depuis l'écran d'un autre coach
 * ne doit rien débloquer ici.
 */
export async function verifySiteCheckout(coachTenantId: string, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const resellerId = await billingParentId(coachTenantId);
  if (!resellerId) return false;
  const stripe = await stripeForTenant(resellerId);
  if (!stripe) return false;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const owns =
      session.metadata?.buyer_tenant_id === coachTenantId || session.client_reference_id === coachTenantId;
    if (!owns || session.mode !== "subscription" || !session.subscription) return false;
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    let status: string | null = null;
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      status = sub.status;
    } catch {
      /* on garde au moins l'identifiant */
    }
    const active = (status ? ACTIVE.has(status) : false) || session.payment_status === "paid";
    if (!active) return false;
    const admin = createAdminClient();
    await admin
      .from("tenants")
      .update({
        site_addon_enabled: true,
        site_addon_sub_id: subId,
        site_addon_sub_status: status ?? "active",
      })
      .eq("id", coachTenantId);
    return true;
  } catch {
    return false;
  }
}
