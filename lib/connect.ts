import "server-only";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLATFORM_FEE_BPS } from "@/lib/config";

// Stripe Connect — comptes STANDARD (Direct charges + application fee) : chaque
// coach/salle encaisse SUR SON PROPRE compte Stripe. En Standard, c'est LE COACH
// qui assume ses remboursements, litiges et soldes négatifs (pas la plateforme).
// La plateforme prélève une commission (application_fee) sur chaque paiement.
// Ici : l'onboarding du compte et le suivi de son état d'encaissement.

export interface TenantConnect {
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  commission_bps: number | null;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function tenantConnect(tenantId: string): Promise<TenantConnect> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("stripe_account_id, stripe_charges_enabled, commission_bps")
    .eq("id", tenantId)
    .maybeSingle<TenantConnect>();
  return {
    stripe_account_id: data?.stripe_account_id ?? null,
    stripe_charges_enabled: data?.stripe_charges_enabled ?? false,
    commission_bps: data?.commission_bps ?? null,
  };
}

/** Commission effective d'un tenant (override tenant sinon défaut plateforme). */
export function effectiveFeeBps(t: TenantConnect): number {
  return t.commission_bps ?? PLATFORM_FEE_BPS;
}

/** application_fee_amount pour un montant donné (centimes). */
export function applicationFee(amountCents: number, feeBps: number): number {
  return Math.round((amountCents * feeBps) / 10_000);
}

/** Crée le compte Connect du tenant s'il n'existe pas encore ; renvoie son id. */
async function ensureAccount(tenantId: string, email?: string | null): Promise<string> {
  const current = await tenantConnect(tenantId);
  if (current.stripe_account_id) return current.stripe_account_id;

  // Compte STANDARD : le coach garde un compte Stripe complet et assume ses
  // propres pertes. (Pas de `capabilities` explicites : Standard les obtient par
  // défaut après onboarding.)
  const account = await stripe().accounts.create({
    type: "standard",
    email: email ?? undefined,
    metadata: { tenant_id: tenantId },
  });

  const admin = createAdminClient();
  await admin.from("tenants").update({ stripe_account_id: account.id }).eq("id", tenantId);
  return account.id;
}

/**
 * Lien d'onboarding Stripe (Account Link) pour connecter/compléter le compte du
 * coach. À ouvrir côté client : Stripe collecte les infos KYC puis renvoie.
 */
export async function createConnectOnboardingLink(
  tenantId: string,
  email?: string | null,
): Promise<string> {
  const accountId = await ensureAccount(tenantId, email);
  const link = await stripe().accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl()}/admin/paiements?refresh=1`,
    return_url: `${siteUrl()}/admin/paiements?done=1`,
    type: "account_onboarding",
  });
  return link.url;
}

/**
 * Rafraîchit l'état d'encaissement depuis Stripe et le persiste. Renvoie l'état
 * à jour. Sûr à appeler à l'affichage de la page Paiements.
 */
export async function refreshConnectStatus(tenantId: string): Promise<TenantConnect> {
  const current = await tenantConnect(tenantId);
  if (!current.stripe_account_id) return current;
  try {
    const account = await stripe().accounts.retrieve(current.stripe_account_id);
    const enabled = !!account.charges_enabled;
    if (enabled !== current.stripe_charges_enabled) {
      const admin = createAdminClient();
      await admin
        .from("tenants")
        .update({ stripe_charges_enabled: enabled })
        .eq("id", tenantId);
    }
    return { ...current, stripe_charges_enabled: enabled };
  } catch {
    return current;
  }
}

/**
 * URL du tableau de bord Stripe du coach. En Standard, le coach possède un
 * compte Stripe complet : il se connecte directement sur dashboard.stripe.com
 * (pas de login link plateforme, réservé aux comptes Express/Custom).
 */
export function connectDashboardUrl(): string {
  return "https://dashboard.stripe.com";
}
