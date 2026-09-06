import type { CSSProperties } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import { fmtLocale, setRequestLocale } from "@/lib/i18n/request";
import { resolveLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/request";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { MobileNav } from "@/components/mobile-nav";
import { Reveal } from "@/components/reveal";
import { RevenueSimulator } from "@/components/revenue-simulator";
import { LIcon } from "@/components/landing-icon";
import { DEFAULT_BRAND_COLOR } from "@/lib/config";
import { platformTenantId } from "@/lib/hierarchy";
import { tenantBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Programme revendeur — Lance ton SaaS de coaching IA en marque blanche | My Fitness App",
  description:
    "Deviens éditeur de ta propre plateforme de coaching sportif boostée par l'IA, en marque blanche. Revenus récurrents, marge logicielle, zéro développement. Démarrage gratuit.",
};

const MARQUEE = ["Marque blanche totale", "SaaS clé en main", "IA intégrée", "Revenus récurrents", "Zéro développement", "Marge logicielle", "Ton Stripe", "Ultra-scalable", "Démarrage gratuit"];

const WHY = [
  { icon: "rocket", t: "Zéro développement", d: "Le produit existe, il est complet et maintenu. Tu le revends sous ta marque, sans écrire une ligne de code." },
  { icon: "chart", t: "Revenus récurrents", d: "Des abonnements mensuels qui s'empilent. Une base de coachs qui grandit, un revenu qui devient prévisible." },
  { icon: "infinity", t: "Marge logicielle, scalable", d: "Un logiciel se duplique à coût quasi nul. 10 coachs ou 500 : la même infrastructure, ta marge qui explose." },
];

const STEPS = [
  { n: "01", t: "Crée ton espace revendeur", d: "En quelques minutes : ton nom, tes couleurs, ta page de vente marque blanche. Gratuit." },
  { n: "02", t: "Fixe tes prix et connecte Stripe", d: "Tu définis tes paliers d'abonnement pour les coachs et salles. Tu encaisses sur TON compte." },
  { n: "03", t: "Recrute coachs & salles", d: "Partage ta landing. Chaque coach qui rejoint ton réseau devient un revenu récurrent." },
];

const MARKET = [
  { icon: "globe", t: "Un marché mondial en plein essor", d: "Le coaching sportif en ligne et le bien-être connaissent une croissance forte et durable, tirés par la santé et le digital." },
  { icon: "ai", t: "La vague de l'IA, maintenant", d: "L'IA générative bouleverse l'accompagnement. Les pros qui l'adoptent aujourd'hui prennent une longueur d'avance décisive." },
  { icon: "user", t: "Des millions de pros à équiper", d: "Coachs indépendants, salles, studios, préparateurs : un immense vivier qui cherche à se digitaliser sans compétences techniques." },
];

const FEATURES = [
  { icon: "layers", t: "Dashboard revendeur", d: "Pilote tes coachs, tes paliers, ta facturation depuis un espace simple et clair." },
  { icon: "brand", t: "Landing marque blanche", d: "Ta propre page de vente, à tes couleurs, pour convertir coachs et salles." },
  { icon: "tag", t: "Prix & codes promo libres", d: "Tu fixes tes tarifs, tes offres, tes réductions. Ta stratégie commerciale, tes règles." },
  { icon: "card", t: "Ton Stripe, tes encaissements", d: "L'argent arrive directement sur ton compte. Aucune commission cachée sur tes ventes." },
  { icon: "ai", t: "Le produit IA complet", d: "Coach IA, programmes, nutrition, chat VIP : un produit premium que tes coachs adorent." },
  { icon: "shield", t: "Hébergé & sécurisé (UE)", d: "Infrastructure, mises à jour et conformité gérées pour toi. Tu vends, on maintient." },
];

const FAQ = [
  { q: "Dois-je savoir coder ou héberger quoi que ce soit ?", a: "Non. Tout est géré : hébergement, mises à jour, IA, sécurité. Tu te concentres sur le commercial et la relation avec tes coachs." },
  { q: "Comment je gagne de l'argent ?", a: "Tu fixes librement les prix que tu factures à tes coachs et salles (abonnements mensuels/annuels, frais de mise en place). Tu encaisses sur ton propre Stripe ; ta marge = ce que tu factures moins ton abonnement plateforme." },
  { q: "C'est vraiment en marque blanche ?", a: "Oui, totalement : ta marque pour tes coachs, et la leur pour leurs clients. My Fitness App reste invisible dans toute la chaîne." },
  { q: "Combien pour démarrer ?", a: "Le démarrage est gratuit : lance ton espace, ta page de vente et recrute tes premiers coachs sans rien avancer." },
  { q: "Quel type de revendeur ça vise ?", a: "Entrepreneurs du fitness, agences, distributeurs d'équipement, franchises de salles, influenceurs : tous ceux qui ont une audience ou un réseau de pros à équiper." },
  { q: "Combien coûte l'IA, et qui la paie ?", a: "L'IA est en BYOK (chacun sa clé). Compte environ 1 à 2 € de consommation IA par client actif et par mois. Deux options : soit tes coachs branchent leur propre clé et paient leur IA (toi, tu n'as aucun coût IA et ne vends que les abonnements) ; soit tu deviens « revendeur IA » en fournissant ta clé et en revendant les crédits IA à tes coachs avec ta propre marge, tout en plafonnant l'usage. Dans les deux cas, la marge logicielle reste très élevée." },
];

export default async function RevendeursPage() {
  const locale = await resolveLocale(null);
  setRequestLocale(locale);
  // Personnalisation depuis « Marque blanche » (plateforme) : logo, couleur,
  // titre et accroche du hero. Le reste de la page reste fixe.
  const pid = await platformTenantId();
  const b = pid ? await tenantBranding(pid) : null;
  const accent = b?.brandColor || DEFAULT_BRAND_COLOR;
  const heroHeadline = b?.headline?.trim() || null;
  const heroTagline = b?.tagline?.trim() || null;
  const logoUrl = b?.logoUrl || null;
  const signup = "/inscription-revendeur";
  const css = `
    @keyframes rvUp { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
    @keyframes rvFloat { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
    @keyframes rvPulse { 0%,100% { opacity:.4 } 50% { opacity:.9 } }
    @keyframes rvOrb { 0%,100% { transform:translate(0,0) } 50% { transform:translate(24px,-34px) } }
    @keyframes rvMarquee { from { transform:translateX(0) } to { transform:translateX(-50%) } }
    .rv-up { animation: rvUp .9s cubic-bezier(.22,1,.36,1) both }
    .rv-float { animation: rvFloat 6s ease-in-out infinite }
    .rv-marquee { animation: rvMarquee 34s linear infinite }
    @media (prefers-reduced-motion: reduce) { .rv-float, .rv-marquee { animation: none } }
  `;

  return (
    <LocaleProvider locale={locale}>
    <div
      id="top"
      className="relative min-h-dvh overflow-hidden scroll-smooth bg-[#080a0c] pb-[76px] text-white [scrollbar-color:#333_#080a0c] sm:pb-0"
      style={{ ["--color-brand" as string]: accent, ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)` } as CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Décor */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px]" style={{ background: `radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, ${accent} 26%, transparent), transparent 72%)` }} />
      <div className="pointer-events-none absolute -right-40 top-[380px] h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, animation: "rvOrb 12s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(75% 45% at 50% 0%, #000, transparent 80%)" }} />

      {/* Header */}
      <header className="relative z-30 sticky top-0 border-b border-white/10 bg-[#080a0c]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="/" className="min-w-0 overflow-hidden text-white [&_span]:text-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-7 w-auto max-w-[170px] object-contain" />
            ) : (
              <Wordmark size={22} />
            )}
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {[["#marche", "Le marché"], ["#simulateur", "Simulateur"], ["#modele", "Rémunération"], ["#faq", "FAQ"]].map(([h, l]) => (
              <a key={h} href={h} className="text-[14px] font-medium text-white/60 transition-colors hover:text-white">{tx(l)}</a>
            ))}
          </nav>
          <MobileNav
            className="md:hidden"
            tone="dark"
            bg="#080a0c"
            radius={12}
            langLabel={tx("Langue")}
            brand={<span className="text-white [&_span]:text-white"><Wordmark size={20} /></span>}
            links={[
              { href: "#marche", label: tx("Le marché") },
              { href: "#simulateur", label: tx("Simulateur") },
              { href: "#modele", label: tx("Rémunération") },
              { href: "#faq", label: tx("FAQ") },
            ]}
            login={{ href: "/connexion", label: tx("Connexion") }}
            cta={{ href: signup, label: tx("Devenir revendeur") }}
          />
          {/* Masqué sous sm comme sur la landing plateforme : la barre collante
              du bas porte le même CTA. */}
          <Link href={signup} className="tap hidden h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-btn bg-brand px-3.5 text-[13.5px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98] sm:inline-flex">{tx("Devenir revendeur")}</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-[1160px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <span className="rv-up inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-white/75">
            <span className="size-1.5 rounded-full bg-brand" style={{ animation: "rvPulse 2s ease-in-out infinite" }} /> {tx("Programme revendeur · Marque blanche totale")}</span>
          <h1 className="rv-up mt-5 font-archivo text-[clamp(34px,6.8vw,62px)] font-extrabold leading-[1.02] tracking-[-0.035em]" style={{ animationDelay: "80ms" }}>
            {heroHeadline ? (
              <span className="bg-gradient-to-br from-white to-white/75 bg-clip-text text-transparent">{heroHeadline}</span>
            ) : (
              <>
                <span className="bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">{tx("Lance ton SaaS de coaching")}</span> <span className="text-brand">{tx("boosté par l'IA.")}</span>
              </>
            )}
          </h1>
          <p className="rv-up mt-5 max-w-[58ch] text-[16.5px] leading-[1.7] text-white/70" style={{ animationDelay: "160ms" }}>
            {heroTagline ?? (
              <>
                {tx("Deviens l'éditeur de ta propre plateforme de coaching sportif, en marque blanche totale. Tu revends aux coachs et aux salles, tu fixes tes prix, tu encaisses. Nous gérons la technologie et l'IA.")} <span className="text-white/90">{tx("Démarrage gratuit.")}</span>
              </>
            )}
          </p>
          <div className="rv-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href={signup} className="tap group inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15.5px] font-semibold text-white shadow-[0_10px_40px_-8px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">
              {tx("Créer mon espace revendeur")} <LIcon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#simulateur" className="tap inline-flex items-center justify-center rounded-btn border border-white/15 px-6 py-4 text-[15px] font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white">{tx("Simuler mes revenus")}</a>
          </div>
          <div className="rv-up mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/55" style={{ animationDelay: "320ms" }}>
            {["Démarrage gratuit", "Aucun développement", "Ta marque, ton Stripe"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><LIcon name="check" className="h-4 w-4 text-brand" /> {tx(t)}</span>
            ))}
          </div>
        </div>

        {/* Visuel : chaîne de valeur */}
        <div className="rv-up relative mx-auto w-full max-w-[400px]" style={{ animationDelay: "220ms" }}>
          <div className="rv-float rounded-[28px] border border-white/12 bg-white/[0.04] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl">
            <div className="mb-3 text-center font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/45">{tx("Ta chaîne de revenus")}</div>
            {[
              { icon: "layers", t: "Toi (revendeur)", d: "Tu encaisses les abonnements des coachs", hi: true },
              { icon: "user", t: "Tes coachs & salles", d: "Ils paient ton abonnement, vendent à leurs clients" },
              { icon: "heart", t: "Leurs clients", d: "Ils vivent une expérience premium à la marque du coach" },
            ].map((r, i) => (
              <div key={r.t} className="relative">
                <div className={`flex items-center gap-3 rounded-2xl border p-3.5 ${r.hi ? "border-brand/35 bg-brand/[0.08]" : "border-white/10 bg-white/[0.03]"}`}>
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${r.hi ? "bg-brand text-white" : "bg-white/8 text-brand"}`}><LIcon name={r.icon} className="h-5 w-5" /></span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-white">{tx(r.t)}</div>
                    <div className="text-[11.5px] leading-snug text-white/50">{tx(r.d)}</div>
                  </div>
                </div>
                {i < 2 ? <div className="mx-auto my-1 h-4 w-px bg-white/15" /> : null}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute -bottom-5 -right-4 rounded-2xl border border-white/12 bg-[#0c0f12]/90 px-4 py-3 shadow-xl backdrop-blur-xl" style={{ animation: "rvFloat 6s ease-in-out infinite", animationDelay: "1.4s" }}>
            <div className="font-archivo text-[15px] font-extrabold leading-none text-white">{tx("Revenus récurrents")}</div>
            <div className="mt-0.5 text-[11px] text-white/50">{tx("chaque mois, en pilote auto")}</div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 bg-white/[0.02] py-4">
        <div className="rv-marquee flex w-max items-center gap-4">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="inline-flex items-center gap-4 text-[15px] font-semibold text-white/45"><span className="size-1.5 rounded-full bg-brand" /> {tx(m)}</span>
          ))}
        </div>
      </div>

      {/* Le marché */}
      <section id="marche" className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-[720px] text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Le marché")}</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Le bon produit, au bon moment")}</h2>
          <p className="mt-5 text-[16px] leading-[1.7] text-white/65">{tx("Fitness, bien-être et logiciel : trois vagues qui convergent. Positionne-toi comme éditeur au cœur de cette croissance, sans en supporter la complexité technique.")}</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {MARKET.map((c, i) => (
            <Reveal key={c.t} delay={i * 90} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-6">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand"><LIcon name={c.icon} className="h-6 w-6" /></span>
              <h3 className="mt-4 font-archivo text-[19px] font-bold">{tx(c.t)}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-white/60">{tx(c.d)}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[12px] text-white/35">{tx("Tendances de marché générales, à titre indicatif.")}</p>
      </section>

      {/* Pourquoi */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-[620px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Pourquoi revendre")}</span>
            <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Le business model le plus scalable qui soit")}</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {WHY.map((c, i) => (
              <Reveal key={c.t} delay={i * 90} className="group rounded-[22px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-all hover:-translate-y-1 hover:border-brand/40">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand transition-colors group-hover:bg-brand/20"><LIcon name={c.icon} className="h-6 w-6" /></span>
                <h3 className="mt-4 font-archivo text-[19px] font-bold">{tx(c.t)}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-white/60">{tx(c.d)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Étapes */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("En 3 étapes")}</span>
          <h2 className="mx-auto mt-4 max-w-[620px] font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Ton activité de revendeur, lancée aujourd'hui")}</h2>
        </Reveal>
        <div className="relative mt-12 grid gap-4 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-brand/50 via-brand/20 to-brand/50 md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100} className="relative rounded-[22px] border border-white/10 bg-[#0c0f12] p-7">
              <span className="font-archivo text-[42px] font-extrabold leading-none text-brand/25">{s.n}</span>
              <h3 className="mt-3 font-archivo text-[19px] font-bold">{tx(s.t)}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-white/60">{tx(s.d)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Simulateur */}
      <section id="simulateur" className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="mx-auto max-w-[680px] text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Simulateur")}</span>
            <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Estime tes revenus de revendeur")}</h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-white/65">{tx("Combien de coachs vas-tu recruter, et à quel abonnement mensuel ? Le revenu récurrent s'affiche en direct.")}</p>
          </Reveal>
          <Reveal delay={100} className="mt-12">
            <RevenueSimulator
              countLabel="Nombre de coachs / salles"
              countUnit="coachs"
              priceLabel={tx("Abonnement mensuel par coach")}
              countMin={1}
              countMax={200}
              countDefault={15}
              priceMin={19}
              priceMax={300}
              priceDefault={49}
              note="Revenu brut illustratif. Ta marge = ce revenu moins ton abonnement plateforme. À toi de fixer prix et volume."
              aiNote="Coût IA : en BYOK, chaque coach branche sa propre clé et paie son IA (≈ 1 à 2 €/client actif/mois). Toi, revendeur, tu n'as aucun coût IA. En mode « revendeur IA », tu peux au contraire fournir l'IA et la revendre avec ta marge."
            />
          </Reveal>
        </div>
      </section>

      {/* Rémunération / possibilités */}
      <section id="modele" className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-[680px]">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Rémunération")}</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Toi seul décides de tes prix et de tes marges")}</h2>
          <p className="mt-4 text-[16px] leading-[1.7] text-white/65">{tx("Tu es libre. Abonnements mensuels ou annuels, paliers par nombre de clients, frais de mise en place pour les salles, codes promo : tu construis ton offre comme tu le sens.")}</p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            { icon: "tag", t: "Tes tarifs, ta liberté", d: "Fixe le prix que paient tes coachs. Mensuel, annuel, par palier de clients : à ta main." },
            { icon: "card", t: "Tu encaisses tout, direct", d: "Sur ton propre compte Stripe. Ta marge = tes ventes moins ton abonnement plateforme." },
            { icon: "scale", t: "Frais de mise en place (salles)", d: "Facture une prestation d'installation one-shot aux salles que tu équipes et paramètres." },
            { icon: "sparkle", t: "Codes promo & offres", d: "Anime ton réseau : premier mois offert, remises de lancement, parrainage… ta stratégie." },
          ].map((c, i) => (
            <Reveal key={c.t} delay={(i % 2) * 90} className="flex gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand/12 text-brand"><LIcon name={c.icon} className="h-5 w-5" /></span>
              <div><h3 className="font-archivo text-[17px] font-bold">{tx(c.t)}</h3><p className="mt-1.5 text-[14px] leading-[1.6] text-white/60">{tx(c.d)}</p></div>
            </Reveal>
          ))}
        </div>

        {/* Scénarios illustratifs */}
        <Reveal delay={120} className="mt-8 overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.02]">
          <div className="grid grid-cols-4 gap-2 border-b border-white/10 px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-white/45">
            <span>{tx("Scénario")}</span><span>{tx("Coachs")}</span><span>{tx("Prix / coach")}</span><span className="text-right">{tx("Revenu / mois")}</span>
          </div>
          {[["Lancement", 10, 39], ["Croissance", 30, 49], ["Réseau établi", 80, 59]].map(([label, n, p]) => (
            <div key={label as string} className="grid grid-cols-4 items-center gap-2 border-b border-white/5 px-5 py-3.5 text-[14px] last:border-0">
              <span className="font-semibold text-white/90">{tx(String(label))}</span>
              <span className="text-white/70">{n as number}</span>
              <span className="text-white/70">{p as number} €</span>
              <span className="text-right font-archivo text-[18px] font-extrabold text-brand tabular-nums">{((n as number) * (p as number)).toLocaleString(fmtLocale())} €</span>
            </div>
          ))}
          <div className="px-5 py-3 text-[12px] text-white/35">{tx("Exemples illustratifs de revenu brut mensuel. Chiffres à ajuster selon ta stratégie.")}</div>
        </Reveal>
      </section>

      {/* Ce que tu obtiens */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-[620px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Clé en main")}</span>
            <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Ton kit de revendeur complet")}</h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 80} className="group rounded-[22px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-all hover:-translate-y-1 hover:border-brand/40">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand transition-colors group-hover:bg-brand/20"><LIcon name={f.icon} className="h-6 w-6" /></span>
                <h3 className="mt-4 font-archivo text-[18px] font-bold">{tx(f.t)}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/60">{tx(f.d)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Questions")}</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold tracking-[-0.025em]">{tx("Le programme revendeur en clair")}</h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-3">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <details className="group rounded-[18px] border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors open:border-brand/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
                  {tx(item.q)}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition-transform group-open:rotate-45"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-[1.7] text-white/60">{tx(item.a)}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 pb-24 sm:px-8">
        <Reveal className="relative overflow-hidden rounded-[28px] border border-white/12 p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(90% 120% at 50% 0%, color-mix(in srgb, ${accent} 30%, transparent), transparent 70%)` }} />
          <div className="relative">
            <h2 className="mx-auto max-w-[720px] font-archivo text-[clamp(28px,5vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em]">{tx("Deviens éditeur de ta plateforme de coaching IA")}</h2>
            <p className="mx-auto mt-4 max-w-[54ch] text-[16px] leading-[1.6] text-white/70">{tx("Démarrage gratuit, aucun développement, ta marque et ton Stripe. Le marché est là. Prends ta place.")}</p>
            <Link href={signup} className="tap mt-8 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-8 py-4 text-[16px] font-semibold text-white shadow-[0_12px_44px_-8px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Créer mon espace revendeur")} <LIcon name="arrow" className="h-4 w-4" /></Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col items-center gap-3 px-5 py-10 text-center sm:px-8">
          <Link href="/" className="min-w-0 overflow-hidden text-white [&_span]:text-white">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-6 w-auto max-w-[150px] object-contain" />
            ) : (
              <Wordmark size={18} />
            )}
          </Link>
          <p className="text-[12.5px] text-white/45">{tx("Programme revendeur My Fitness App — lance ton SaaS de coaching IA en marque blanche.")}</p>
          <Link href="/" className="text-[13px] text-white/50 underline underline-offset-2 hover:text-white">{tx("Retour à l'accueil")}</Link>
        </div>
      </footer>

      {/* CTA collante mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#080a0c]/92 px-4 py-3 backdrop-blur-xl sm:hidden">
        <Link href={signup} className="tap flex w-full items-center justify-center gap-2 rounded-btn bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98]">{tx("Devenir revendeur")} <LIcon name="arrow" className="h-4 w-4" /></Link>
      </div>
    </div>
    </LocaleProvider>
  );
}
