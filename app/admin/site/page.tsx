import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteSettings } from "@/lib/site";
import { SITE_HOST } from "@/lib/config";
import { SiteSettingsForm } from "@/components/site-settings-form";
import { Alert } from "@/components/ui";

export const metadata = { title: "Mon site, Admin My Fitness App" };
export const dynamic = "force-dynamic";

/**
 * Réglages du mini-site public du coach.
 *
 * La page de vente (/c/<slug>) argumente et fait payer. Ce site-ci présente
 * l'établissement, et c'est lui qui donne enfin une destination à ce que
 * l'import Google rapportait sans que rien ne l'affiche : adresse, horaires,
 * photos et avis.
 */
export default async function MonSitePage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  if (!tenantId) {
    return (
      <div className="flex flex-col gap-5">
        <Titre />
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      </div>
    );
  }

  const admin = createAdminClient();
  const [settings, { data: t }] = await Promise.all([
    siteSettings(tenantId),
    admin.from("tenants").select("slug").eq("id", tenantId).maybeSingle<{ slug: string }>(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <Titre />
      <SiteSettingsForm settings={settings} host={SITE_HOST} landingSlug={t?.slug ?? ""} />
      <p className="text-[13px] leading-[1.6] text-muted-2">
        {tx("Les couleurs, le logo et les polices de ce site viennent de")}{" "}
        <Link href="/admin/marque-blanche" className="text-brand hover:underline">{tx("Marque blanche")}</Link>
        {tx(". L'adresse, les horaires, les photos et les avis peuvent être repris de ta")}{" "}
        <Link href="/admin/fiche-google" className="text-brand hover:underline">{tx("fiche Google")}</Link>.
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
