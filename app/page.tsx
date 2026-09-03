import type { CSSProperties } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/mobile-nav";
import { LocaleProvider } from "@/components/locale-provider";
import { setRequestLocale } from "@/lib/i18n/request";
import { resolveLocale } from "@/lib/i18n/server";
import { tx } from "@/lib/i18n/request";
import type { Viewport } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Reveal } from "@/components/reveal";
import { RevenueSimulator } from "@/components/revenue-simulator";
import { LIcon } from "@/components/landing-icon";
import { DEFAULT_BRAND_COLOR, formatEuros } from "@/lib/config";
import { platformTenantId } from "@/lib/hierarchy";
import { listPlans, type Plan } from "@/lib/plans";

export const viewport: Viewport = { themeColor: "#080a0c" };
export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Fitness App — Lance ta web app de coaching sportif, boostée par l'IA",
  description:
    "Ta propre application de coaching à ta marque, propulsée par l'IA. Sans code, sans technique, premier client offert. Programmes, nutrition, chat VIP, paiements. Un business scalable, clé en main.",
};

const MARQUEE = ["Marque blanche", "Coach IA 24/7", "Programmes sur-mesure", "Nutrition auto", "Chat VIP", "Paiements Stripe", "Zéro code", "Revenus récurrents", "Premier client offert"];

const FEATURES = [
  { icon: "chat", title: "Chat VIP premium", desc: "Garde un lien privilégié avec tes clients, sans y laisser tes soirées." },
  { icon: "card", title: "Paiements intégrés", desc: "Abonnements Stripe, tu fixes tes prix et tu encaisses directement." },
  { icon: "crm", title: "CRM & relances", desc: "Suivi, notifications, rétention automatisée. Tes clients restent, ton chiffre monte." },
  { icon: "bolt", title: "Zéro technique", desc: "Pas de code, pas de serveur, pas de maintenance. Tu vends, on gère la tech." },
  { icon: "shield", title: "Données sécurisées", desc: "Hébergement UE, chiffrement, conformité. La confiance intégrée." },
  { icon: "phone", title: "Web app installable", desc: "Tes clients ajoutent ta web app à leur écran d'accueil. Une vraie présence, à ta marque." },
];

const SHOWCASE: { kind: "ai" | "program" | "nutrition"; tag: string; title: string; desc: string; points: string[] }[] = [
  { kind: "ai", tag: "Coach IA", title: "Une IA entraînée sur ta méthode, au travail 24/7", desc: "Elle répond à tes clients, adapte les séances, motive et relance. Un assistant qui ne dort jamais.", points: ["Réponses instantanées, à ton ton", "Ajuste charges et volumes tout seul", "Relance les clients qui décrochent"] },
  { kind: "program", tag: "Programmes", title: "Ton programme complet, généré en un clic", desc: "Chaque client reçoit un plan personnalisé selon son objectif, son matériel et son niveau. Les cycles évoluent automatiquement.", points: ["Adapté au matériel réel (salle ou maison)", "Cycles progressifs, durée personnalisable", "Se régénère à la progression"] },
  { kind: "nutrition", tag: "Nutrition", title: "Nutrition, recettes et courses, 100 % automatiques", desc: "Macros calculées, recettes générées, liste de courses prête. Un accompagnement complet sans effort de ta part.", points: ["Macros par objectif", "Recettes et alternatives", "Liste de courses auto"] },
];

const COMPARE_WITHOUT = ["Des dizaines d'heures à créer chaque programme", "Un développeur et des milliers d'euros pour une web app", "Un chiffre d'affaires plafonné par tes heures", "Des clients qui décrochent, sans relance", "Excel, PDF et messages éparpillés"];
const COMPARE_WITH = ["Programmes générés en un clic par l'IA", "Ta web app en ligne aujourd'hui, sans une ligne de code", "Une croissance scalable, revenus récurrents", "Relances et rétention automatisées", "Tout centralisé, à ta marque"];

const STEPS = [
  { n: "01", title: "Crée ton espace en 5 min", desc: "Nom, couleurs, logo. Ta web app est prête, en ligne, à ta marque." },
  { n: "02", title: "Invite tes clients", desc: "Un simple lien. Ils s'inscrivent, l'IA génère tout, tu gardes le contrôle." },
  { n: "03", title: "Encaisse et développe", desc: "Tes tarifs, tes abonnements, ta marge. Une croissance sans plafond." },
];

const SECTORS = [
  { icon: "user", label: "Coachs indépendants" },
  { icon: "dumbbell", label: "Salles de sport" },
  { icon: "brand", label: "Studios & box" },
  { icon: "heart", label: "Préparateurs & kinés" },
  { icon: "phone", label: "Influenceurs fitness" },
];

const FAQ = [
  { q: "Faut-il des compétences techniques ?", a: "Aucune. Pas de code, pas de serveur, pas de maintenance. Tu te concentres sur tes clients, on gère la technologie." },
  { q: "Combien ça coûte pour commencer ?", a: "Ton premier client est offert. Tu lances ton activité gratuitement et tu passes à une formule uniquement quand tu grandis." },
  { q: "Est-ce vraiment à ma marque ?", a: "Oui : ton logo, tes couleurs, ton nom. Tes clients vivent une expérience 100 % à ton image." },
  { q: "Puis-je fixer mes propres prix ?", a: "Totalement. Tu es libre de tes tarifs, tu vends tes abonnements et tu encaisses directement." },
  { q: "En quoi l'IA m'aide vraiment ?", a: "Elle crée les programmes, adapte la nutrition, répond aux clients et relance les inactifs. Tu démultiplies ton impact sans embaucher." },
  { q: "Mes données et celles de mes clients sont-elles protégées ?", a: "Oui : hébergement en Union Européenne, chiffrement et cloisonnement strict entre comptes." },
];

function priceLine(p: Plan): string {
  const parts: string[] = [];
  if (p.price_month_cents != null) parts.push(`${formatEuros(p.price_month_cents)}${tx("/mois")}`);
  if (p.price_year_cents != null) parts.push(`${formatEuros(p.price_year_cents)}${tx("/an")}`);
  return parts.join(" · ");
}

function ShowcaseVisual({ kind }: { kind: "ai" | "program" | "nutrition" }) {
  return (
    <div className="rl-float rounded-[26px] border border-white/12 bg-white/[0.04] p-4 shadow-[0_30px_80px_-24px_rgba(0,0,0,.7)] backdrop-blur-xl">
      <div className="rounded-[18px] bg-[#0c0f12] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-white [&_span]:text-white"><Wordmark size={14} /></span>
          <span className="flex size-7 items-center justify-center rounded-full bg-brand/15 text-brand"><LIcon name={kind === "ai" ? "ai" : kind === "program" ? "dumbbell" : "nutrition"} className="h-4 w-4" /></span>
        </div>
        {kind === "ai" ? (
          <div className="flex flex-col gap-2.5">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-brand px-3.5 py-2 text-[12.5px] text-white">{tx("Je stagne sur le développé couché…")}</div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[12.5px] text-white/85">{tx("On passe en 5×5 cette semaine et on ajoute 2,5 kg. Tu vas débloquer 💪")}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/40"><span className="flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-white/40" /><span className="size-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:120ms]" /><span className="size-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:240ms]" /></span>{tx("Coach IA écrit…")}</div>
          </div>
        ) : kind === "program" ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.12em] text-white/45"><span>{tx("Cycle 2 · Jour 24")}</span><span className="text-brand">73%</span></div>
            <div className="grid grid-cols-7 gap-1.5">{Array.from({ length: 21 }).map((_, i) => (<span key={i} className={`h-5 rounded-md ${i < 15 ? "bg-brand/70" : i === 15 ? "bg-brand ring-2 ring-brand/40" : "bg-white/8"}`} />))}</div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[12.5px] text-white/85">{tx("Séance A · Haut du corps")}<br /><span className="text-white/45">{tx("Développé · Tirage · Élévations · Gainage")}</span></div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-2">{[["Prot.", "156 g"], ["Gluc.", "210 g"], ["Lip.", "62 g"]].map(([k, v]) => (<div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center"><div className="font-archivo text-[15px] font-extrabold text-white">{tx(v)}</div><div className="text-[10px] text-white/45">{tx(k)}</div></div>))}</div>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.08] p-3"><span className="flex size-9 items-center justify-center rounded-lg bg-brand/20 text-brand"><LIcon name="nutrition" className="h-5 w-5" /></span><div className="text-[12.5px] text-white/85">{tx("Bowl poulet & patate douce")}<br /><span className="text-white/45">{tx("642 kcal · 12 min")}</span></div></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function Home() {
  const locale = await resolveLocale(null);
  setRequestLocale(locale);
  const accent = DEFAULT_BRAND_COLOR;
  const signup = "/inscription-coach";
  const platformId = await platformTenantId();
  const plans = platformId
    ? (await listPlans(platformId)).filter((p) => p.is_active && (p.price_month_cents != null || p.price_year_cents != null))
    : [];

  const css = `
    @keyframes rlUp { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
    @keyframes rlFloat { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-12px) } }
    @keyframes rlPulse { 0%,100% { opacity:.4 } 50% { opacity:.9 } }
    @keyframes rlOrb { 0%,100% { transform:translate(0,0) } 50% { transform:translate(24px,-34px) } }
    @keyframes rlMarquee { from { transform:translateX(0) } to { transform:translateX(-50%) } }
    .rl-up { animation: rlUp .9s cubic-bezier(.22,1,.36,1) both }
    .rl-float { animation: rlFloat 6s ease-in-out infinite }
    .rl-marquee { animation: rlMarquee 32s linear infinite }
    @media (prefers-reduced-motion: reduce) { .rl-float, .rl-marquee { animation: none } }
  `;

  return (
    <LocaleProvider locale={locale}>
    <div id="top" className="relative min-h-dvh overflow-hidden scroll-smooth bg-[#080a0c] pb-[76px] text-white [scrollbar-color:#333_#080a0c] sm:pb-0" style={{ ["--color-brand" as string]: accent, ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)` } as CSSProperties}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px]" style={{ background: `radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, ${accent} 26%, transparent), transparent 72%)` }} />
      <div className="pointer-events-none absolute -right-40 top-[380px] h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)`, animation: "rlOrb 12s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "56px 56px", maskImage: "radial-gradient(75% 45% at 50% 0%, #000, transparent 80%)" }} />

      {/* Header */}
      <header className="relative z-30 sticky top-0 border-b border-white/10 bg-[#080a0c]/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="#top" className="min-w-0 overflow-hidden text-white [&_span]:text-white"><Wordmark size={22} /></Link>
          <nav className="hidden items-center gap-7 md:flex">
            {[["#apercu", "Aperçu"], ["#simulateur", "Simulateur"], ["#formules", "Tarifs"], ["#faq", "FAQ"]].map(([h, l]) => (
              <a key={h} href={h} className="text-[14px] font-medium text-white/60 transition-colors hover:text-white">{tx(l)}</a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <MobileNav
              className="md:hidden"
              tone="dark"
              bg="#080a0c"
              radius={12}
              langLabel={tx("Langue")}
              brand={<span className="text-white [&_span]:text-white"><Wordmark size={20} /></span>}
              links={[
                { href: "#apercu", label: tx("Aperçu") },
                { href: "#simulateur", label: tx("Simulateur") },
                { href: "#formules", label: tx("Tarifs") },
                { href: "#faq", label: tx("FAQ") },
              ]}
              login={{ href: "/connexion", label: tx("Connexion") }}
              cta={{ href: signup, label: tx("Démarrer gratuitement") }}
            />
            {/* La bascule de langue quitte la barre du haut sur téléphone :
                elle vit dans le menu, où elle ne prend la place de rien. */}
            <span className="hidden md:block">
              <LangSwitch compact className="border-white/20 bg-white/5 text-white/70" />
            </span>
            <Link href="/connexion" className="hidden text-[14px] font-medium text-white/60 transition-colors hover:text-white sm:inline">{tx("Connexion")}</Link>
            {/* Masqué sous sm : la barre collante du bas porte déjà ce CTA, et
                le garder ici poussait le bouton hors de l'écran sur mobile. */}
            <Link href={signup} className="tap hidden h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-btn bg-brand px-3.5 text-[13.5px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98] sm:inline-flex">{tx("Démarrer gratuitement")}</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid w-full max-w-[1160px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="rl-up inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-white/75"><span className="size-1.5 rounded-full bg-brand" style={{ animation: "rlPulse 2s ease-in-out infinite" }} /> {tx("Ta web app de coaching · Boostée par l'IA")}</span>
          <h1 className="rl-up mt-5 font-archivo text-[clamp(34px,6.5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.035em]" style={{ animationDelay: "80ms" }}>
            <span className="bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">{tx("Ta web app de coaching,")}</span> <span className="text-brand">{tx("prête à vendre.")}</span>
          </h1>
          <p className="rl-up mt-5 max-w-[56ch] text-[16.5px] leading-[1.7] text-white/70" style={{ animationDelay: "160ms" }}>{tx("Lance ton activité de coaching sous ta marque, propulsée par l'IA. Programmes, nutrition, chat, paiements : tout est prêt. Toi, tu vends.")} <span className="text-white/90">{tx("Ton premier client est offert.")}</span></p>
          <div className="rl-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href={signup} className="tap group inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15.5px] font-semibold text-white shadow-[0_10px_40px_-8px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Créer mon espace coach")} <LIcon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
            <a href="#apercu" className="tap inline-flex items-center justify-center rounded-btn border border-white/15 px-6 py-4 text-[15px] font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white">{tx("Voir l'aperçu")}</a>
          </div>
          <div className="rl-up mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/55" style={{ animationDelay: "320ms" }}>
            {["Premier client offert", "Aucune ligne de code", "Sans engagement"].map((t) => (<span key={t} className="inline-flex items-center gap-1.5"><LIcon name="check" className="h-4 w-4 text-brand" /> {tx(t)}</span>))}
          </div>
        </div>
        <div className="rl-up relative mx-auto w-full max-w-[380px]" style={{ animationDelay: "220ms" }}>
          <div className="rl-float rounded-[28px] border border-white/12 bg-white/[0.04] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl">
            <div className="rounded-[20px] bg-[#0c0f12] p-4">
              <div className="flex items-center justify-between"><span className="text-white [&_span]:text-white"><Wordmark size={15} /></span><span className="flex size-8 items-center justify-center rounded-full bg-brand/15 text-brand"><LIcon name="ai" className="h-4 w-4" /></span></div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5"><div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-white/45"><span className="flex size-6 items-center justify-center rounded-full bg-brand/20 text-brand"><LIcon name="ai" className="h-3.5 w-3.5" /></span>{tx("Coach IA")}</div><p className="mt-2 text-[13px] leading-[1.5] text-white/85">{tx("Ta séance du jour est prête 💪 On vise +2 reps sur le développé. Prêt ?")}</p></div>
              <div className="mt-3 rounded-2xl border border-brand/25 bg-brand/[0.08] p-3.5"><div className="flex items-center justify-between"><span className="text-[12px] font-semibold text-white/90">{tx("Programme · Cycle 2 · Jour 24")}</span><span className="font-archivo text-[13px] font-bold text-brand">{tx("On track")}</span></div><div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-brand" style={{ width: "73%" }} /></div></div>
              <div className="mt-3 grid grid-cols-3 gap-2">{[["Force", "+18%"], ["Séances", "21"], ["Assiduité", "94%"]].map(([k, v]) => (<div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center"><div className="font-archivo text-[15px] font-extrabold text-white">{tx(v)}</div><div className="text-[10px] text-white/45">{tx(k)}</div></div>))}</div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-5 -left-5 rounded-2xl border border-white/12 bg-[#0c0f12]/90 px-4 py-3 shadow-xl backdrop-blur-xl" style={{ animation: "rlFloat 6s ease-in-out infinite", animationDelay: "1.5s" }}><div className="flex items-center gap-2.5"><span className="flex size-9 items-center justify-center rounded-full bg-brand/15 text-brand"><LIcon name="card" className="h-5 w-5" /></span><div><div className="font-archivo text-[15px] font-extrabold leading-none text-white">{tx("+1 abonné")}</div><div className="mt-0.5 text-[11px] text-white/50">{tx("revenu récurrent")}</div></div></div></div>
        </div>
      </section>

      {/* Marquee */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 bg-white/[0.02] py-4"><div className="rl-marquee flex w-max items-center gap-4">{[...MARQUEE, ...MARQUEE].map((m, i) => (<span key={i} className="inline-flex items-center gap-4 text-[15px] font-semibold text-white/45"><span className="size-1.5 rounded-full bg-brand" /> {tx(m)}</span>))}</div></div>

      {/* Avant / Après */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-16 sm:px-8 sm:py-24">
        <Reveal className="mx-auto max-w-[680px] text-center"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Le déclic")}</span><h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Change de dimension, sans changer de métier")}</h2></Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Reveal className="rounded-[24px] border border-white/10 bg-white/[0.02] p-7"><div className="inline-flex items-center gap-2 rounded-pill border border-white/10 px-3 py-1 text-[12px] font-semibold text-white/50">{tx("Sans plateforme")}</div><ul className="mt-5 flex flex-col gap-3.5">{COMPARE_WITHOUT.map((t) => (<li key={t} className="flex items-start gap-3 text-[14.5px] leading-[1.5] text-white/55"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50"><LIcon name="x" className="h-3 w-3" /></span>{tx(t)}</li>))}</ul></Reveal>
          <Reveal delay={120} className="relative overflow-hidden rounded-[24px] border border-brand/30 bg-gradient-to-b from-brand/[0.10] to-transparent p-7"><div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-2xl" style={{ background: `color-mix(in srgb, ${accent} 30%, transparent)` }} /><div className="relative"><div className="inline-flex items-center gap-2 rounded-pill bg-brand/15 px-3 py-1 text-[12px] font-semibold text-brand">{tx("Avec My Fitness App")}</div><ul className="mt-5 flex flex-col gap-3.5">{COMPARE_WITH.map((t) => (<li key={t} className="flex items-start gap-3 text-[14.5px] font-medium leading-[1.5] text-white/90"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-white"><LIcon name="check" className="h-3 w-3" /></span>{tx(t)}</li>))}</ul></div></Reveal>
        </div>
      </section>

      {/* Aperçu produit */}
      <section id="apercu" className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-16 px-5 py-20 sm:px-8 sm:py-28 sm:gap-24">
          <Reveal className="mx-auto max-w-[680px] text-center"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("L'aperçu")}</span><h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Une expérience premium, à ta marque")}</h2></Reveal>
          {SHOWCASE.map((s, i) => (
            <div key={s.kind} className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Reveal className="mx-auto w-full max-w-[380px]"><ShowcaseVisual kind={s.kind} /></Reveal>
              <Reveal delay={100}><span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">{tx(s.tag)}</span><h3 className="mt-3 font-archivo text-[clamp(22px,3.5vw,32px)] font-extrabold leading-[1.1] tracking-[-0.02em]">{tx(s.title)}</h3><p className="mt-4 text-[15.5px] leading-[1.7] text-white/65">{tx(s.desc)}</p><ul className="mt-5 flex flex-col gap-2.5">{s.points.map((p) => (<li key={p} className="flex items-center gap-2.5 text-[14.5px] text-white/80"><LIcon name="check" className="h-4 w-4 shrink-0 text-brand" /> {tx(p)}</li>))}</ul></Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* Simulateur */}
      <section id="simulateur" className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-[680px] text-center"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Simulateur")}</span><h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Combien peux-tu gagner ?")}</h2><p className="mt-4 text-[16px] leading-[1.7] text-white/65">{tx("Fais glisser les curseurs : ton nombre de clients, ton tarif. Ton revenu récurrent s'affiche en direct.")}</p></Reveal>
        <Reveal delay={100} className="mt-12"><RevenueSimulator aiNote="Le coût de l'IA (BYOK) est d'environ 1 à 2 € par client actif et par mois : négligeable face à ces revenus. La marge reste quasi intégrale." /></Reveal>
        <div className="mt-8 text-center"><Link href={signup} className="tap inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Je me lance")} <LIcon name="arrow" className="h-4 w-4" /></Link></div>
      </section>

      {/* Ce qui est inclus */}
      <section className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-[620px]"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Clé en main")}</span><h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Tout ce qu'il te faut, déjà prêt")}</h2><p className="mt-4 text-[16px] leading-[1.7] text-white/65">{tx("Une plateforme complète. Toi, tu gères tes clients. Le reste tourne tout seul.")}</p></Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{FEATURES.map((f, i) => (<Reveal key={f.title} delay={(i % 3) * 80} className="group rounded-[22px] border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-all hover:-translate-y-1 hover:border-brand/40"><span className="flex size-12 items-center justify-center rounded-2xl bg-brand/12 text-brand transition-colors group-hover:bg-brand/20"><LIcon name={f.icon} className="h-6 w-6" /></span><h3 className="mt-4 font-archivo text-[18px] font-bold">{tx(f.title)}</h3><p className="mt-2 text-[14px] leading-[1.6] text-white/60">{tx(f.desc)}</p></Reveal>))}</div>
        </div>
      </section>

      {/* Étapes */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("En 3 étapes")}</span><h2 className="mx-auto mt-4 max-w-[620px] font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("De zéro à ton premier client aujourd'hui")}</h2></Reveal>
        <div className="relative mt-12 grid gap-4 md:grid-cols-3"><div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-brand/50 via-brand/20 to-brand/50 md:block" />{STEPS.map((s, i) => (<Reveal key={s.n} delay={i * 100} className="relative rounded-[22px] border border-white/10 bg-[#0c0f12] p-7"><span className="font-archivo text-[42px] font-extrabold leading-none text-brand/25">{s.n}</span><h3 className="mt-3 font-archivo text-[19px] font-bold">{tx(s.title)}</h3><p className="mt-2 text-[14.5px] leading-[1.6] text-white/60">{tx(s.desc)}</p></Reveal>))}</div>
      </section>

      {/* Pour qui */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 py-16 sm:px-8 sm:py-20">
        <Reveal className="text-center"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Pour qui")}</span><h2 className="mx-auto mt-4 max-w-[560px] font-archivo text-[clamp(24px,4vw,36px)] font-extrabold tracking-[-0.02em]">{tx("Pensé pour tous ceux qui vendent du résultat")}</h2></Reveal>
        <div className="mt-9 flex flex-wrap justify-center gap-3">{SECTORS.map((s, i) => (<Reveal key={s.label} delay={i * 60} className="inline-flex items-center gap-2.5 rounded-pill border border-white/12 bg-white/[0.03] px-4 py-2.5 text-[14px] font-medium text-white/80"><span className="text-brand"><LIcon name={s.icon} className="h-5 w-5" /></span>{tx(s.label)}</Reveal>))}</div>
      </section>

      {/* Tarifs */}
      <section id="formules" className="relative z-10 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1160px] px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="text-center"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Tarifs")}</span><h2 className="mx-auto mt-4 max-w-[640px] font-archivo text-[clamp(26px,4.5vw,42px)] font-extrabold leading-[1.08] tracking-[-0.025em]">{tx("Ton premier client est")} <span className="text-brand">{tx("offert")}</span></h2><p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-white/65">{tx("Lance ton activité sans rien payer. Tu passes à une formule seulement quand tu accueilles ton deuxième client.")}</p></Reveal>
          {plans.length > 0 ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{plans.map((p, i) => (<Reveal key={p.id} delay={i * 80} className="flex flex-col gap-4 rounded-[24px] border border-white/12 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-7 transition-all hover:-translate-y-1 hover:border-brand/40"><div className="font-archivo text-[20px] font-bold">{tx(p.name)}</div><div><span className="font-archivo text-[30px] font-extrabold tracking-[-0.02em] text-brand">{priceLine(p) || tx("Sur mesure")}</span></div><div className="text-[14px] text-white/70">{p.client_limit == null ? tx("Clients illimités") : `${tx("Jusqu'à")} ${p.client_limit} ${p.client_limit > 1 ? tx("clients actifs") : tx("client actif")}`}</div>{p.setup_fee_cents > 0 ? <div className="text-[12.5px] text-white/45">+ {formatEuros(p.setup_fee_cents)} {tx("de mise en place (une fois)")}</div> : null}<Link href={signup} className="tap mt-auto inline-flex items-center justify-center rounded-btn bg-brand px-5 py-3.5 text-[14.5px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Commencer")}</Link></Reveal>))}</div>
          ) : (
            <Reveal className="mx-auto mt-12 max-w-[480px] rounded-[24px] border border-brand/25 bg-gradient-to-b from-brand/[0.12] to-transparent p-9 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/15 text-brand"><LIcon name="bolt" className="h-7 w-7" /></div><div className="mt-4 font-archivo text-[26px] font-extrabold">{tx("Premier client offert")}</div><p className="mt-2 text-[14.5px] leading-[1.6] text-white/65">{tx("Crée ton espace et démarre gratuitement. Tu passes à une formule quand tu grandis.")}</p><Link href={signup} className="tap mt-6 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-7 py-4 text-[15px] font-semibold text-white transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Créer mon espace coach")} <LIcon name="arrow" className="h-4 w-4" /></Link></Reveal>
          )}
          <Reveal delay={120} className="mx-auto mt-10 flex max-w-[720px] flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[13.5px] text-white/60">{["Sans carte bancaire", "Sans engagement", "Annule quand tu veux", "Données hébergées en UE"].map((t) => (<span key={t} className="inline-flex items-center gap-1.5"><LIcon name="check" className="h-4 w-4 text-brand" /> {tx(t)}</span>))}</Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto w-full max-w-[820px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="text-center"><span className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand">{tx("Questions")}</span><h2 className="mt-4 font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold tracking-[-0.025em]">{tx("Tout ce que tu te demandes")}</h2></Reveal>
        <div className="mt-10 flex flex-col gap-3">{FAQ.map((item, i) => (<Reveal key={item.q} delay={i * 50}><details className="group rounded-[18px] border border-white/10 bg-white/[0.03] px-5 py-4 transition-colors open:border-brand/30"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-semibold text-white/90 [&::-webkit-details-marker]:hidden">{tx(item.q)}<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/60 transition-transform group-open:rotate-45"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span></summary><p className="mt-3 text-[14.5px] leading-[1.7] text-white/60">{tx(item.a)}</p></details></Reveal>))}</div>
      </section>

      {/* CTA final */}
      <section className="relative z-10 mx-auto w-full max-w-[1160px] px-5 pb-20 sm:px-8">
        <Reveal className="relative overflow-hidden rounded-[28px] border border-white/12 p-10 text-center sm:p-16"><div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(90% 120% at 50% 0%, color-mix(in srgb, ${accent} 30%, transparent), transparent 70%)` }} /><div className="relative"><h2 className="mx-auto max-w-[680px] font-archivo text-[clamp(28px,5vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em]">{tx("Ton business de coaching commence maintenant")}</h2><p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-[1.6] text-white/70">{tx("Ton premier client est offert. Aucune carte requise. Sois en ligne dans 5 minutes.")}</p><Link href={signup} className="tap mt-8 inline-flex items-center justify-center gap-2 rounded-btn bg-brand px-8 py-4 text-[16px] font-semibold text-white shadow-[0_12px_44px_-8px_var(--color-brand)] transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98]">{tx("Créer mon espace coach")} <LIcon name="arrow" className="h-4 w-4" /></Link></div></Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex flex-col gap-2"><Link href="#top" className="text-white [&_span]:text-white"><Wordmark size={20} /></Link><p className="max-w-[42ch] text-[12.5px] leading-[1.6] text-white/45">{tx("La plateforme qui transforme les coachs et salles en marques de coaching digitales, propulsées par l'IA.")}</p></div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
            <Link href="/revendeurs" className="font-semibold text-brand transition-opacity hover:opacity-80">{tx("Programme revendeur")}</Link>
            <Link href="/inscription-coach" className="text-white/60 transition-colors hover:text-white">{tx("Créer mon espace")}</Link>
            <Link href="/connexion" className="text-white/60 transition-colors hover:text-white">{tx("Connexion")}</Link>
            <Link href="/cgv" className="text-white/60 transition-colors hover:text-white">CGV</Link>
            <Link href="/confidentialite" className="text-white/60 transition-colors hover:text-white">{tx("Confidentialité")}</Link>
          </nav>
        </div>
      </footer>

      {/* CTA collante mobile */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#080a0c]/92 px-4 py-3 backdrop-blur-xl sm:hidden"><Link href={signup} className="tap flex w-full items-center justify-center gap-2 rounded-btn bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98]">{tx("Démarrer gratuitement")} <LIcon name="arrow" className="h-4 w-4" /></Link></div>
    </div>
    </LocaleProvider>
  );
}
