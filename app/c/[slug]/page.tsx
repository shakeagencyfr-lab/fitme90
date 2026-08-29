import Link from "next/link";
import { notFound } from "next/navigation";
import { publicOffersBySlug, type Offer } from "@/lib/offers";
import { programDaysForMonths, formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";

export const dynamic = "force-dynamic";

function durationText(months: number): string {
  const label = months === 12 ? "1 an" : `${months} mois`;
  return `${label} · ${programDaysForMonths(months)} jours`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  return { title: data ? `${data.tenant.headline || data.tenant.name} — Coaching` : "Coach introuvable" };
}

const VALUE_PROPS = [
  ["Programme sur-mesure", "Un plan d'entraînement bâti sur tes objectifs, ton niveau et ton matériel."],
  ["Coach IA au quotidien", "Un assistant qui répond, adapte tes séances et te garde motivé, tous les jours."],
  ["Nutrition personnalisée", "Des repas et des macros adaptés à ton corps, tes goûts et tes contraintes."],
  ["Suivi de ta progression", "Poids, mensurations, séances validées : tout est mesuré pour te faire avancer."],
] as const;

function OfferCard({ offer, slug, accent, chargesEnabled }: { offer: Offer; slug: string; accent: string; chargesEnabled: boolean }) {
  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-archivo font-bold text-[20px] leading-tight text-ink">{offer.name}</h3>
        <span className="text-[13px] text-muted">{durationText(offer.duration_months)}</span>
      </div>
      <div className="font-archivo font-extrabold text-[34px] leading-none tracking-[-0.03em] text-ink">
        {formatEuros(offer.price_cents)}
        <span className="ml-1.5 align-middle text-[13px] font-normal text-muted-2">paiement unique</span>
      </div>
      {chargesEnabled ? (
        <Link
          href={`/inscription?c=${slug}&offer=${offer.id}`}
          className="tap inline-flex h-12 items-center justify-center rounded-btn px-5 font-plex font-semibold text-[15px] text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          Choisir cette offre
        </Link>
      ) : (
        <span className="inline-flex h-12 items-center justify-center rounded-btn border border-line-4 px-5 font-plex text-[14px] text-muted-2">
          Bientôt disponible
        </span>
      )}
    </article>
  );
}

export default async function CoachLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) notFound();

  const { tenant, offers } = data;
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const title = tenant.headline || tenant.name;
  const tagline =
    tenant.tagline ||
    "Un programme d'entraînement et un accompagnement nutritionnel personnalisés, avec un coach IA au quotidien.";

  return (
    <main className="min-h-dvh bg-paper">
      {/* Héros */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{ background: `radial-gradient(60% 80% at 85% 0%, ${accent}, transparent 70%)` }}
        />
        <div className="relative mx-auto flex w-full max-w-[960px] flex-col gap-6 px-5 py-14 sm:px-8 sm:py-20">
          <span
            className="inline-flex w-fit items-center rounded-pill px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white"
            style={{ backgroundColor: accent }}
          >
            Coaching personnalisé
          </span>
          <h1 className="max-w-[18ch] font-archivo font-extrabold text-[clamp(34px,8vw,64px)] leading-[1.0] tracking-[-0.03em] text-ink">
            {title}
          </h1>
          <p className="max-w-[52ch] text-[17px] leading-[1.6] text-muted">{tagline}</p>
          {offers.length > 0 ? (
            <a
              href="#offres"
              className="tap inline-flex h-[52px] w-fit items-center justify-center rounded-btn px-6 font-plex font-semibold text-[16px] text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              Voir les offres
            </a>
          ) : null}
        </div>
      </section>

      {/* Valeur */}
      <section className="mx-auto w-full max-w-[960px] px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUE_PROPS.map(([t, d]) => (
            <div key={t} className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-5">
              <div className="flex items-center gap-2.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                <h2 className="font-archivo font-bold text-[17px] text-ink">{t}</h2>
              </div>
              <p className="text-[14px] leading-[1.6] text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Offres */}
      <section id="offres" className="mx-auto w-full max-w-[960px] scroll-mt-8 px-5 pb-16 sm:px-8">
        <h2 className="mb-5 font-archivo font-extrabold text-[clamp(24px,5vw,34px)] leading-tight tracking-[-0.03em] text-ink">
          Les formules
        </h2>
        {offers.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-6 text-[15px] text-muted">
            Aucune offre disponible pour le moment. Reviens bientôt.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} slug={tenant.slug} accent={accent} chargesEnabled={tenant.chargesEnabled} />
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-[960px] px-5 py-6 text-[12px] text-muted-2 sm:px-8">
          {tenant.name} · Propulsé par{" "}
          <span className="font-archivo font-bold text-body">FitMe</span>
          <span className="font-archivo font-bold" style={{ color: accent }}>90</span>.
        </div>
      </footer>
    </main>
  );
}
