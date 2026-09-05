import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteSettings } from "@/lib/site";
import { siteAccess, verifySiteCheckout } from "@/lib/site-addon";
import { serpApiEnabled } from "@/lib/serpapi";
import { SITE_HOST } from "@/lib/config";
import { SiteStudio } from "@/components/site-studio";
import { SiteLocked } from "@/components/site-locked";
import { Alert } from "@/components/ui";

export const metadata = { title: "Mon site, Admin My Fitness App" };
export const dynamic = "force-dynamic";

/**
 * Jeton d'aperçu : un hachage PUR de ce qui est enregistré.
 *
 * Il ne change qu'après un enregistrement qui modifie vraiment la page, ce qui
 * recharge l'iframe à ce moment-là et à ce moment-là seulement. Un horodatage
 * aurait rechargé l'aperçu à chaque rendu du studio, effaçant le brouillon en
 * cours à la première frappe.
 */
function previewToken(parts: (string | null | undefined)[]): number {
  const s = parts.map((p) => p ?? "").join("|");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/**
 * Studio « Mon site » : le mini CMS à gauche, la page en train de s'écrire à
 * droite.
 *
 * La page de vente (/c/<slug>) argumente et fait payer. Ce site-ci présente
 * l'établissement, et c'est lui qui donne une destination à ce que l'import
 * Google rapporte : adresse, horaires, photos et avis.
 *
 * C'est une OPTION : elle s'ouvre par le palier souscrit auprès du revendeur,
 * ou par un abonnement à part. Quand elle est fermée, on montre ce qu'elle
 * apporte au lieu de griser un onglet sans rien dire.
 */
export default async function MonSitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const params = await searchParams;

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <Titre />
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      </div>
    );
  }

  // Retour de paiement : on vérifie la session AVANT de lire l'accès, sinon le
  // coach qui vient de payer retomberait sur l'écran de vente.
  const sessionId = typeof params.site_session_id === "string" ? params.site_session_id : "";
  if (sessionId) await verifySiteCheckout(tenantId, sessionId);

  const acces = await siteAccess(tenantId);
  if (!acces.allowed) {
    return (
      <div className="flex flex-col gap-5">
        <Titre />
        <SiteLocked priceCents={acces.priceCents} erreur={"site_erreur" in params} />
      </div>
    );
  }

  const admin = createAdminClient();
  const [settings, { data: t }] = await Promise.all([
    siteSettings(tenantId),
    admin
      .from("tenants")
      .select("slug, name, google_place_id, google_maps_url, google_rating, google_reviews_count, google_category, address")
      .eq("id", tenantId)
      .maybeSingle<{
        slug: string;
        name: string | null;
        google_place_id: string | null;
        google_maps_url: string | null;
        google_rating: number | null;
        google_reviews_count: number | null;
        google_category: string | null;
        address: string | null;
      }>(),
  ]);

  const google = t?.google_place_id
    ? {
        name: t.name,
        mapsUrl: t.google_maps_url,
        rating: t.google_rating,
        reviewsCount: t.google_reviews_count,
        category: t.google_category,
        address: t.address,
      }
    : null;

  return (
    <div className="flex flex-col gap-5">
      <Titre />
      {acces.source === "addon" && sessionId ? (
        <Alert tone="info">{tx("Option activée. Ton site est à toi, il ne reste qu'à le remplir.")}</Alert>
      ) : null}

      {/* La version force l'iframe à relire l'état serveur après un
          enregistrement : sans elle, l'aperçu resterait sur son brouillon et
          on ne saurait plus ce qui est réellement en ligne. */}
      <SiteStudio
        settings={settings}
        host={SITE_HOST}
        landingSlug={t?.slug ?? ""}
        google={google}
        serpReady={serpApiEnabled()}
        previewVersion={previewToken([
          settings.webSlug,
          settings.template,
          settings.intro,
          settings.programsTitle,
          settings.programsText,
          settings.address,
          settings.phone,
          settings.websiteUrl,
          JSON.stringify(settings.services),
          JSON.stringify(settings.photos),
          JSON.stringify(settings.openingHours),
        ])}
      />

      <p className="text-[13px] leading-[1.6] text-muted-2">
        {tx("Les couleurs, le logo et les polices de ce site viennent de")}{" "}
        <Link href="/admin/marque-blanche" className="text-brand hover:underline">{tx("Marque blanche")}</Link>
        {tx(". Les programmes présentés en bas de page sont ceux de tes")}{" "}
        <Link href="/admin/plans" className="text-brand hover:underline">{tx("plans")}</Link>.
      </p>
    </div>
  );
}

function Titre() {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
        {tx("Mon site")}
      </h1>
      <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
        {tx("Une page de présentation à ton nom : qui tu es, ce que tu proposes, où tu es et quand. Elle se termine par une introduction à tes programmes en ligne, avec un lien vers ta page de vente.")}
      </p>
    </div>
  );
}
