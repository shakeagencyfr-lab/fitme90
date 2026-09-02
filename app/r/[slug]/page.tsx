import type { Viewport } from "next";
import { LocaleProvider } from "@/components/locale-provider";
import { setRequestLocale } from "@/lib/i18n/request";
import { resolveLocale, tenantLocale } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { publicResellerBySlug } from "@/lib/reseller";
import { ResellerOnyx } from "@/components/landing-templates/reseller-onyx";
import { ResellerLumen } from "@/components/landing-templates/reseller-lumen";

export const dynamic = "force-dynamic";

export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;
  const data = await publicResellerBySlug(slug);
  return { themeColor: data?.reseller.landingTemplate === "lumen" ? "#f6f4ef" : "#080a0c" };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicResellerBySlug(slug);
  if (!data) return { title: "My Fitness App" };
  return {
    title: `${data.reseller.name} — Lance ton business de coaching boosté par l'IA`,
    description:
      "Ta web app de coaching à ta marque, propulsée par l'IA. Sans code, sans technique, premier client offert. Un business ultra-scalable, clé en main.",
  };
}

export default async function ResellerLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicResellerBySlug(slug);
  if (!data) notFound();

  const { reseller, plans } = data;
  const locale = await resolveLocale(await tenantLocale(reseller.id));
  setRequestLocale(locale);
  return (
    <LocaleProvider locale={locale}>
      {reseller.landingTemplate === "lumen" ? (
        <ResellerLumen reseller={reseller} plans={plans} />
      ) : (
        <ResellerOnyx reseller={reseller} plans={plans} />
      )}
    </LocaleProvider>
  );
}
