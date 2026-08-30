import type { Viewport } from "next";
import Link from "next/link";
import { AppPreview } from "@/components/landing-visuals";
import { LandingHeader } from "@/components/landing-header";

// Landing B2B (thème sombre « premium ») : vend l'outil FitMe90 aux COACHS et
// aux SALLES. Le parcours client (achat d'un programme) vit sur la page de
// chaque coach (/c/<slug>), plus sur cette page racine.
export const viewport: Viewport = { themeColor: "#0a0b0c" };

export const metadata = {
  title: "FitMe90, ton app de coaching en marque blanche",
  description:
    "Lance ton coaching sportif en ligne avec ta propre app en marque blanche : programmes générés par IA, suivi nutrition, chat coach IA, paiements et CRM. Tu gardes ta marque, tes clients et tes marges.",
};

type IconProps = { className?: string };

const Icon = {
  whitelabel: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 15l2-6 2 4 1.5-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ai: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M12 4l1.4 3.6L17 9l-3.6 1.4L12 14l-1.4-3.6L7 9l3.6-1.4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18 15l.7 1.8L20.5 17.5l-1.8.7L18 20l-.7-1.8L15.5 17.5l1.8-.7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  nutrition: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M12 20c-3.5 0-6-3.4-6-7.5C6 8.5 8.5 6 12 7c3.5-1 6 1.5 6 5.5C18 16.6 15.5 20 12 20Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 7V4M12 4c0-.8.7-1.5 1.8-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  chat: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M5 5.5h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9l-4 3.5V6.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 10.5h7M8.5 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  card: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17M7 14.5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  crm: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 19a5 5 0 0 1 10 0M15 7a3 3 0 0 1 0 6M20 19a5 5 0 0 0-3.5-4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  key: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11l8 8M16 16l2-2M14 14l2.5-2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  bell: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M12 4a5 5 0 0 0-5 5v3.5L5.5 15h13L17 12.5V9a5 5 0 0 0-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  arrow: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={p.className} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const FEATURES: { icon: (p: IconProps) => React.ReactElement; title: string; desc: string }[] = [
  {
    icon: Icon.whitelabel,
    title: "Ton app en marque blanche",
    desc: "Ton nom, ton logo, tes couleurs, ta propre adresse. Tes clients installent TON app, jamais celle d'un concurrent.",
  },
  {
    icon: Icon.ai,
    title: "Programmes générés par IA",
    desc: "Un programme d'entraînement périodisé sur 90 jours (3 cycles), adapté au profil, au matériel et à l'objectif de chaque client.",
  },
  {
    icon: Icon.nutrition,
    title: "Nutrition & recettes",
    desc: "Besoins caloriques, macros par jour, recettes générées et liste de courses. Filtrage des allergènes et du régime.",
  },
  {
    icon: Icon.chat,
    title: "Coach IA 24/7",
    desc: "Un assistant qui répond à tes clients à ta place, sous ton prénom : exercices, substitutions, repas, motivation.",
  },
  {
    icon: Icon.card,
    title: "Paiements intégrés",
    desc: "Paiement unique ou abonnement via Stripe, codes promo et cartes cadeaux. L'argent arrive directement chez toi.",
  },
  {
    icon: Icon.crm,
    title: "CRM & suivi clients",
    desc: "Tableau de bord de tes clients, progression, assiduité, messages VIP et notifications push, en un coup d'œil.",
  },
];

const STEPS: { n: string; title: string; desc: string }[] = [
  {
    n: "1",
    title: "Crée ton espace",
    desc: "Inscription en quelques minutes. Tu personnalises ta marque (nom, logo, couleurs) et ton adresse.",
  },
  {
    n: "2",
    title: "Connecte ton IA",
    desc: "Tu renseignes ta clé Anthropic : l'IA tourne sur ta clé, tu gardes la main sur les coûts et tes données.",
  },
  {
    n: "3",
    title: "Tes clients s'abonnent",
    desc: "Tu partages ta page. Tes clients répondent au questionnaire, paient et reçoivent leur programme automatiquement.",
  },
];

// Ce qui est inclus, mis en avant dans le bloc tarif. Le prix lui-même n'est
// PAS figé : il est paramétrable par compte (1er client offert, puis paliers
// selon le nombre de comptes actifs). Les montants seront réglés côté espace.
const INCLUDED = [
  "App en marque blanche",
  "Programmes IA + nutrition",
  "Coach IA 24/7",
  "Paiements Stripe + codes promo",
  "CRM & notifications push",
  "Sans engagement",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Qu'est-ce que la marque blanche exactement ?",
    a: "Tes clients utilisent une app à TON nom, avec ton logo et tes couleurs, sur ta propre adresse. FitMe90 reste invisible : c'est ton produit.",
  },
  {
    q: "Qui paie l'intelligence artificielle ?",
    a: "Toi, via ta propre clé Anthropic (BYOK). L'IA tourne sur ta clé : tu maîtrises tes coûts et tes données, et notre abonnement reste un tarif fixe sans surprise.",
  },
  {
    q: "Est-ce que je garde mes clients et mes paiements ?",
    a: "Oui. Les paiements de tes clients arrivent directement sur ton compte Stripe. Tes clients sont les tiens, tu peux les exporter à tout moment.",
  },
  {
    q: "Faut-il des compétences techniques ?",
    a: "Non. Tout se configure depuis un tableau de bord : marque, offres, méthode d'entraînement, tarifs. Aucune ligne de code.",
  },
  {
    q: "Puis-je adapter la méthode d'entraînement ?",
    a: "Oui. Tu peux laisser l'IA appliquer une base evidence-based, ou lui donner TA méthode de coach qu'elle suivra pour tous tes programmes.",
  },
];

export default function Home() {
  return (
    <div id="top" className="min-h-dvh bg-[#0a0b0c] text-white">
      <LandingHeader />

      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-10%,rgba(224,85,31,0.22),transparent)]" />
        <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-pill border border-white/15 bg-white/5 px-3 py-1.5 text-[12.5px] font-medium text-white/75">
              <span className="size-1.5 rounded-full bg-brand" />
              Plateforme de coaching en marque blanche
            </span>
            <h1 className="font-archivo text-[clamp(34px,7vw,60px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              Ta propre app de coaching, <span className="text-brand">prête à vendre</span>.
            </h1>
            <p className="max-w-[52ch] text-[16.5px] leading-[1.6] text-white/70">
              Lance ton coaching sportif en ligne avec une app à ton nom : programmes générés par IA,
              suivi nutrition, coach IA 24/7, paiements et CRM. Tu gardes ta marque, tes clients et tes marges.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/inscription-coach"
                className="tap inline-flex items-center justify-center gap-1.5 rounded-btn bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
              >
                Créer mon espace coach
                <Icon.arrow className="h-4 w-4" />
              </Link>
              <a
                href="#formules"
                className="tap inline-flex items-center justify-center rounded-btn border border-white/20 bg-white/5 px-6 py-3.5 text-[15px] font-semibold text-white/90 transition-colors hover:border-white/40"
              >
                Voir le tarif
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/55">
              <span className="inline-flex items-center gap-1.5"><Icon.check className="h-4 w-4 text-brand" /> Sans engagement</span>
              <span className="inline-flex items-center gap-1.5"><Icon.check className="h-4 w-4 text-brand" /> Aucune ligne de code</span>
              <span className="inline-flex items-center gap-1.5"><Icon.check className="h-4 w-4 text-brand" /> Ta marque, tes clients</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[360px]">
            <AppPreview />
          </div>
        </div>
      </section>

      {/* ───────── Problème → solution ───────── */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid w-full max-w-[1120px] gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">
          {[
            ["Créer une app coûte cher", "Développer une app, une IA, un système de paiement : des mois de travail et des milliers d'euros. Ici, c'est prêt."],
            ["Les outils génériques diluent ta marque", "Sur les plateformes classiques, tes clients voient le logo d'un autre. En marque blanche, ils ne voient que toi."],
            ["Gérer manuellement ne scale pas", "Programmes, relances, nutrition, questions : l'IA et l'automatisation font le gros du travail pendant que tu coaches."],
          ].map(([t, d]) => (
            <div key={t} className="flex flex-col gap-2">
              <h3 className="font-archivo text-[17px] font-bold text-white">{t}</h3>
              <p className="text-[14.5px] leading-[1.6] text-white/60">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Fonctionnalités ───────── */}
      <section id="fonctionnalites" className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 flex flex-col gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">Tout inclus</span>
          <h2 className="max-w-[20ch] font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Une plateforme complète, sous ta marque
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 rounded-card border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-white/20">
              <span className="flex size-11 items-center justify-center rounded-control bg-brand/15 text-brand">
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="font-archivo text-[17px] font-bold text-white">{f.title}</h3>
              <p className="text-[14px] leading-[1.6] text-white/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Comment ça marche ───────── */}
      <section id="methode" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="mb-10 flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">En 3 étapes</span>
            <h2 className="font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              Opérationnel aujourd&apos;hui
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3 rounded-card border border-white/10 bg-white/[0.03] p-6">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand font-archivo text-[17px] font-bold text-white">
                  {s.n}
                </span>
                <h3 className="font-archivo text-[18px] font-bold text-white">{s.title}</h3>
                <p className="text-[14px] leading-[1.6] text-white/60">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-card border border-white/10 bg-white/[0.03] p-5 text-[14px] text-white/70">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand/15 text-brand">
              <Icon.key className="h-5 w-5" />
            </span>
            <p>
              <span className="font-semibold text-white">BYOK (Bring Your Own Key)</span> : l&apos;IA tourne sur ta
              propre clé Anthropic. Tu restes maître de tes coûts et de tes données, sans marge cachée sur l&apos;IA.
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Tarif ───────── */}
      <section id="formules" className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 flex flex-col gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">Tarif</span>
          <h2 className="font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Ton premier client est offert
          </h2>
          <p className="max-w-[60ch] text-[14.5px] leading-[1.6] text-white/60">
            Ensuite, un tarif simple selon le nombre de comptes actifs : tu ne paies que ce que tu utilises,
            sans engagement. Tu fixes librement les prix que tu factures à tes clients.
          </p>
        </div>
        <div className="grid items-center gap-6 rounded-[20px] border border-white/10 bg-white/[0.03] p-6 sm:p-9 lg:grid-cols-[1fr_1px_1fr]">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2">
              <span className="font-archivo text-[44px] font-extrabold leading-none tracking-[-0.02em] text-white">0 €</span>
              <span className="text-[14px] text-white/55">pour ton 1<sup>er</sup> client</span>
            </div>
            <p className="text-[14px] leading-[1.6] text-white/60">
              Puis une tarification à l&apos;usage, par palier selon tes comptes actifs. Les montants se règlent
              depuis ton espace.
            </p>
            <Link
              href="/inscription-coach"
              className="tap inline-flex w-fit items-center justify-center gap-1.5 rounded-btn bg-brand px-6 py-3.5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
            >
              Créer mon espace
              <Icon.arrow className="h-4 w-4" />
            </Link>
          </div>
          <div className="hidden h-full w-px bg-white/10 lg:block" />
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {INCLUDED.map((ft) => (
              <li key={ft} className="flex items-start gap-2.5 text-[14px] text-white/80">
                <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {ft}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-5 text-center text-[12.5px] text-white/40">
          Ta clé IA (Anthropic) est facturée séparément à l&apos;usage, sur ta propre clé.
        </p>
      </section>

      {/* ───────── FAQ ───────── */}
      <section id="faq" className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto w-full max-w-[820px] px-5 py-16 sm:px-8 sm:py-24">
          <h2 className="mb-8 font-archivo text-[clamp(24px,4vw,34px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Questions fréquentes
          </h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-card border border-white/10 bg-white/[0.03] p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="font-archivo text-[16px] font-semibold text-white">{item.q}</span>
                  <span className="text-white/40 transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-[1.65] text-white/65">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA final ───────── */}
      <section id="demarrer" className="mx-auto w-full max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-brand/25 to-white/[0.03] p-8 text-center sm:p-14">
          <h2 className="mx-auto max-w-[22ch] font-archivo text-[clamp(26px,4.5vw,40px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Lance ton coaching en marque blanche
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-[15.5px] leading-[1.6] text-white/70">
            Crée ton espace, personnalise ta marque et commence à vendre tes programmes cette semaine.
          </p>
          <Link
            href="/inscription-coach"
            className="tap mt-7 inline-flex items-center justify-center gap-1.5 rounded-btn bg-brand px-7 py-3.5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
          >
            Créer mon espace coach
            <Icon.arrow className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="font-archivo text-[18px] font-extrabold tracking-[-0.02em] text-white">
            FitMe<span className="text-brand">90</span>
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/55">
            <a href="#fonctionnalites" className="hover:text-white">Fonctionnalités</a>
            <a href="#formules" className="hover:text-white">Tarif</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link href="/connexion" className="hover:text-white">Connexion</Link>
            <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
            <Link href="/cgv" className="hover:text-white">CGV</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
