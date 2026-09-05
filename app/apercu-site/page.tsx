import { notFound } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteSettings, type PublicSite } from "@/lib/site";
import { publicOffersBySlug } from "@/lib/offers";
import { whitelabelEnabled } from "@/lib/whitelabel";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemePreviewBridge } from "@/components/theme-preview-bridge";
import { SiteLivePreview } from "@/components/site-live-preview";
import { resolveLocale, tenantLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aperçu du site", robots: { index: false, follow: false } };

/**
 * L'aperçu du mini-site pour le studio, servi dans son iframe.
 *
 * ELLE VIT HORS DE /admin, ET IL LE FAUT : le tableau de bord habille toutes
 * ses pages d'un menu et d'un en-tête, qui n'ont rien à faire dans un cadre
 * censé montrer une page publique.
 *
 * ELLE NE POINTE PAS SUR /web/<adresse>, ET C'EST TOUT L'INTÉRÊT. La page
 * publique refuse de répondre tant que le site n'est pas publié : viser cette
 * adresse aurait obligé le coach à publier une page qu'il n'a pas encore vue,
 * puis à la corriger en direct devant ses visiteurs. Ici, il travaille à
 * couvert et ne publie qu'une fois content.
 *
 * La page est rendue à partir des réglages ENREGISTRÉS, puis le studio y
 * pousse le brouillon en cours. Elle reste privée : le tableau de bord est
 * derrière l'authentification, et l'option est vérifiée comme sur le chemin
 * public.
 */
export default async function ApercuSitePage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!tenantId) notFound();
  if (!(await whitelabelEnabled(tenantId))) notFound();

  const admin = createAdminClient();
  const [settings, { data: t }] = await Promise.all([
    siteSettings(tenantId),
    admin
      .from("tenants")
      .select("slug, google_category")
      .eq("id", tenantId)
      .maybeSingle<{ slug: string; google_category: string | null }>(),
  ]);
  if (!t?.slug) notFound();

  // La marque, le thème et les offres viennent de la landing, exactement comme
  // sur la page publique : l'aperçu doit montrer la même page, pas une
  // approximation qui mentirait sur les couleurs ou les prix.
  const landing = await publicOffersBySlug(t.slug);
  if (!landing) notFound();

  const site: PublicSite = {
    tenant: landing.tenant,
    offers: landing.offers,
    webSlug: settings.webSlug ?? t.slug,
    template: settings.template,
    intro: settings.intro,
    services: settings.services,
    photos: settings.photos,
    programsTitle: settings.programsTitle,
    programsText: settings.programsText,
    address: settings.address,
    phone: settings.phone,
    websiteUrl: settings.websiteUrl,
    openingHours: settings.openingHours,
    category: t.google_category,
    // Le bandeau de capture appartient à la page publique, pas à l'aperçu :
    // il ferait cliquer le coach sur son propre formulaire de prospect.
    leadMagnet: false,
  };

  const locale = await resolveLocale(await tenantLocale(landing.tenant.id));

  return (
    <LocaleProvider locale={locale}>
      {/* Le même pont que sur la page publique : les couleurs réglées dans
          Marque blanche s'appliquent aussi à cet aperçu. */}
      <ThemePreviewBridge />
      <SiteLivePreview initial={site} locale={locale} />
    </LocaleProvider>
  );
}
