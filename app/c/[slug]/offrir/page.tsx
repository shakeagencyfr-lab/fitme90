import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicOffersBySlug } from "@/lib/offers";
import { DEFAULT_BRAND_COLOR } from "@/lib/config";
import { GiftPurchase } from "@/components/gift-purchase";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  return { title: data ? `Offrir un programme, ${data.tenant.name}` : "Offrir un programme" };
}

export default async function GiftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) notFound();

  const { tenant, offers } = data;
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const giftable = offers.filter((o) => o.billing_type !== "subscription");

  return (
    <div
      className="min-h-dvh bg-[#0a0b0c] text-white"
      style={
        {
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
        } as CSSProperties
      }
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8 px-5 py-12 sm:py-16">
        <Link href={`/c/${slug}`} className="text-[13px] text-white/50 transition-colors hover:text-white">
          ← Retour à {tenant.name}
        </Link>

        <header className="flex flex-col gap-3">
          <span className="w-fit rounded-pill border border-brand/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
            Carte cadeau
          </span>
          <h1 className="font-archivo text-[clamp(30px,7vw,46px)] font-extrabold leading-[1.03] tracking-[-0.03em] text-white">
            Offrir un programme
          </h1>
          <p className="text-[15px] leading-[1.6] text-white/65">
            Choisis un programme et règle-le : tu recevras un <span className="text-white">code cadeau</span> à transmettre
            à la personne de ton choix. Elle l&apos;utilisera à l&apos;inscription pour débloquer son accompagnement,
            sans rien payer.
          </p>
        </header>

        {!tenant.chargesEnabled ? (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-5 text-[14px] text-white/60">
            Les paiements ne sont pas encore activés chez ce coach. Reviens bientôt.
          </div>
        ) : giftable.length === 0 ? (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-5 text-[14px] text-white/60">
            Aucun programme à offrir pour le moment (les abonnements ne sont pas concernés).
          </div>
        ) : (
          <GiftPurchase
            slug={slug}
            offers={giftable.map((o) => ({
              id: o.id,
              name: o.name,
              price_cents: o.price_cents,
              duration_months: o.duration_months,
            }))}
          />
        )}
      </div>
    </div>
  );
}
