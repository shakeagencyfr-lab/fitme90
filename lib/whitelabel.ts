import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { freePlanOffered } from "@/lib/plans";
import { poweredByHiddenFor, resolveWhitelabel, type WhitelabelAccess, type WhitelabelSource } from "@/lib/whitelabel-rules";

export type { WhitelabelAccess, WhitelabelSource };

/**
 * Le PACK marque blanche, et qui y a droit.
 *
 * Un seul pack, quatre choses dedans, et elles s'ouvrent ou se ferment
 * ENSEMBLE :
 *   - le domaine personnalisé (CNAME) ;
 *   - l'envoi d'e-mails depuis le serveur SMTP du coach ;
 *   - le mini-site de présentation (/web/<adresse>) ;
 *   - l'application installée au nom et à l'icône du coach, et le droit de
 *     retirer le badge « Propulsé par » du pied de sa page publique.
 *
 * Sans le pack, le coach garde tout de même sa page personnalisée : ses
 * couleurs, son logo, son adresse sous la marque de son revendeur, le
 * paiement en ligne. C'est le socle, il n'est pas en vente.
 *
 * DEUX PORTES pour un coach, et il suffit qu'une soit ouverte :
 *   INCLUS DANS LE PALIER   `plans.whitelabel_included` sur le palier courant
 *                           (le gratuit compris : c'est le revendeur qui
 *                           décide s'il l'offre dès le départ) ;
 *   SOUSCRIT À PART         un abonnement mensuel dont le revendeur fixe le
 *                           prix (`tenants.whitelabel_addon_price_cents`),
 *                           encaissé sur SON compte Stripe, et relu par le
 *                           cron : quand l'abonnement s'arrête, le pack se
 *                           ferme (lib/whitelabel-billing.ts).
 *
 * LA PLATEFORME ET LES REVENDEURS ONT LE PACK D'OFFICE. Personne ne le leur
 * vend, et la promesse faite au revendeur est justement la marque blanche
 * complète dès son premier jour. Un coach sans revendeur au-dessus est dans le
 * même cas : il n'y a personne pour lui fermer quoi que ce soit.
 *
 * Ce module ne parle pas à Stripe, exprès : il est lu sur le chemin PUBLIC
 * (proxy du domaine, page de vente, mini-site, manifest) et doit rester léger
 * et sans dépendance qui bouclerait sur les paiements. Les règles elles-mêmes
 * sont dans lib/whitelabel-rules.ts, testées à sec.
 */

const REFUSED: WhitelabelAccess = { allowed: false, source: "closed", priceCents: null, subStatus: null, hidePoweredBy: false };

interface AccessRow {
  kind: string | null;
  parent_id: string | null;
  plan_id: string | null;
  whitelabel_enabled: boolean | null;
  whitelabel_sub_status: string | null;
  hide_powered_by: boolean | null;
}

const ACCESS_COLS = "kind, parent_id, plan_id, whitelabel_enabled, whitelabel_sub_status, hide_powered_by";

/** Prix du pack fixé par un revendeur (null = pack non vendu à part). */
export async function resellerWhitelabelPrice(resellerId: string | null): Promise<number | null> {
  if (!resellerId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("whitelabel_addon_price_cents")
    .eq("id", resellerId)
    .maybeSingle<{ whitelabel_addon_price_cents: number | null }>();
  const c = data?.whitelabel_addon_price_cents ?? null;
  return c && c > 0 ? c : null;
}

/** Le revendeur fixe (ou retire) le prix de son pack vendu à part. */
export async function setResellerWhitelabelPrice(resellerId: string, cents: number | null): Promise<void> {
  const admin = createAdminClient();
  await admin.from("tenants").update({ whitelabel_addon_price_cents: cents }).eq("id", resellerId);
}

/**
 * Le palier courant du compte inclut-il le pack ?
 *
 * Sans `plan_id`, le compte est sur le palier gratuit de son parent : c'est ce
 * palier-là qu'on relit. S'il est fermé, il n'y a pas de palier, donc pas de
 * pack. Un palier payant retiré de la vente reste celui de ses abonnés : ce
 * qu'il inclut leur reste acquis.
 */
async function planIncludesWhitelabel(row: AccessRow): Promise<boolean> {
  if (row.plan_id) {
    const admin = createAdminClient();
    const { data: plan } = await admin
      .from("plans")
      .select("whitelabel_included")
      .eq("id", row.plan_id)
      .maybeSingle<{ whitelabel_included: boolean | null }>();
    return !!plan?.whitelabel_included;
  }
  const free = await freePlanOffered(row.parent_id);
  return !!free?.whitelabel_included;
}

async function accessOf(row: AccessRow): Promise<WhitelabelAccess> {
  const sellable = row.kind !== "platform" && row.kind !== "reseller" && !!row.parent_id;
  // On ne lit que ce que la décision peut encore consulter : un revendeur n'a
  // pas de palier à relire, ni de prix chez qui que ce soit.
  const [planIncluded, priceCents] = sellable
    ? await Promise.all([planIncludesWhitelabel(row), resellerWhitelabelPrice(row.parent_id)])
    : [false, null];
  return resolveWhitelabel({
    kind: row.kind,
    parentId: row.parent_id,
    addonEnabled: !!row.whitelabel_enabled,
    planIncluded,
    priceCents,
    subStatus: row.whitelabel_sub_status ?? null,
    hidePoweredBy: !!row.hide_powered_by,
  });
}

/**
 * L'accès d'un compte au pack : y a-t-il droit, par quel chemin, et à quel
 * prix son revendeur le vend s'il ne l'a pas.
 *
 * Toute surface du pack passe par ici, publique ou non. Une option qui expire
 * doit éteindre le domaine, le site et l'icône installée, pas seulement en
 * cacher les réglages.
 */
export async function whitelabelAccess(tenantId: string | null): Promise<WhitelabelAccess> {
  if (!tenantId) return REFUSED;
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select(ACCESS_COLS).eq("id", tenantId).maybeSingle<AccessRow>();
  if (!data) return REFUSED;
  return accessOf(data);
}

/** Ce compte a-t-il le pack ? La réponse courte, pour les gardes serveur. */
export async function whitelabelEnabled(tenantId: string | null): Promise<boolean> {
  return (await whitelabelAccess(tenantId)).allowed;
}

/**
 * Le badge « Propulsé par » est-il retiré de la page publique de ce compte ?
 *
 * Vrai seulement si le coach a le pack ET a coché la case. Un coach qui perd
 * le pack retrouve le badge sans qu'on ait à toucher à sa case : la case
 * reste, elle attend qu'il revienne.
 */
export async function poweredByHidden(tenantId: string | null): Promise<boolean> {
  return poweredByHiddenFor(await whitelabelAccess(tenantId));
}

/**
 * Le coach retire ou remet le badge. Refusé sans le pack : l'écran ne montre
 * la case qu'aux comptes qui l'ont, et l'action le vérifie à son tour.
 */
export async function setHidePoweredBy(tenantId: string, hidden: boolean): Promise<{ ok: boolean; error?: string }> {
  const access = await whitelabelAccess(tenantId);
  if (!access.allowed) return { ok: false, error: "Le pack marque blanche est nécessaire pour retirer le badge." };
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ hide_powered_by: hidden }).eq("id", tenantId);
  return error ? { ok: false, error: "Enregistrement impossible." } : { ok: true };
}

/**
 * Le slug servi par un domaine personnalisé, tel que le proxy le demande, ou
 * null si le domaine est inconnu OU si son compte n'a plus le pack.
 *
 * Un domaine enregistré avant l'expiration du pack doit cesser de répondre,
 * pas continuer à servir la page sous prétexte qu'il est en base.
 */
export async function slugForWhitelabelHost(domain: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select(`slug, ${ACCESS_COLS}`)
    .eq("custom_domain", domain)
    .maybeSingle<AccessRow & { slug: string | null }>();
  if (!data?.slug) return null;
  const access = await accessOf(data);
  return access.allowed ? data.slug : null;
}
