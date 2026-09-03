import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { publicLeadMagnetBySlug } from "@/lib/prospects";
import { DEFAULT_BRAND_COLOR } from "@/lib/config";
import { LeadMagnetForm } from "@/components/lead-magnet-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lm = await publicLeadMagnetBySlug(slug);
  if (!lm) return { title: "Mini-programme gratuit" };
  return {
    title: `Mini-programme gratuit — ${lm.name}`,
    description: "Reçois ta semaine découverte gratuite, calibrée pour ton objectif.",
    icons: lm.faviconUrl ? { icon: lm.faviconUrl } : undefined,
  };
}

// Annoncer le contenu réel plutôt que « une semaine d'entraînement ». Ce qui
// fait la différence entre un lead magnet qu'on garde et un PDF qu'on ferme,
// ce sont ces détails-là : l'échauffement, la charge, le remplacement.
const BENEFITS = [
  "Une semaine complète, jour par jour, repos compris",
  "L'échauffement, la charge à viser et la consigne technique de chaque exercice",
  "Quoi faire si une machine est prise",
  "Comment progresser la semaine suivante",
  "Une journée type, une liste de courses et ta cible de protéines",
  "Un tableau de suivi à imprimer",
];

export default async function DecouvertePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lm = await publicLeadMagnetBySlug(slug);
  if (!lm) notFound();

  const accent = lm.brandColor || DEFAULT_BRAND_COLOR;

  return (
    <div
      className="min-h-dvh bg-paper"
      style={{ ["--color-brand" as string]: accent, ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)` } as CSSProperties}
    >
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href={`/c/${lm.slug}`} className="flex items-center gap-2.5">
            {lm.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lm.logoUrl} alt={lm.name} className="h-9 w-auto max-w-[180px] object-contain" />
            ) : (
              <span className="font-archivo text-[18px] font-extrabold tracking-[-0.02em] text-ink">{lm.name}</span>
            )}
          </Link>
          <Link href={`/c/${lm.slug}`} className="text-[13.5px] font-semibold text-muted hover:text-ink">Voir la page ↗</Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[900px] gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-brand/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
            Offert par {lm.name}
          </span>
          <h1 className="font-archivo text-[clamp(28px,5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
            Ton mini-programme gratuit
          </h1>
          <p className="max-w-[46ch] text-[16px] leading-[1.6] text-muted">
            Réponds à cinq questions et reçois immédiatement un document complet, prêt à imprimer.
            Pas une liste d&apos;exercices : un plan de semaine qu&apos;on peut suivre seul, sans engagement.
          </p>
          <ul className="flex flex-col gap-2.5 pt-1">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-body">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <LeadMagnetForm slug={lm.slug} />
      </main>
    </div>
  );
}
