import Link from "next/link";
import { notFound } from "next/navigation";
import { publicOffersBySlug } from "@/lib/offers";
import { programDaysForMonths, formatEuros } from "@/lib/config";

export const dynamic = "force-dynamic";

function durationText(months: number): string {
  const label = months === 12 ? "1 an" : `${months} mois`;
  return `${label} · ${programDaysForMonths(months)} jours de programme`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  return { title: data ? `${data.tenant.name} — Coaching` : "Coach introuvable" };
}

export default async function CoachLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) notFound();

  const { tenant, offers } = data;

  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-10 px-5 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-2">
            Programme de coaching
          </span>
          <h1 className="font-archivo font-extrabold text-[clamp(30px,7vw,52px)] leading-[1.02] tracking-[-0.03em] text-ink">
            {tenant.name}
          </h1>
          <p className="max-w-[54ch] text-[16px] leading-[1.6] text-muted">
            Un programme d&apos;entraînement et un accompagnement nutritionnel
            personnalisés, avec un coach IA au quotidien. Choisis la formule qui te
            correspond.
          </p>
        </header>

        {offers.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-6 text-[15px] text-muted">
            Aucune offre disponible pour le moment. Reviens bientôt.
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2">
            {offers.map((o) => (
              <article
                key={o.id}
                className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="font-archivo font-bold text-[20px] leading-tight text-ink">
                    {o.name}
                  </h2>
                  <span className="text-[13px] text-muted">{durationText(o.duration_months)}</span>
                </div>

                <div className="font-archivo font-extrabold text-[32px] leading-none tracking-[-0.03em] text-ink">
                  {formatEuros(o.price_cents)}
                  <span className="ml-1.5 align-middle text-[13px] font-normal text-muted-2">
                    paiement unique
                  </span>
                </div>

                {tenant.chargesEnabled ? (
                  <Link
                    href={`/inscription?c=${tenant.slug}&offer=${o.id}`}
                    className="tap inline-flex h-12 items-center justify-center rounded-btn bg-brand px-5 font-plex font-semibold text-[15px] text-white hover:bg-brand-hover"
                  >
                    Choisir cette offre
                  </Link>
                ) : (
                  <span className="inline-flex h-12 items-center justify-center rounded-btn border border-line-4 px-5 font-plex text-[14px] text-muted-2">
                    Bientôt disponible
                  </span>
                )}
              </article>
            ))}
          </section>
        )}

        <footer className="mt-4 border-t border-line pt-5 text-[12px] text-muted-2">
          Propulsé par <span className="font-archivo font-bold text-body">FitMe</span>
          <span className="font-archivo font-bold text-brand">90</span>.
        </footer>
      </div>
    </main>
  );
}
