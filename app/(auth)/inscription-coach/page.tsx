import Link from "next/link";
import type { Metadata } from "next";
import { Wordmark } from "@/components/brand";
import { CoachSignupForm } from "@/components/auth-forms";
import { CoachAccent } from "@/components/coach-accent";
import { CoachBrandHeader } from "@/components/coach-brand-header";
import { brandForSlug } from "@/lib/branding";
import { TenantLocale } from "@/components/tenant-locale";
import { getT, tenantLocaleBySlug } from "@/lib/i18n/server";

// Inscription COACH (page de vente B2B → création d'espace). `?r=<slug>`
// rattache le coach à un revendeur ET applique sa marque blanche (couleur,
// logo, nom, favicon) — comme l'inscription client l'est aux couleurs du coach.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const brand = sp.r ? await brandForSlug(sp.r) : null;
  const meta: Metadata = { title: `Créer mon espace coach, ${brand?.name ?? "My Fitness App"}` };
  if (brand?.faviconUrl) meta.icons = { icon: [{ url: brand.faviconUrl }], apple: [{ url: brand.faviconUrl }] };
  return meta;
}

export default async function InscriptionCoachPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const sp = await searchParams;
  const resellerSlug = (sp.r ?? "").trim().slice(0, 80) || undefined;
  const brand = resellerSlug ? await brandForSlug(resellerSlug) : null;
  const { t } = await getT(await tenantLocaleBySlug(resellerSlug));
  return (
    <TenantLocale slug={resellerSlug}>
    <CoachAccent slug={resellerSlug}>
      <div className="flex flex-col gap-6">
        {brand ? (
          <CoachBrandHeader slug={resellerSlug} hrefBase="/r" />
        ) : (
          <Link href="/" className="self-center">
            <Wordmark size={22} />
          </Link>
        )}
        {brand ? (
          <p className="-mt-2 text-center text-[13px] text-muted">
            {t("auth.joiningNetwork")} <span className="font-semibold text-ink">{brand.name}</span>.
          </p>
        ) : null}
        <CoachSignupForm resellerSlug={resellerSlug} />
      </div>
    </CoachAccent>
    </TenantLocale>
  );
}
