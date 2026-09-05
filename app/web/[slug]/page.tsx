import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { publicSiteBySlug } from "@/lib/site";
import { SITE_THEME_COLOR } from "@/lib/site-templates";
import { SiteAtelier } from "@/components/site-templates/site-atelier";
import { SiteNocturne } from "@/components/site-templates/site-nocturne";
import { SiteVitrine } from "@/components/site-templates/site-vitrine";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemePreviewBridge } from "@/components/theme-preview-bridge";
import { resolveLocale, tenantLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// Mini-site public d'un coach ou d'une salle : /web/<adresse>.
//
// Il présente l'établissement (qui, quoi, où, quand, avis) et se termine par
// une section qui introduit les programmes en ligne, avec un lien vers la
// landing de vente /c/<slug>. C'est la destination qui manquait aux
// informations reprises de la fiche Google : adresse, horaires, photos et avis
// étaient enregistrés sans qu'aucune page ne les affiche.

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;
  const site = await publicSiteBySlug(slug);
  return { themeColor: site ? SITE_THEME_COLOR[site.template] : "#0a0b0d" };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await publicSiteBySlug(slug);
  if (!site) return { title: "Page introuvable" };
  const t = site.tenant;
  // Le référencement d'un site de présentation se joue sur le nom et le lieu :
  // c'est ce qu'on tape quand on cherche un établissement.
  const lieu = site.address ? ` · ${site.address}` : "";
  return {
    title: t.seoTitle || `${t.name}${site.category ? `, ${site.category}` : ""}`,
    description:
      t.seoDescription || site.intro || t.tagline || `${t.name}${lieu}`,
    icons: t.faviconUrl ? { icon: t.faviconUrl } : undefined,
  };
}

export default async function CoachSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const site = await publicSiteBySlug(slug);
  if (!site) notFound();

  // Le pont d'aperçu n'existe QUE dans l'iframe du studio : sur la page
  // publique, aucun visiteur ne peut lui envoyer de thème.
  const enApercu = "preview" in (await searchParams);
  const locale = await resolveLocale(await tenantLocale(site.tenant.id));
  const props = { site, locale };

  const page =
    site.template === "nocturne" ? <SiteNocturne {...props} />
    : site.template === "vitrine" ? <SiteVitrine {...props} />
    : <SiteAtelier {...props} />;

  return (
    <LocaleProvider locale={locale}>
      {enApercu ? <ThemePreviewBridge /> : null}
      {page}
    </LocaleProvider>
  );
}
