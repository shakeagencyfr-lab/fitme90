import { getAdminOrNull } from "@/lib/admin";
import { tx } from "@/lib/i18n/request";
import { customDomainInfo } from "@/lib/custom-domain";
import { tenantBranding } from "@/lib/branding";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantNode } from "@/lib/hierarchy";
import { asLandingTemplate, asBusinessType } from "@/lib/offers";
import { DEFAULT_BRAND_COLOR, ROOT_DOMAIN, SITE_HOST } from "@/lib/config";
import { WhiteLabelStudio } from "@/components/white-label-studio";
import { WhitelabelPanel } from "@/components/whitelabel-panel";
import { whitelabelAccess } from "@/lib/whitelabel";
import { verifyWhitelabelCheckout } from "@/lib/whitelabel-billing";
import { poweredByNameFor } from "@/lib/offers";
import { tenantSmtpStatus } from "@/lib/smtp";
import { secretsEncryptionReady } from "@/lib/crypto";
import { Alert } from "@/components/ui";

export const metadata = { title: "Marque blanche" };
export const dynamic = "force-dynamic";

// Jeton d'aperçu : hash pur des champs qui affectent le rendu public. Il change
// uniquement quand un enregistrement modifie la marque/le template/l'adresse, ce
// qui force le rechargement de l'iframe d'aperçu (et lui seul).
function previewToken(parts: (string | null | undefined)[]): number {
  const s = parts.map((p) => p ?? "").join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export default async function WhiteLabelPage({
  searchParams,
}: {
  searchParams: Promise<{ wl_session_id?: string; wl_annule?: string; wl_erreur?: string }>;
}) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const sp = await searchParams;
  // Retour du paiement du pack : on l'ouvre avant de lire l'accès, sinon le
  // coach qui vient de payer retombe sur l'écran de vente.
  if (tenantId && sp.wl_session_id) {
    await verifyWhitelabelCheckout(tenantId, sp.wl_session_id);
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Marque blanche")}</h1>
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      </div>
    );
  }

  const admin = createAdminClient();
  const [branding, node, { data: t }] = await Promise.all([
    tenantBranding(tenantId),
    tenantNode(tenantId),
    admin
      .from("tenants")
      .select("slug, name, subdomain, custom_domain, landing_template, business_type")
      .eq("id", tenantId)
      .maybeSingle<{ slug: string; name: string; subdomain: string | null; custom_domain: string | null; landing_template: string | null; business_type: string | null }>(),
  ]);

  const kind = node?.kind ?? "coach";
  const slug = t?.slug ?? null;
  const accent = branding.brandColor || DEFAULT_BRAND_COLOR;

  // Page publique prévisualisée + template applicable selon le niveau.
  const previewUrl =
    kind === "reseller" ? (slug ? `/r/${slug}` : null)
    : kind === "platform" ? "/revendeurs"
    : (slug ? `/c/${slug}` : null);
  // La plateforme (landing principale) n'est pas pilotée par template.
  const template = kind === "platform" ? null : asLandingTemplate(t?.landing_template);
  // La plateforme ne vend pas de programme à un client final : la question
  // « coach ou salle ? » ne se pose pas à cet étage.
  const businessType = kind === "platform" ? null : asBusinessType(t?.business_type);

  // Le pack marque blanche : domaine, SMTP, site, application, badge. Un coach
  // sans le pack voit le domaine verrouillé, QUEL QUE SOIT le prix : un
  // revendeur qui n'a pas fixé de prix n'a pas offert le pack pour autant.
  // Plateforme et revendeurs l'ont d'office.
  const [wl, smtp, poweredByName] = await Promise.all([
    whitelabelAccess(tenantId),
    kind === "coach" ? tenantSmtpStatus(tenantId) : Promise.resolve({ configured: false, host: null, from: null }),
    kind === "coach" ? poweredByNameFor(tenantId) : Promise.resolve(""),
  ]);
  const domainLocked = kind === "coach" && !wl.allowed;
  const domainInfo = await customDomainInfo(t?.custom_domain ?? null);

  // Un thème habille les espaces de ceux qui sont EN DESSOUS. Un coach donne
  // ses couleurs à ses clients, un revendeur au dashboard de ses coachs. On le
  // dit en clair : sinon chacun croit régler l'apparence de son propre écran.
  const themeAudience =
    kind === "reseller"
      ? tx("Ces réglages habillent ta page publique et le tableau de bord de tes coachs et salles. Ils ne changent pas ton propre écran, qui porte la marque de la plateforme.")
      : kind === "platform"
        ? tx("Ces réglages habillent la page d'accueil de la plateforme et le tableau de bord de tes revendeurs.")
        : tx("Ces réglages habillent ta page publique et l'espace de tes clients : leur application, leurs pages de connexion et l'icône qu'ils installent sur leur téléphone.");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Marque blanche")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Configure l'identité de ta page publique et vois le rendu en direct. Logo, couleurs, textes, template, adresse personnalisée et domaine : tout au même endroit.")}</p>
      </div>

      <WhiteLabelStudio
        branding={branding}
        namePlaceholder={t?.name ?? "Mon espace"}
        template={template}
        accent={accent}
        slug={slug}
        subdomain={t?.subdomain ?? null}
        customDomainInfo={domainInfo}
        siteHost={SITE_HOST}
        rootDomain={ROOT_DOMAIN}
        previewUrl={previewUrl}
        kind={kind}
        businessType={businessType}
        domainLocked={domainLocked}
        themeAudience={themeAudience}
        previewVersion={previewToken([
          template, branding.brandColor, branding.headline, branding.tagline,
          branding.logoUrl, branding.faviconUrl,
          String(branding.aboutEnabled), branding.aboutTitle, branding.aboutText, branding.aboutPhotoUrl,
          t?.subdomain, t?.custom_domain, t?.business_type,
          // Le thème et l'identité changent aussi le rendu public : sans eux
          // dans le jeton, l'aperçu resterait sur l'ancienne version.
          JSON.stringify(branding.theme), JSON.stringify(branding.identity),
          branding.logoDarkUrl,
        ])}
      />

      {kind === "coach" ? (
        <>
          {sp.wl_session_id && wl.allowed ? <Alert tone="info">{tx("Pack marque blanche activé. Domaine, e-mails, site et application sont à toi.")}</Alert> : null}
          {sp.wl_annule ? <Alert>{tx("Souscription annulée.")}</Alert> : null}
          <WhitelabelPanel
            allowed={wl.allowed}
            source={wl.source}
            priceCents={wl.priceCents}
            hidePoweredBy={wl.hidePoweredBy}
            poweredByName={poweredByName}
            smtp={smtp}
            encryptionReady={secretsEncryptionReady()}
            erreur={!!sp.wl_erreur}
          />
        </>
      ) : null}
    </div>
  );
}
