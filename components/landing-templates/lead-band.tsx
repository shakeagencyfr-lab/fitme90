import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { S } from "@/components/landing-icons";
import type { LandingCopy } from "@/components/landing-templates/coach-copy";

// Bandeau du mini-programme offert.
//
// Il occupait quatre cents pixels de haut pour dire deux phrases, avec le
// bouton flottant au milieu du vide. Le problème n'était pas le style mais le
// CONTENU : « une semaine d'entraînement calibrée » ne prouve rien, donc rien
// ne remplissait la place.
//
// Ici la place sert : le titre est court, et à sa droite les quatre choses que
// le document contient réellement. C'est ce niveau de détail qui décide si on
// laisse son adresse. Le bouton est ancré en bas de sa colonne, aligné sur la
// dernière ligne de la liste, au lieu de flotter.

type Tone = "light" | "dark";

const T = {
  light: {
    shell: "border-brand/30 bg-gradient-to-br from-brand/[0.07] to-transparent",
    title: "text-ink",
    body: "text-ink/60",
    item: "text-ink/70",
    chip: "border-brand/25 bg-brand/[0.07] text-brand",
    rule: "border-black/8",
    cta: "bg-brand text-white hover:bg-brand-hover",
    note: "text-ink/45",
  },
  dark: {
    shell: "border-brand/50 bg-white/[0.03]",
    title: "text-white",
    body: "text-white/60",
    item: "text-white/70",
    chip: "border-brand/50 bg-brand/15 text-brand",
    rule: "border-white/10",
    cta: "bg-brand text-white hover:bg-brand-hover",
    note: "text-white/40",
  },
} as const;

export function LeadBand({
  L,
  slug,
  tone = "light",
  /** Angles : arrondis (lumen, sage) ou droits (volt, onyx). */
  radius = "rounded-[24px]",
  ctaClass = "rounded-btn",
}: {
  L: LandingCopy;
  slug: string;
  tone?: Tone;
  radius?: string;
  ctaClass?: string;
}) {
  const c = T[tone];
  return (
    <Reveal className={`overflow-hidden border p-6 sm:p-8 ${c.shell} ${radius}`} direction="scale">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div className="flex flex-col gap-3">
          <span className={`inline-flex w-fit items-center gap-2 rounded-pill border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${c.chip}`}>
            <S.spark className="h-3.5 w-3.5" /> {L.leadChip}
          </span>
          <h3 className={`font-archivo text-[clamp(21px,3.2vw,30px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-balance ${c.title}`}>
            {L.leadTitle}
          </h3>
          <p className={`max-w-[46ch] text-[14.5px] leading-[1.6] ${c.body}`}>{L.leadBody}</p>
        </div>

        <div className="flex flex-col gap-4">
          <ul className={`flex flex-col divide-y border-y ${c.rule}`}>
            {L.leadPoints.map((p) => (
              <li key={p} className={`flex items-center gap-2.5 py-2 text-[13.5px] leading-snug ${c.item}`}>
                <S.check className="h-4 w-4 shrink-0 text-brand" />
                {p}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={`/c/${slug}/decouverte`}
              className={`press tap inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap px-6 text-[15px] font-semibold ${c.cta} ${ctaClass}`}
            >
              {L.leadCta} <S.arrow className="h-4.5 w-4.5" />
            </Link>
            <span className={`text-[12.5px] ${c.note}`}>{L.leadReassure}</span>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
