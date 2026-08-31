import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CoachMark } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { publicResellerBySlug } from "@/lib/reseller";
import { DEFAULT_BRAND_COLOR, formatEuros } from "@/lib/config";
import type { Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicResellerBySlug(slug);
  if (!data) return { title: "FitMe90" };
  return {
    title: `${data.reseller.name} — Lance ton business de coaching boosté par l'IA`,
    description:
      "Ton application de coaching à ta marque, propulsée par l'IA. Sans code, sans technique, premier client offert. Crée un business ultra-scalable.",
  };
}

type Feature = { icon: string; title: string; desc: string };

const FEATURES: Feature[] = [
  { icon: "brand", title: "Ton app, ta marque", desc: "Ton logo, tes couleurs, ton nom. Tes clients ne voient que toi, jamais la technologie derrière." },
  { icon: "ai", title: "Un coach IA 24/7", desc: "Entraîné sur ta méthode, il répond à tes clients, ajuste les programmes et travaille pendant que tu dors." },
  { icon: "program", title: "Programmes en 1 clic", desc: "90 jours personnalisés, adaptés au matériel, aux objectifs et au niveau de chaque client." },
  { icon: "nutrition", title: "Nutrition automatique", desc: "Macros, recettes et liste de courses générées. Un accompagnement complet, zéro effort." },
  { icon: "chat", title: "Chat VIP premium", desc: "Garde un lien privilégié avec tes clients, sans y laisser tes soirées." },
  { icon: "card", title: "Paiements intégrés", desc: "Abonnements Stripe, tu fixes tes prix et tu encaisses directement sur ton compte." },
];

const STEPS = [
  { n: "01", title: "Crée ton espace en 5 min", desc: "Nom, couleurs, logo. Ton application est prête, en ligne, à ta marque." },
  { n: "02", title: "Invite tes clients", desc: "Un simple lien. Ils s'inscrivent, l'IA génère tout, tu gardes le contrôle." },
  { n: "03", title: "Encaisse et développe", desc: "Tes tarifs, tes abonnements, ta marge. Une croissance sans plafond." },
];

const STATS = [
  { v: "5 min", l: "pour tout lancer" },
  { v: "0 €", l: "pour démarrer" },
  { v: "24/7", l: "coach IA au travail" },
  { v: "90 j", l: "de programme par client" },
];

const FAQ = [
  { q: "Faut-il des compétences techniques ?", a: "Aucune. Pas de code, pas de serveur, pas de maintenance. Tu te concentres sur tes clients, on gère la technologie." },
  { q: "Combien ça coûte pour commencer ?", a: "Ton premier client est offert. Tu lances ton activité gratuitement et tu passes à une formule uniquement quand tu grandis." },
  { q: "Est-ce vraiment à ma marque ?", a: "Oui : ton logo, tes couleurs, ton nom. Tes clients vivent une expérience 100 % à ton image." },
  { q: "Puis-je fixer mes propres prix ?", a: "Totalement. Tu es libre de tes tarifs, tu vends tes abonnements et tu encaisses directement." },
  { q: "En quoi l'IA m'aide vraiment ?", a: "Elle crée les programmes, adapte la nutrition, répond aux clients et relance les inactifs. Tu démultiplies ton impact sans embaucher." },
];

function Ic({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    brand: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z||M4 9h16||M8 4v5",
    ai: "M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z||M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z",
    program: "M6.5 9.5v5||M17.5 9.5v5||M4 11v2||M20 11v2||M6.5 12h11",
    nutrition: "M12 8a4 4 0 0 0-4 4c0 3 2 7 4 7s4-4 4-7a4 4 0 0 0-4-4z||M12 8V4||M12 4c1.5 0 2.5-1 2.5-2",
    chat: "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v7a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5V15H5.5A1.5 1.5 0 0 1 4 13.5z",
    card: "M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5z||M4 10h16",
    check: "M20 6 9 17l-5-5",
    bolt: "M13 3 4 14h6l-1 7 9-11h-6l1-7z",
    arrow: "M5 12h14M13 6l6 6-6 6",
    scale: "M4 19V5||M4 19h16||M8 16V9||M12 16V6||M16 16v-4||M20 16V8",
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {(paths[name] ?? "").split("||").map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function priceLine(p: Plan): string {
  const parts: string[] = [];
  if (p.price_month_cents != null) parts.push(`${formatEuros(p.price_month_cents)}/mois`);
  if (p.price_year_cents != null) parts.push(`${formatEuros(p.price_year_cents)}/an`);
  return parts.join(" · ");
}

export default async function ResellerLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicResellerBySlug(slug);
  if (!data) notFound();

  const { reseller, plans } = data;
  const accent = reseller.brandColor || DEFAULT_BRAND_COLOR;
  const headline = reseller.headline || "Lance ton business de coaching. On s'occupe de la technologie.";
  const tagline =
    reseller.tagline ||
    `${reseller.name} te confie une plateforme de coaching complète, propulsée par l'IA et à ta marque. Tu vends, tu encaisses, tu grandis. Sans limite.`;
  const signup = `/inscription-coach?r=${reseller.slug}`;

  const css = `
    @keyframes rlUp { from { opacity: 0; transform: translateY(22px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes rlFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
    @keyframes rlPulse { 0%,100% { opacity: .45 } 50% { opacity: .9 } }
    @keyframes rlRing { to { stroke-dashoffset: 46 } }
    .rl-up { animation: rlUp .9s cubic-bezier(.22,1,.36,1) both }
    .rl-float { animation: rlFloat 6s ease-in-out infinite }
  `;

  return (
    <div
      id="top"
      className="relative min-h-dvh overflow-hidden scroll-smooth bg-[#080a0c] text-white [scrollbar-color:#333_#080a0c]"
      style={
        {
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
        } as CSSProperties
      }
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Halos décoratifs */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px]"
        style={{ background: `radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, ${accent} 26%, transparent), transparent 72%)` }}
      />
      <div
        className="pointer-events-none absolute -right-40 top-[420px] h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, animation: "rlPulse 7s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(70% 55% at 50% 0%, #000, transparent 80%)" }}
      />

      {/* Header */}
      <header className="relative z-30 sticky top-0 border-b border-white/10 bg-[#080a0c]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <span className="text-white [&_span]:text-white">
            <CoachMark brand={{ name: reseller.name, logoUrl: reseller.logoUrl }} size={22} imgClass="h-10 sm:h-12" />
          </span>
          <div className="flex items-center gap-2">
            <a href="#formules" className="hidden text-[14px] font-medium text-white/60 transition-colors hover:text-white sm:inline">Tarifs</a>
            <Link href={signup} className="tap inline-flex h-10 items-center gap-1.5 rounded-btn bg-brand px-4 text-[14px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">
              Démarrer gratuitement
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-[1160px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="rl-up inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-white/75" style={{ animationDelay: "0ms" }}>
            <span className="size-1.5 rounded-full bg-brand" style={{ animation: "rlPulse 2s ease-in-out infinite" }} />
            Propulsé par {reseller.name} · Boosté par l&apos;IA
          </span>
          <h1 className="rl-up mt-5 font-archivo text-[clamp(34px,6.5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.035em]" style={{ animationDelay: "80ms" }}>
            {headline.split(".").map((chunk, i, arr) =>
              chunk.trim() ? (
                <span key={i} className={i === 0 ? "bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent" : "text-brand"}>
                  {chunk.trim()}{i < arr.length - 1 ? ". " : ""}
                </span>
              ) : null,
            )}
          </h1>
          <p className="rl-up mt-5 max-w-[56ch] text-[16.5px] leading-[1.7] text-white/70" style={{ animationDelay: "160ms" }}>
            {tagline}
          </p>
          <div className="rl-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href={signup} className="tap group inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15.5px] font-semibold text-white shadow-[0_10px_40px_-8px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">
              Créer mon espace coach
              <Ic name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#opportunite" className="tap inline-flex items-center justify-center rounded-btn border border-white/15 px-6 py-4 text-[15px] font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white">
              Découvrir l&apos;opportunité
            </a>
          </div>
          <div className="rl-up mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/55" style={{ animationDelay: "320ms" }}>
            {["Premier client offert", "Aucune ligne de code", "Sans engagement"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><Ic name="check" className="h-4 w-4 text-brand" /> {t}</span>
            ))}
          </div>
        </div>

        {/* Mockup produit */}
        <div className="rl-up relative mx-auto w-full max-w-[380px]" style={{ animationDelay: "220ms" }}>
          <div className="rl-float rounded-[28px] border border-white/12 bg-white/[0.04] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl">
            <div className="rounded-[20px] bg-[#0c0f12] p-4">
              <div className="flex items-center justify-between">
                <span className="text-white [&_span]:text-white"><CoachMark brand={{ name: reseller.name, logoUrl: reseller.logoUrl }} size={15} imgClass="h-6" /></span>
                <span className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-brand"><Ic name="ai" className="h-4 w-4" /></span>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-white/45">
                  <span className="flex size-6 items-center justify-center rounded-full bg-brand/20 text-brand"><Ic name="ai" className="h-3.5 w-3.5" /></span>
                  Coach IA
                </div>
                <p className="mt-2 text-[13px] leading-[1.5] text-white/85">Ta séance du jour est prête 💪 On vise +2 reps sur le développé. Prêt ?</p>
              </div>
              <div className="mt-3 rounded-2xl border border-brand/25 bg-brand/[0.08] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-white/90">Programme · Jour 24 / 90</span>
                  <span className="font-archivo text-[13px] font-bold text-brand">On track</span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-brand" style={{ width: "73%" }} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[["Force", "+18%"], ["Séances", "21"], ["Assiduité", "94%"]].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                    <div className="font-archivo text-[15px] font-extrabold text-white">{v}</div>
                    <div className="text-[10px] text-white/45">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -left-5 rounded-2xl border border-white/12 bg-[#0c0f12]/90 px-4 py-3 shadow-xl backdrop-blur-xl" style={{ animation: "rlFloat 6s ease-in-out infinite", animationDelay: "1.5s" }}>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand/15 text-brand"><Ic name="card" className="h-5 w-5" /></span>
              <div>
                <div className="font-archivo text-[15px] font-extrabold leading-none text-white">+1 abonné</div>
                <div className="mt-0.5 text-[11px] text-white/50">revenu récurrent</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Barre de stats */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-[1160px] grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-4 sm:px-8">
          {STATS.map((s) => (
            <div key={s.l} className="text-center sm:text-left">
              <div className="font-archivo text-[clamp(24px,4vw,32px)] font-extrabold tracking-[-0.02em] text-white">{s.v}</div>
              <div className="mt-1 text-[13px] text-white/55">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Opportunité */}
      <section id="opportunite" className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">L&apos;opportunité</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">
            Le coaching en ligne explose. <span className="text-brand">L&apos;IA t&apos;offre la longueur d&apos;avance.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-[1.7] text-white/65">
            Vends un accompagnement premium sans embaucher, sans plafond horaire, sans stack technique.
            Des revenus récurrents, une marge logicielle, une croissance qui ne dépend plus de ton temps.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { icon: "bolt", t: "Démarre en minutes", d: "Pas de développeur, pas de setup. Ton app est en ligne aujourd'hui, à ta marque." },
            { icon: "scale", t: "Scale sans limite", d: "L'IA gère 1 ou 1 000 clients avec la même énergie. Ta croissance n'est plus bridée par tes heures." },
            { icon: "card", t: "Revenus récurrents", d: "Des abonnements qui tombent chaque mois. Tu fixes tes prix, tu encaisses directement." },
          ].map((c, i) => (
            <Reveal key={c.t} delay={i * 90} className="group rounded-[22px] border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-brand/40">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand transition-colors group-hover:bg-brand/20">
                <Ic name={c.icon} className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-archivo text-[19px] font-bold">{c.t}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-white/60">{c.d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Ce qui est inclus */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-[620px]">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">Clé en main</span>
            <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">
              Tout ce qu&apos;il te faut pour vendre, déjà prêt
            </h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-white/65">Une plateforme complète. Toi, tu gères tes clients. Le reste tourne tout seul.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80} className="group rounded-[22px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-all hover:-translate-y-1 hover:border-brand/40">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand transition-colors group-hover:bg-brand/20">
                  <Ic name={f.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-archivo text-[18px] font-bold">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/60">{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">En 3 étapes</span>
          <h2 className="mx-auto mt-4 max-w-[620px] font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">
            De zéro à ton premier client aujourd&apos;hui
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100} className="relative rounded-[22px] border border-white/10 bg-white/[0.03] p-7">
              <span className="font-archivo text-[42px] font-extrabold leading-none text-brand/25">{s.n}</span>
              <h3 className="mt-3 font-archivo text-[19px] font-bold">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-white/60">{s.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Tarifs */}
      <section id="formules" className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">Tarifs</span>
            <h2 className="mx-auto mt-4 max-w-[640px] font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">
              Ton premier client est <span className="text-brand">offert</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-white/65">
              Lance ton activité sans rien payer. Tu passes à une formule seulement quand tu accueilles ton deuxième client.
            </p>
          </Reveal>

          {plans.length > 0 ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p, i) => (
                <Reveal key={p.id} delay={i * 80} className="flex flex-col gap-4 rounded-[24px] border border-white/12 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-7">
                  <div className="font-archivo text-[20px] font-bold">{p.name}</div>
                  <div>
                    <span className="font-archivo text-[30px] font-extrabold tracking-[-0.02em] text-brand">{priceLine(p) || "Sur mesure"}</span>
                  </div>
                  <div className="text-[14px] text-white/70">
                    {p.client_limit == null ? "Clients illimités" : `Jusqu'à ${p.client_limit} client${p.client_limit > 1 ? "s" : ""} actifs`}
                  </div>
                  {p.setup_fee_cents > 0 ? (
                    <div className="text-[12.5px] text-white/45">+ {formatEuros(p.setup_fee_cents)} de mise en place (une fois)</div>
                  ) : null}
                  <Link href={signup} className="tap mt-auto inline-flex items-center justify-center rounded-btn bg-brand px-5 py-3.5 text-[14.5px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">
                    Commencer
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <Reveal className="mx-auto mt-12 max-w-[480px] rounded-[24px] border border-brand/25 bg-gradient-to-b from-brand/[0.12] to-transparent p-9 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/15 text-brand"><Ic name="bolt" className="h-7 w-7" /></div>
              <div className="mt-4 font-archivo text-[26px] font-extrabold">Premier client offert</div>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-white/65">
                Crée ton espace et démarre gratuitement. {reseller.name} te proposera ses formules dès que tu grandis.
              </p>
              <Link href={signup} className="tap mt-6 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">
                Créer mon espace coach <Ic name="arrow" className="h-4 w-4" />
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">Questions</span>
          <h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold tracking-[-0.025em]">Tout ce que tu te demandes</h2>
        </Reveal>
        <div className="mt-10 flex flex-col gap-3">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 60}>
              <details className="group rounded-[18px] border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors open:border-brand/30 [&_summary]:cursor-pointer">
                <summary className="flex list-none items-center justify-between gap-4 text-[15.5px] font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition-transform group-open:rotate-45">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-[1.7] text-white/60">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 pb-24 sm:px-8">
        <Reveal className="relative overflow-hidden rounded-[28px] border border-white/12 p-10 text-center sm:p-16" >
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(90% 120% at 50% 0%, color-mix(in srgb, ${accent} 30%, transparent), transparent 70%)` }} />
          <div className="relative">
            <h2 className="mx-auto max-w-[680px] font-archivo text-[clamp(28px,5vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              Ton business de coaching commence maintenant
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-white/70">
              Ton premier client est offert. Aucune carte requise. Sois en ligne dans 5 minutes.
            </p>
            <Link href={signup} className="tap mt-8 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-8 py-4 text-[16px] font-semibold text-white shadow-[0_12px_44px_-8px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">
              Créer mon espace coach <Ic name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col items-center gap-2 px-5 py-10 text-center sm:px-8">
          <span className="text-white [&_span]:text-white">
            <CoachMark brand={{ name: reseller.name, logoUrl: reseller.logoUrl }} size={18} imgClass="h-8" />
          </span>
          <p className="text-[12.5px] text-white/45">
            Plateforme de coaching en marque blanche, propulsée par l&apos;IA. Premier client offert, sans engagement.
          </p>
        </div>
      </footer>
    </div>
  );
}
