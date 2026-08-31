import { getAdminOrNull } from "@/lib/admin";
import { tenantBranding } from "@/lib/branding";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantNode } from "@/lib/hierarchy";
import { asLandingTemplate } from "@/lib/offers";
import { DEFAULT_BRAND_COLOR, ROOT_DOMAIN, SITE_HOST } from "@/lib/config";
import { WhiteLabelStudio } from "@/components/white-label-studio";
import { WhitelabelPanel } from "@/components/whitelabel-panel";
import { coachWhitelabelState, verifyWhitelabelCheckout } from "@/lib/whitelabel";
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
  searchParams: Promise<{ wl_session_id?: string; wl_annule?: string }>;
}) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const sp = await searchParams;
  // Retour de l'abonnement upsell : on débloque la marque blanche.
  if (tenantId && sp.wl_session_id) {
    await verifyWhitelabelCheckout(tenantId, sp.wl_session_id);
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Marque blanche
        </h1>
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      </div>
    );
  }

  const admin = createAdminClient();
  const [branding, node, { data: t }] = await Promise.all([
    tenantBranding(tenantId),
    tenantNode(tenantId),
    admin
      .from("tenants")
      .select("slug, name, subdomain, custom_domain, landing_template")
      .eq("id", tenantId)
      .maybeSingle<{ slug: string; name: string; subdomain: string | null; custom_domain: string | null; landing_template: string | null }>(),
  ]);

  const kind = node?.kind ?? "coach";
  const slug = t?.slug ?? null;
  const accent = branding.brandColor || DEFAULT_BRAND_COLOR;

  // Page publique prévisualisée + template applicable selon le niveau.
  const previewUrl =
    kind === "reseller" ? (slug ? `/r/${slug}` : null)
    : kind === "platform" ? "/"
    : (slug ? `/c/${slug}` : null);
  // La plateforme (landing principale) n'est pas pilotée par template.
  const template = kind === "platform" ? null : asLandingTemplate(t?.landing_template);

  // Marque blanche (coach uniquement) : état de l'upsell + SMTP. Le domaine perso
  // est verrouillé tant que l'upsell est proposé par le revendeur mais pas activé.
  const wl = kind === "coach" ? await coachWhitelabelState(tenantId) : { enabled: true, priceCents: null, subStatus: null };
  const smtp = kind === "coach" ? await tenantSmtpStatus(tenantId) : { configured: false, host: null, from: null };
  const domainLocked = kind === "coach" && !wl.enabled && wl.priceCents != null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Marque blanche
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Configure l&apos;identité de ta page publique et vois le rendu en direct. Logo, couleurs,
          textes, template, adresse personnalisée et domaine : tout au même endroit.
        </p>
      </div>

      <WhiteLabelStudio
        branding={branding}
        namePlaceholder={t?.name ?? "Mon espace"}
        template={template}
        accent={accent}
        slug={slug}
        subdomain={t?.subdomain ?? null}
        customDomain={t?.custom_domain ?? null}
        siteHost={SITE_HOST}
        rootDomain={ROOT_DOMAIN}
        previewUrl={previewUrl}
        domainLocked={domainLocked}
        previewVersion={previewToken([
          template, branding.brandColor, branding.headline, branding.tagline,
          branding.logoUrl, branding.faviconUrl,
          String(branding.aboutEnabled), branding.aboutTitle, branding.aboutText, branding.aboutPhotoUrl,
          t?.subdomain, t?.custom_domain,
        ])}
      />

      {kind === "coach" ? (
        <>
          {sp.wl_session_id ? <Alert tone="info">Marque blanche activée. Ton domaine et ton SMTP sont débloqués.</Alert> : null}
          {sp.wl_annule ? <Alert>Souscription annulée.</Alert> : null}
          <WhitelabelPanel
            enabled={wl.enabled}
            priceCents={wl.priceCents}
            smtp={smtp}
            encryptionReady={secretsEncryptionReady()}
          />
        </>
      ) : null}
    </div>
  );
}
