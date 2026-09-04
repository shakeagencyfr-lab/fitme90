import { Reveal } from "@/components/reveal";
import { S } from "@/components/landing-icons";
import type { PublicTestimonial } from "@/lib/offers";

/**
 * Les avis du coach, sur sa page publique.
 *
 * Un visiteur qui arrive sur la page d'un coach qu'il ne connaît pas cherche
 * une seule chose : la preuve que d'autres y sont allés. C'est ce que ces avis
 * apportent, et c'est aussi ce qui rend l'import de fiche Google utile plutôt
 * que décoratif.
 *
 * Deux partis pris.
 *
 * Rien n'est réécrit. Le texte est celui que la personne a publié, l'auteur
 * est nommé comme elle s'est nommée, la date est laissée telle que Google
 * l'écrit (« il y a 2 mois ») plutôt que réinterprétée en une date exacte
 * qu'on ne connaît pas. Un avis retouché ne vaudrait plus rien.
 *
 * La provenance est dite. Quand la note globale de l'établissement est connue,
 * elle est affichée avec un lien vers la fiche : un avis vérifiable en vaut
 * dix qu'on ne peut pas vérifier.
 */

type Tone = "light" | "dark";

const T = {
  light: {
    title: "text-ink",
    carte: "border-black/8 bg-black/[0.015]",
    corps: "text-ink/70",
    auteur: "text-ink",
    meta: "text-ink/45",
    lien: "text-ink/55 hover:text-ink",
  },
  dark: {
    title: "text-white",
    carte: "border-white/10 bg-white/[0.03]",
    corps: "text-white/70",
    auteur: "text-white",
    meta: "text-white/40",
    lien: "text-white/50 hover:text-white",
  },
} as const;

export function TestimonialBand({
  items,
  titre,
  rating = null,
  reviewsCount = null,
  mapsUrl = null,
  tone = "light",
  radius = "rounded-[24px]",
}: {
  items: PublicTestimonial[];
  titre: string;
  rating?: number | null;
  reviewsCount?: number | null;
  mapsUrl?: string | null;
  tone?: Tone;
  radius?: string;
}) {
  if (items.length === 0) return null;
  const c = T[tone];
  // Trois avis suffisent à faire la preuve ; au-delà on lit en diagonale et
  // la section pousse les offres hors de l'écran.
  const visibles = items.slice(0, 6);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className={`font-archivo text-[clamp(21px,3.2vw,30px)] font-extrabold leading-[1.1] tracking-[-0.02em] ${c.title}`}>
          {titre}
        </h2>
        {rating != null ? (
          <span className={`flex items-center gap-1.5 text-[13px] ${c.meta}`}>
            <S.star className="h-4 w-4 text-brand" />
            <span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
            {reviewsCount ? <span className="tabular-nums">({reviewsCount})</span> : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={`underline underline-offset-2 ${c.lien}`}
              >
                sur Google
              </a>
            ) : (
              <span>sur Google</span>
            )}
          </span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map((t, i) => (
          <Reveal
            key={t.id}
            delay={i * 60}
            className={`flex flex-col gap-3 border p-5 ${c.carte} ${radius}`}
          >
            {t.rating != null ? (
              <span className="flex gap-0.5" aria-label={`${t.rating} sur 5`}>
                {Array.from({ length: 5 }, (_, n) => (
                  <S.star
                    key={n}
                    className={`h-3.5 w-3.5 ${n < t.rating! ? "text-brand" : tone === "dark" ? "text-white/15" : "text-black/12"}`}
                  />
                ))}
              </span>
            ) : null}
            <p className={`text-[14px] leading-[1.65] ${c.corps}`}>{t.body}</p>
            <span className="mt-auto flex flex-wrap items-baseline gap-x-2">
              <span className={`text-[13.5px] font-semibold ${c.auteur}`}>{t.author}</span>
              {t.publishedLabel ? <span className={`text-[12px] ${c.meta}`}>{t.publishedLabel}</span> : null}
            </span>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
