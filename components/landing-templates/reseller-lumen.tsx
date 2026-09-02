import type { CSSProperties } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { tx } from "@/lib/i18n/request";
import Link from "next/link";
import { CoachMark } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { CountUp } from "@/components/count-up";
import { RevenueSimulator } from "@/components/revenue-simulator";
import type { PublicReseller } from "@/lib/reseller";
import type { Plan } from "@/lib/plans";
import { DEFAULT_BRAND_COLOR, formatEuros } from "@/lib/config";
import {
  MARQUEE, FEATURES, SHOWCASE, COMPARE_WITHOUT, COMPARE_WITH, STEPS, SECTORS, FAQ, Ic, priceLine,
} from "@/components/landing-templates/reseller-content";

// Template revendeur « Lumen » : design clair, éditorial et aéré. Même contenu
// que Onyx, habillage lumineux. `--color-ink` figé (indépendant du thème app).

function ShowcaseVisual({ kind, name }: { kind: "ai" | "program" | "nutrition"; name: string }) {
  return (
    <div className="rounded-[26px] border border-black/8 bg-white p-4 shadow-[0_36px_90px_-34px_rgba(30,20,10,.4)]">
      <div className="rounded-[18px] bg-[#faf8f5] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-archivo text-[13px] font-bold text-ink">{name}</span>
          <span className="flex size-7 items-center justify-center rounded-full bg-brand/12 text-brand"><Ic name={kind === "ai" ? "ai" : kind === "program" ? "dumbbell" : "nutrition"} className="h-4 w-4" /></span>
        </div>
        {kind === "ai" ? (
          <div className="flex flex-col gap-2.5">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2 text-[12.5px] text-white">{tx("Je stagne sur le développé couché…")}</div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-black/8 bg-white px-3.5 py-2 text-[12.5px] text-ink/80">{tx("On passe en 5×5 cette semaine et on ajoute 2,5 kg. Tu vas débloquer 💪")}</div>
          </div>
        ) : kind === "program" ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.12em] text-ink/45"><span>{tx("Cycle 2 · Jour 24")}</span><span className="text-brand">73%</span></div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 21 }).map((_, i) => (
                <span key={i} className={`h-5 rounded-md ${i < 15 ? "bg-brand/70" : i === 15 ? "bg-brand ring-2 ring-brand/30" : "bg-black/8"}`} />
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-black/8 bg-white p-3 text-[12.5px] text-ink/80">{tx("Séance A · Haut du corps")}<br /><span className="text-ink/45">{tx("Développé · Tirage · Élévations · Gainage")}</span></div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {[["Prot.", "156 g"], ["Gluc.", "210 g"], ["Lip.", "62 g"]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-black/8 bg-white p-2.5 text-center"><div className="font-archivo text-[15px] font-extrabold text-ink">{v}</div><div className="text-[10px] text-ink/45">{k}</div></div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/[0.06] p-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand/15 text-brand"><Ic name="nutrition" className="h-5 w-5" /></span>
              <div className="text-[12.5px] text-ink/80">{tx("Bowl poulet & patate douce")}<br /><span className="text-ink/45">{tx("642 kcal · 12 min")}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const eyebrow = "font-mono text-[11px] uppercase tracking-[0.18em] text-brand";

export function ResellerLumen({ reseller, plans }: { reseller: PublicReseller; plans: Plan[] }) {
  const accent = reseller.brandColor || DEFAULT_BRAND_COLOR;
  const headline = reseller.headline || "Lance ton business de coaching. On s'occupe de la technologie.";
  const tagline =
    reseller.tagline ||
    `${reseller.name} te confie une plateforme de coaching complète, propulsée par l'IA et à ta marque. Tu vends, tu encaisses, tu grandis. Sans limite.`;
  const signup = `/inscription-coach?r=${reseller.slug}`;
  const login = `/connexion?r=${reseller.slug}`;

  const css = `
    @keyframes lmUp { from { opacity: 0; transform: translateY(22px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes lmMarquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
    .lm-up { animation: lmUp .9s cubic-bezier(.22,1,.36,1) both }
    .lm-marquee { animation: lmMarquee 32s linear infinite }
    @media (prefers-reduced-motion: reduce) { .lm-marquee { animation: none } }
  `;

  return (
    <div
      id="top"
      className="relative min-h-dvh overflow-hidden scroll-smooth bg-[#f6f4ef] pb-[76px] text-ink sm:pb-0"
      style={
        {
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
          ["--color-ink" as string]: "#1b1815",
        } as CSSProperties
      }
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px]" style={{ background: `radial-gradient(55% 55% at 50% 0%, color-mix(in srgb, ${accent} 14%, transparent), transparent 72%)` }} />

      {/* Header */}
      <header className="relative z-30 sticky top-0 border-b border-black/8 bg-[#f6f4ef]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <span className="min-w-0 flex-1 truncate whitespace-nowrap"><CoachMark brand={{ name: reseller.name, logoUrl: reseller.logoUrl }} size={20} imgClass="h-9 sm:h-12" /></span>
          <nav className="hidden items-center gap-7 md:flex">
            {[["#apercu", "Aperçu"], ["#simulateur", "Simulateur"], ["#formules", "Tarifs"], ["#faq", "FAQ"]].map(([href, label]) => (
              <a key={href} href={href} className="text-[14px] font-medium text-ink/60 transition-colors hover:text-ink">{label}</a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LangSwitch compact />
            <Link href={login} className="tap hidden h-10 items-center rounded-btn px-3 text-[14px] font-semibold text-ink/70 transition-colors hover:text-ink sm:inline-flex sm:px-4">{tx("Connexion")}</Link>
            <Link href={signup} className="tap inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-btn bg-brand px-3.5 text-[13.5px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98] sm:px-4 sm:text-[14px]"><span className="sm:hidden">{tx("Démarrer")}</span><span className="hidden sm:inline">{tx("Démarrer gratuitement")}</span></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-[1160px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="lm-up inline-flex items-center gap-2 rounded-pill border border-brand/25 bg-brand/[0.07] px-3.5 py-1.5 text-[12.5px] font-medium text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            {tx("Propulsé par")} {reseller.name} {tx("· Boosté par l'IA")}</span>
          <h1 className="lm-up mt-5 font-archivo text-[clamp(34px,6.5vw,60px)] font-extrabold leading-[1.03] tracking-[-0.035em] text-ink" style={{ animationDelay: "80ms" }}>
            {headline.split(".").map((chunk, i, arr) =>
              chunk.trim() ? (
                <span key={i} className={i === 0 ? "text-ink" : "text-brand"}>
                  {chunk.trim()}{i < arr.length - 1 ? ". " : ""}
                </span>
              ) : null,
            )}
          </h1>
          <p className="lm-up mt-5 max-w-[56ch] text-[16.5px] leading-[1.7] text-ink/65" style={{ animationDelay: "160ms" }}>{tagline}</p>
          <div className="lm-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href={signup} className="tap group inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15.5px] font-semibold text-white shadow-[0_14px_40px_-12px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">
              {tx("Créer mon espace coach")} <Ic name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#apercu" className="tap inline-flex items-center justify-center rounded-btn border border-black/12 bg-white px-6 py-4 text-[15px] font-semibold text-ink transition-colors hover:border-ink/40">{tx("Voir l'aperçu")}</a>
          </div>
          <div className="lm-up mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink/55" style={{ animationDelay: "320ms" }}>
            {["Premier client offert", "Aucune ligne de code", "Sans engagement"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><Ic name="check" className="h-4 w-4 text-brand" /> {t}</span>
            ))}
          </div>
        </div>

        {/* Mockup produit */}
        <div className="lm-up relative mx-auto w-full max-w-[380px]" style={{ animationDelay: "220ms" }}>
          <div className="rounded-[28px] border border-black/8 bg-white p-4 shadow-[0_40px_90px_-30px_rgba(30,20,10,.4)]">
            <div className="rounded-[20px] bg-[#faf8f5] p-4">
              <div className="flex items-center justify-between">
                <span className="font-archivo text-[13px] font-bold text-ink">{reseller.name}</span>
                <span className="flex size-8 items-center justify-center rounded-full bg-brand/12 text-brand"><Ic name="ai" className="h-4 w-4" /></span>
              </div>
              <div className="mt-4 rounded-2xl border border-black/8 bg-white p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-ink/45"><span className="flex size-6 items-center justify-center rounded-full bg-brand/15 text-brand"><Ic name="ai" className="h-3.5 w-3.5" /></span>{tx("Coach IA")}</div>
                <p className="mt-2 text-[13px] leading-[1.5] text-ink/80">{tx("Ta séance du jour est prête 💪 On vise +2 reps sur le développé. Prêt ?")}</p>
              </div>
              <div className="mt-3 rounded-2xl border border-brand/20 bg-brand/[0.06] p-3.5">
                <div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-ink/90">{tx("Programme · Cycle 2 · Jour 24")}</span><span className="font-archivo text-[13px] font-bold text-brand">{tx("On track")}</span></div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/8"><div className="h-full rounded-full bg-brand" style={{ width: "73%" }} /></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[["Force", "+18%"], ["Séances", "21"], ["Assiduité", "94%"]].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-black/8 bg-white p-2.5 text-center"><div className="font-archivo text-[15px] font-extrabold text-ink">{v}</div><div className="text-[10px] text-ink/45">{k}</div></div>
                ))}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-4 -left-4 rounded-2xl border border-black/8 bg-white px-4 py-3 shadow-[0_20px_50px_-20px_rgba(30,20,10,.4)]">
            <div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-full bg-brand/12 text-brand"><Ic name="card" className="h-5 w-5" /></span><div><div className="font-archivo text-[15px] font-extrabold leading-none text-ink">{tx("+1 abonné")}</div><div className="mt-0.5 text-[11px] text-ink/50">{tx("revenu récurrent")}</div></div></div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative z-10 overflow-hidden border-y border-black/8 bg-white py-4">
        <div className="lm-marquee flex w-max items-center gap-4">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="inline-flex items-center gap-4 text-[15px] font-semibold text-ink/40">
              <span className="size-1.5 rounded-full bg-brand" /> {m}
            </span>
          ))}
        </div>
      </div>

      {/* Impact (compteurs) */}
      <section className="relative z-10 mx-auto grid w-full max-w-[1160px] grid-cols-2 gap-6 px-5 py-14 sm:grid-cols-4 sm:px-8 sm:py-16">
        {[
          { n: 5, s: "", l: "minutes pour lancer" },
          { n: 100, s: " %", l: "à ta marque" },
          { n: 24, s: "/7", l: "coach IA au travail" },
          { n: 0, s: " €", l: "pour démarrer" },
        ].map((s, i) => (
          <Reveal key={s.l} delay={i * 90} className="text-center sm:text-left">
            <div className="font-archivo text-[clamp(30px,5vw,44px)] font-extrabold tracking-[-0.03em] text-ink">
              <CountUp to={s.n} suffix={s.s} />
            </div>
            <div className="mt-1 text-[13.5px] text-ink/55">{s.l}</div>
          </Reveal>
        ))}
      </section>

      {/* Avant / Après */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="mx-auto max-w-[680px] text-center">
          <span className={eyebrow}>{tx("Le déclic")}</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">{tx("Change de dimension, sans changer de métier")}</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal className="rounded-[24px] border border-black/8 bg-white p-7">
            <div className="inline-flex items-center gap-2 rounded-pill border border-black/10 px-3 py-1 text-[12px] font-semibold text-ink/50">{tx("Sans plateforme")}</div>
            <ul className="mt-5 flex flex-col gap-3.5">
              {COMPARE_WITHOUT.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[14.5px] leading-[1.5] text-ink/55">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-black/8 text-ink/50"><Ic name="x" className="h-3 w-3" /></span>{t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="relative overflow-hidden rounded-[24px] border border-brand/30 bg-gradient-to-b from-brand/[0.08] to-transparent p-7">
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-pill bg-brand/15 px-3 py-1 text-[12px] font-semibold text-brand">{tx("Avec")} {reseller.name}</div>
              <ul className="mt-5 flex flex-col gap-3.5">
                {COMPARE_WITH.map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[14.5px] font-medium leading-[1.5] text-ink/90">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Ic name="check" className="h-3 w-3" /></span>{t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Aperçu produit */}
      <section id="apercu" className="relative z-10 border-y border-black/8 bg-white">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-16 px-5 py-20 sm:px-8 sm:py-28 sm:gap-24">
          <Reveal className="mx-auto max-w-[680px] text-center">
            <span className={eyebrow}>{tx("L'aperçu")}</span>
            <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">{tx("Une expérience premium, à ta marque")}</h2>
          </Reveal>
          {SHOWCASE.map((s, i) => (
            <div key={s.kind} className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Reveal className="mx-auto w-full max-w-[380px]">
                <ShowcaseVisual kind={s.kind} name={reseller.name} />
              </Reveal>
              <Reveal delay={100}>
                <span className={`${eyebrow} tracking-[0.16em]`}>{s.tag}</span>
                <h3 className="mt-3 font-archivo text-[clamp(22px,3.5vw,32px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-ink">{s.title}</h3>
                <p className="mt-4 text-[15.5px] leading-[1.7] text-ink/65">{s.desc}</p>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[14.5px] text-ink/80"><Ic name="check" className="h-4 w-4 shrink-0 text-brand" /> {p}</li>
                  ))}
                </ul>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* Simulateur */}
      <section id="simulateur" className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-[680px] text-center">
          <span className={eyebrow}>{tx("Simulateur")}</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">{tx("Combien peux-tu gagner ?")}</h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-ink/65">{tx("Fais glisser les curseurs : ton nombre de clients, ton tarif. Ton revenu récurrent s'affiche en direct.")}</p>
        </Reveal>
        <Reveal delay={100} className="mt-12"><RevenueSimulator aiNote="Le coût de l'IA (BYOK) est d'environ 1 à 2 € par client actif et par mois : négligeable face à ces revenus. La marge reste quasi intégrale." /></Reveal>
        <div className="mt-8 text-center">
          <Link href={signup} className="tap inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Je me lance")} <Ic name="arrow" className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* Ce qui est inclus */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-[620px]">
          <span className={eyebrow}>{tx("Clé en main")}</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">{tx("Et tout le reste, déjà prêt")}</h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-ink/65">{tx("Une plateforme complète. Toi, tu gères tes clients. Le reste tourne tout seul.")}</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80} className="group rounded-[22px] border border-black/8 bg-white p-6 transition-all hover:-translate-y-1 hover:border-brand/30">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:bg-brand/20"><Ic name={f.icon} className="h-6 w-6" /></span>
              <h3 className="mt-4 font-archivo text-[18px] font-bold text-ink">{f.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-ink/60">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="relative z-10 border-y border-black/8 bg-white">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="text-center">
            <span className={eyebrow}>{tx("En 3 étapes")}</span>
            <h2 className="mx-auto mt-4 max-w-[620px] font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">{tx("De zéro à ton premier client aujourd'hui")}</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 100} className="relative rounded-[22px] border border-black/8 bg-[#faf8f5] p-7">
                <span className="font-archivo text-[42px] font-extrabold leading-none text-brand/25">{s.n}</span>
                <h3 className="mt-3 font-archivo text-[19px] font-bold text-ink">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-ink/60">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pour qui */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-16 sm:px-8 sm:py-20">
        <Reveal className="text-center">
          <span className={eyebrow}>{tx("Pour qui")}</span>
          <h2 className="mx-auto mt-4 max-w-[560px] font-archivo text-[clamp(24px,4vw,36px)] font-extrabold tracking-[-0.02em] text-ink">{tx("Pensé pour tous ceux qui vendent du résultat")}</h2>
        </Reveal>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {SECTORS.map((s, i) => (
            <Reveal key={s.label} delay={i * 60} className="inline-flex items-center gap-2.5 rounded-pill border border-black/8 bg-white px-4 py-2.5 text-[14px] font-medium text-ink/80">
              <span className="text-brand"><Ic name={s.icon} className="h-5 w-5" /></span>{s.label}
            </Reveal>
          ))}
        </div>
      </section>

      {/* Tarifs */}
      <section id="formules" className="relative z-10 border-y border-black/8 bg-white">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="text-center">
            <span className={eyebrow}>{tx("Tarifs")}</span>
            <h2 className="mx-auto mt-4 max-w-[640px] font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">{tx("Ton premier client est")} <span className="text-brand">{tx("offert")}</span></h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-ink/65">{tx("Lance ton activité sans rien payer. Tu passes à une formule seulement quand tu accueilles ton deuxième client.")}</p>
          </Reveal>

          {plans.length > 0 ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p, i) => (
                <Reveal key={p.id} delay={i * 80} className="flex flex-col gap-4 rounded-[24px] border border-black/8 bg-[#faf8f5] p-7 transition-all hover:-translate-y-1 hover:border-brand/30">
                  <div className="font-archivo text-[20px] font-bold text-ink">{p.name}</div>
                  <div><span className="font-archivo text-[30px] font-extrabold tracking-[-0.02em] text-brand">{priceLine(p) || "Sur mesure"}</span></div>
                  <div className="text-[14px] text-ink/70">{p.client_limit == null ? "Clients illimités" : `Jusqu'à ${p.client_limit} client${p.client_limit > 1 ? "s" : ""} actifs`}</div>
                  {p.setup_fee_cents > 0 ? <div className="text-[12.5px] text-ink/45">+ {formatEuros(p.setup_fee_cents)} {tx("de mise en place (une fois)")}</div> : null}
                  <Link href={signup} className="tap mt-auto inline-flex items-center justify-center rounded-btn bg-brand px-5 py-3.5 text-[14.5px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Commencer")}</Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="mx-auto mt-12 max-w-[480px] rounded-[24px] border border-brand/25 bg-gradient-to-b from-brand/[0.08] to-transparent p-9 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/15 text-brand"><Ic name="bolt" className="h-7 w-7" /></div>
              <div className="mt-4 font-archivo text-[26px] font-extrabold text-ink">{tx("Premier client offert")}</div>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-ink/65">{tx("Crée ton espace et démarre gratuitement.")} {reseller.name} {tx("te proposera ses formules dès que tu grandis.")}</p>
              <Link href={signup} className="tap mt-6 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Créer mon espace coach")} <Ic name="arrow" className="h-4 w-4" /></Link>
            </Reveal>
          )}

          <Reveal delay={120} className="mx-auto mt-10 flex max-w-[720px] flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[13.5px] text-ink/60">
            {["Sans carte bancaire", "Sans engagement", "Annule quand tu veux", "Données hébergées en UE"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><Ic name="check" className="h-4 w-4 text-brand" /> {t}</span>
            ))}
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center">
          <span className={eyebrow}>{tx("Questions")}</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold tracking-[-0.025em] text-ink">{tx("Tout ce que tu te demandes")}</h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-3">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="group rounded-[18px] border border-black/8 bg-white px-5 py-4 open:border-brand/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-semibold text-ink/90 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-black/12 text-ink/50 transition-transform group-open:rotate-45"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-[1.7] text-ink/60">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 pb-24 sm:px-8">
        <Reveal className="relative overflow-hidden rounded-[28px] border border-black/8 bg-white p-10 text-center shadow-[0_36px_90px_-40px_rgba(30,20,10,.4)] sm:p-16">
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(90% 120% at 50% 0%, color-mix(in srgb, ${accent} 12%, transparent), transparent 70%)` }} />
          <div className="relative">
            <h2 className="mx-auto max-w-[680px] font-archivo text-[clamp(28px,5vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">{tx("Ton business de coaching commence maintenant")}</h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-ink/70">{tx("Ton premier client est offert. Aucune carte requise. Sois en ligne dans 5 minutes.")}</p>
            <Link href={signup} className="tap mt-8 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-8 py-4 text-[16px] font-semibold text-white shadow-[0_14px_44px_-12px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Créer mon espace coach")} <Ic name="arrow" className="h-4 w-4" /></Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-black/8 bg-[#f6f4ef]">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col items-center gap-2 px-5 py-10 text-center sm:px-8">
          <CoachMark brand={{ name: reseller.name, logoUrl: reseller.logoUrl }} size={18} imgClass="h-8" />
          <p className="text-[12.5px] text-ink/45">{tx("Plateforme de coaching en marque blanche, propulsée par l'IA. Premier client offert, sans engagement.")}</p>
        </div>
      </footer>

      {/* CTA collante mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-[#f6f4ef]/92 px-4 py-3 backdrop-blur-xl sm:hidden">
        <Link href={signup} className="tap flex w-full items-center justify-center gap-2 rounded-btn bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98]">{tx("Démarrer gratuitement")} <Ic name="arrow" className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
