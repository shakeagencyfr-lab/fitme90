import { Reveal, RevealGroup } from "@/components/reveal";
import { S } from "@/components/landing-icons";
import type { LandingCopy } from "@/components/landing-templates/coach-copy";

// Bloc « qui signe ton programme » + « le moteur derrière ».
//
// C'est le cœur du positionnement : le professionnel est l'auteur, le moteur
// d'IA est son outil. Les deux moitiés sont volontairement dissymétriques,
// la signature du pro occupant la place dominante et le moteur venant en
// second, en retrait typographique.
//
// Un seul composant pour les quatre templates : le contenu et la hiérarchie
// ne doivent PAS varier d'un habillage à l'autre, sinon le message se dilue.
// Seule la palette change, via `tone`.

type Tone = "light" | "dark";

const T = {
  light: {
    section: "border-t border-black/8 bg-white",
    title: "font-archivo font-extrabold tracking-[-0.03em] text-ink text-[clamp(26px,4.4vw,42px)] leading-[1.06] text-balance",
    body: "text-ink/60",
    card: "border-black/8 bg-[#faf8f5]",
    cardTitle: "text-ink",
    cardBody: "text-ink/55",
    engineCard: "border-black/10 bg-ink text-white",
    engineBody: "text-white/65",
    engineItem: "border-white/12",
    engineItemBody: "text-white/60",
    note: "border-black/8 bg-[#faf8f5] text-ink/55",
    sig: "border-brand/25 bg-brand/[0.07] text-brand",
  },
  dark: {
    section: "border-t border-white/8 bg-[#0d0f11]",
    title: "font-archivo font-extrabold tracking-[-0.03em] text-white text-[clamp(26px,4.4vw,42px)] leading-[1.06] text-balance",
    body: "text-white/60",
    card: "border-white/10 bg-white/[0.03]",
    cardTitle: "text-white",
    cardBody: "text-white/55",
    engineCard: "border-white/12 bg-white/[0.04] text-white",
    engineBody: "text-white/65",
    engineItem: "border-white/10",
    engineItemBody: "text-white/55",
    note: "border-white/10 bg-white/[0.03] text-white/55",
    sig: "border-brand/40 bg-brand/15 text-brand",
  },
} as const;

export function AuthorEngine({ L, name, tone = "light" }: { L: LandingCopy; name: string; tone?: Tone }) {
  const c = T[tone];
  return (
    <section id="auteur" className={`scroll-mt-24 ${c.section}`}>
      <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(56px,8vw,100px)] sm:px-8">
        {/* ── L'auteur ── */}
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <Reveal className="flex flex-col gap-5">
            <span className={`inline-flex w-fit items-center gap-2 rounded-pill border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] ${c.sig}`}>
              {L.authorChip}
            </span>
            <h2 className={c.title}>{L.authorTitle}</h2>
            <p className={`max-w-[52ch] text-[16px] leading-[1.65] ${c.body}`}>{L.authorBody}</p>
            <span className={`inline-flex w-fit items-center gap-2 rounded-pill border px-4 py-2 font-archivo text-[13.5px] font-bold ${c.sig}`}>
              <S.check className="h-4 w-4" />
              {L.authorSignature(name)}
            </span>
          </Reveal>

          <RevealGroup className="flex flex-col gap-3" direction="right" step={90}>
            {L.authorPoints.map((p) => (
              <div key={p.title} className={`flex items-start gap-3 rounded-[18px] border p-5 ${c.card}`}>
                <S.check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div className="flex flex-col gap-1">
                  <div className={`font-archivo text-[15.5px] font-semibold leading-snug ${c.cardTitle}`}>{p.title}</div>
                  <div className={`text-[13.5px] leading-[1.55] ${c.cardBody}`}>{p.body}</div>
                </div>
              </div>
            ))}
          </RevealGroup>
        </div>

        {/* ── Le moteur, en second et en retrait ── */}
        <Reveal className={`mt-14 rounded-[26px] border p-7 sm:p-9 ${c.engineCard}`} direction="scale">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-white/20 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70">
              {L.engineChip}
            </span>
            <h3 className="font-archivo text-[clamp(21px,3vw,30px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-balance">
              {L.engineTitle}
            </h3>
            <p className={`max-w-[62ch] text-[15px] leading-[1.65] ${c.engineBody}`}>{L.engineBody}</p>
          </div>

          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {L.enginePoints.map((p, i) => (
              <div key={p.title} className={`flex flex-col gap-1.5 border-t pt-4 ${c.engineItem}`}>
                <span className="font-mono text-[11px] tracking-[0.14em] text-brand">{String(i + 1).padStart(2, "0")}</span>
                <div className="font-archivo text-[15.5px] font-semibold leading-snug">{p.title}</div>
                <p className={`text-[13.5px] leading-[1.55] ${c.engineItemBody}`}>{p.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Ce que le moteur n'est pas. Dit ici, pas en petites lignes en bas. */}
        <Reveal className={`mt-4 rounded-[18px] border px-5 py-4 text-[13px] leading-[1.6] ${c.note}`}>
          {L.engineLimit}
        </Reveal>
      </div>
    </section>
  );
}
