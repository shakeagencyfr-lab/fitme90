import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { publicOffersBySlug, landingTemplateBySlug } from "@/lib/offers";
import { leadMagnetEnabled } from "@/lib/prospects";
import { CoachOnyx } from "@/components/landing-templates/coach-onyx";
import { CoachLumen } from "@/components/landing-templates/coach-lumen";

export const dynamic = "force-dynamic";

// La couleur de la barre du navigateur (mobile) suit le fond du template choisi.
export async function generateViewport({ params }: { params: Promise<{ slug: string }> }): Promise<Viewport> {
  const { slug } = await params;
  const template = await landingTemplateBySlug(slug);
  return { themeColor: template === "lumen" ? "#f6f4ef" : "#0a0b0c" };
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
  const leadMagnet = await leadMagnetEnabled(tenant.id);
  return tenant.landingTemplate === "lumen" ? (
    <CoachLumen tenant={tenant} offers={offers} leadMagnet={leadMagnet} />
  ) : (
    <CoachOnyx tenant={tenant} offers={offers} leadMagnet={leadMagnet} />
  );
}
