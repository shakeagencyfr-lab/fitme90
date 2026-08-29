import { notFound } from "next/navigation";
import { publicOffersBySlug } from "@/lib/offers";
import { programDaysForMonths, formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";

export const dynamic = "force-dynamic";

function durationText(months: number): string {
  const label = months === 12 ? "1 an" : `${months} mois`;
  return `${label} · ${programDaysForMonths(months)} jours`;
}

// Widget intégrable : affiché dans un iframe sur le site du coach. Fond
// transparent, cartes d'offres, achat qui ouvre l'inscription dans un onglet.
// Un script envoie la hauteur au parent (auto-resize).
export default async function CoachEmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) notFound();

  const { tenant, offers } = data;
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div style={{ background: "transparent" }}>
      <div className="mx-auto grid w-full max-w-[860px] gap-3 p-3 sm:grid-cols-2">
        {offers.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-5 text-[14px] text-muted">
            Aucune offre disponible pour le moment.
          </div>
        ) : (
          offers.map((o) => (
            <article key={o.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-archivo font-bold text-[18px] leading-tight text-ink">{o.name}</h3>
                <span className="text-[12.5px] text-muted">{durationText(o.duration_months)}</span>
              </div>
              <div className="font-archivo font-extrabold text-[26px] leading-none tracking-[-0.03em] text-ink">
                {formatEuros(o.price_cents)}
              </div>
              {tenant.chargesEnabled ? (
                <a
                  href={`${site}/inscription?c=${tenant.slug}&offer=${o.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap inline-flex h-11 items-center justify-center rounded-btn px-4 font-plex font-semibold text-[14px] text-white"
                  style={{ backgroundColor: accent }}
                >
                  Choisir
                </a>
              ) : (
                <span className="inline-flex h-11 items-center justify-center rounded-btn border border-line-4 px-4 text-[13px] text-muted-2">
                  Bientôt
                </span>
              )}
            </article>
          ))
        )}
      </div>
      {/* Auto-resize : envoie la hauteur au site hôte. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){function h(){try{parent.postMessage({fitmeHeight:document.body.scrollHeight},"*")}catch(e){}}window.addEventListener("load",h);window.addEventListener("resize",h);setTimeout(h,300);setTimeout(h,1200);})();`,
        }}
      />
    </div>
  );
}
