import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { publicOffersBySlug, landingTemplateBySlug } from "@/lib/offers";
import { leadMagnetEnabled } from "@/lib/prospects";
import { CoachOnyx } from "@/components/landing-templates/coach-onyx";
import { CoachLumen } from "@/components/landing-templates/coach-lumen";
import { CoachVolt } from "@/components/landing-templates/coach-volt";
import { CoachSage } from "@/components/landing-templates/coach-sage";
import { CoachKinetic } from "@/components/landing-templates/coach-kinetic";
import { CoachAurora } from "@/components/landing-templates/coach-aurora";
import { LocaleProvider } from "@/components/locale-provider";
import { resolveLocale, tenantLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// La couleur de la barre du navigateur (mobile) suit le fond du template choisi.
export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;
  const template = await landingTemplateBySlug(slug);
  const colors: Record<string, string> = { lumen: "#f6f4ef", volt: "#eeeee8", sage: "#f7f2ea", aurora: "#faf8f4", kinetic: "#08090b" };
  return { themeColor: colors[template] ?? "#0a0b0c" };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) return { title: "Coach introuvable" };
  const t = data.tenant;
  return {
    title: `${t.headline || t.name} — Coaching`,
    description: t.tagline || `Programme de coaching personnalisé avec ${t.name}.`,
    icons: t.faviconUrl ? { icon: t.faviconUrl } : undefined,
  };
}

export default async function CoachLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) notFound();

  const { tenant, offers } = data;
  const [leadMagnet, locale] = await Promise.all([leadMagnetEnabled(tenant.id), resolveLocale(await tenantLocale(tenant.id))]);
  const props = { tenant, offers, leadMagnet, locale };
  const page =
    tenant.landingTemplate === "lumen" ? <CoachLumen {...props} />
    : tenant.landingTemplate === "volt" ? <CoachVolt {...props} />
    : tenant.landingTemplate === "sage" ? <CoachSage {...props} />
    : tenant.landingTemplate === "kinetic" ? <CoachKinetic {...props} />
    : tenant.landingTemplate === "aurora" ? <CoachAurora {...props} />
    : <CoachOnyx {...props} />;
  return <LocaleProvider locale={locale}>{page}</LocaleProvider>;
}
