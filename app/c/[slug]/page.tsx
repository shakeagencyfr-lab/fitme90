import type { CSSProperties } from "react";
import type { Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicOffersBySlug, type Offer, type PublicTenant } from "@/lib/offers";
import { programDaysForMonths, formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { GridScan, AppPreview, MacroOrbit } from "@/components/landing-visuals";
import { S } from "@/components/landing-icons";
import { SubscriptionPrice } from "@/components/subscription-price";

export const dynamic = "force-dynamic";
export const viewport: Viewport = { themeColor: "#0a0b0c" };

function durationText(months: number): string {
  const label = months === 12 ? "1 an" : `${months} mois`;
  return `${label} · ${programDaysForMonths(months)} jours`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) return { title: "Coach introuvable" };
  const t = data.tenant;
  return {
    title: `${t.headline || t.name} — Coaching`,
    description: t.tagline || `Programme de coaching personnalisé avec ${t.name}.`,
    icons: t.faviconUrl ? { icon: t.faviconUrl } : undefined,
  };
}

const features = [
  { icon: S.dumbbell, title: "La méthode de ton coach", body: "Ton programme est bâti sur la méthode de ton coach : exercices, séries, charges et progressions, pensés par lui." },
  { icon: S.camera, title: "Analyse de ta salle", body: "Photographie tes machines : le plan n'utilise que le matériel réellement disponible." },
  { icon: S.shield, title: "100 % personnalisé", body: "Pathologies, allergies, régime, cadre religieux : chaque contrainte est prise en compte." },
  { icon: S.ai, title: "Amplifié par l'IA", body: "Ton coach s'appuie sur une IA qu'il a entraînée sur sa façon de travailler pour bâtir ton plan plus vite et plus finement." },
  { icon: S.heart, title: "Zones cardiaques précises", body: "Tes zones d'intensité calculées pour tirer le meilleur de chaque séance de cardio." },
  { icon: S.grid, title: "Espace client complet", body: "Séances interactives, calendrier, journal, courbe de poids : tout ton suivi au même endroit." },
  { icon: S.timer, title: "Outils d'entraînement", body: "Minuteur de repos intégré, journal série par série (kg × reps), progression et coches." },
  { icon: S.chat, title: "Un assistant formé par ton coach", body: "Un assistant disponible en continu, entraîné sur la méthode de ton coach. Il répond, motive et t'accompagne au quotidien." },
];

const salleBullets = [
  "Haltères, barres, câbles, machines guidées",
  "Home-gym au matériel limité",
  "Salle communautaire ou hôtel",
  "Entraînement au poids du corps uniquement",
];

const steps = [
  { k: "01", title: "Réponds au questionnaire", body: "Objectifs, niveau, disponibilités, santé, allergies et préférences alimentaires." },
  { k: "02", title: "Photographie ta salle", body: "Le système lit le matériel disponible pour adapter chaque exercice à ce que tu as." },
  { k: "03", title: "Suis ton programme", body: "Ton plan t'attend dans ton espace client, séance par séance, jour après jour." },
];

const espaceBullets = [
  "Séances interactives",
  "Checklist des exercices",
  "Chronomètre & minuteur",
  "Nutrition du jour",
  "Suivi de progression",
  "Assistant IA en un tap",
];

const nutritionBullets = [
  "Halal / casher",
  "Végétarien / végétalien",
  "Allergies personnalisées",
  "Intolérances (lactose, gluten…)",
  "Recettes par semaine",
  "Macros journaliers",
];

const forWho = [
  { title: "Débutant complet", body: "On part de ta technique, sans te jeter dans le grand bain." },
  { title: "Une contrainte de santé", body: "Écran santé au départ, exercices adaptés, validation médecin au besoin." },
  { title: "Allergies, végé, halal, casher", body: "Tes contraintes alimentaires respectées dans toute la nutrition." },
  { title: "Peu de temps", body: "Tu choisis tes jours ; les séances sont calibrées pour ta réalité." },
  { title: "Salle ou maison", body: "On n'utilise que ton matériel, où que tu t'entraînes." },
  { title: "Repris après une pause", body: "Le cycle d'adaptation te remet en route sans te cramer." },
];

const faqs = [
  { q: "Faut-il une salle ou du matériel particulier ?", a: "Non. Tu photographies ce que tu as, salle complète, home-gym ou quelques haltères, et le programme se construit uniquement avec ce matériel." },
  { q: "Je suis débutant, est-ce adapté ?", a: "Oui. Le début du programme est dédié à la technique et à l'installation de l'habitude. On progresse ensuite graduellement." },
  { q: "Comment se passe le paiement ?", a: "Le paiement est unique et sécurisé par Stripe, directement auprès de ton coach. Aucun abonnement caché." },
  { q: "Qui conçoit vraiment le programme ?", a: "Ton coach. Le programme est bâti sur SA méthode ; il s'appuie sur une IA qu'il a entraînée sur sa façon de travailler. L'assistant IA prolonge cet accompagnement au quotidien, mais ne remplace pas ton coach ni un avis médical." },
  { q: "J'ai une blessure, une pathologie ou une grossesse ?", a: "Un écran santé au démarrage repère les situations à risque. Le programme est adapté ou mis en pause en attendant l'avis de ton médecin." },
  { q: "Que se passe-t-il après le programme ?", a: "Le coach IA se désactive à la fin, mais ton plan reste consultable un moment de plus en lecture seule." },
];

const sectionTitle =
  "font-archivo font-extrabold tracking-[-0.03em] text-white text-[clamp(30px,5.5vw,52px)] leading-[1.02] text-balance";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-brand/40 bg-brand/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
      {children}
    </span>
  );
}

function Brand({ tenant, imgClass = "h-11", textClass = "text-[20px]" }: { tenant: PublicTenant; imgClass?: string; textClass?: string }) {
  if (tenant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={tenant.logoUrl} alt={tenant.name} className={`${imgClass} w-auto max-w-[260px] object-contain`} />;
  }
  return <span className={`font-archivo ${textClass} font-extrabold tracking-[-0.02em] text-white`}>{tenant.name}</span>;
}

function OfferCard({ offer, slug, chargesEnabled }: { offer: Offer; slug: string; chargesEnabled: boolean }) {
  const isSub = offer.billing_type === "subscription";
  return (
    <article className="flex flex-col gap-5 rounded-card-lg border border-white/12 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7">
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
          {isSub ? "Abonnement" : durationText(offer.duration_months)}
        </span>
        <h3 className="font-archivo text-[22px] font-bold leading-tight tracking-[-0.02em] text-white">{offer.name}</h3>
      </div>

      {isSub ? (
        <SubscriptionPrice
          slug={slug}
          offerId={offer.id}
          priceMonthCents={offer.price_month_cents}
          priceYearCents={offer.price_year_cents}
          chargesEnabled={chargesEnabled}
        />
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="font-archivo text-[clamp(40px,7vw,56px)] font-extrabold leading-none tracking-[-0.03em] text-white">
              {formatEuros(offer.price_cents)}
            </span>
            <span className="pb-2 text-[13px] text-white/55">paiement unique</span>
          </div>
        </>
      )}

      <ul className="flex flex-col gap-2 border-t border-white/10 pt-4">
        {[
          "Programme conçu par ton coach",
          "Accompagnement nutritionnel",
          "Assistant IA inclus",
          ...(offer.vip_chat ? ["Chat VIP avec ton coach"] : []),
          "Espace client & suivi",
        ].map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-white/75">
            <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
            {it}
          </li>
        ))}
      </ul>

      {!isSub &&
        (chargesEnabled ? (
          <Link
            href={`/inscription?c=${slug}&offer=${offer.id}`}
            className="tap inline-flex h-[52px] items-center justify-center gap-2 rounded-btn bg-brand px-6 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
          >
            Choisir ce programme
            <S.arrow className="h-4.5 w-4.5" />
          </Link>
        ) : (
          <span className="inline-flex h-[52px] items-center justify-center rounded-btn border border-white/15 px-6 text-[14px] text-white/50">
            Bientôt disponible
          </span>
        ))}
    </article>
  );
}

export default async function CoachLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await publicOffersBySlug(slug);
  if (!data) notFound();

  const { tenant, offers } = data;
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const title = tenant.headline || tenant.name;
  const tagline =
    tenant.tagline ||
    "Un programme conçu selon la méthode de ton coach, adapté à ta salle et à tes contraintes, et suivi au quotidien. Amplifié par une IA qu'il a entraînée sur sa façon de travailler.";

  return (
    <div
      className="min-h-dvh scroll-smooth bg-[#0a0b0c] text-white [scrollbar-color:#333_#0a0b0c]"
      style={{ ["--color-brand" as string]: accent } as CSSProperties}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0b0c]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="#top" className="flex items-center"><Brand tenant={tenant} imgClass="h-11 sm:h-14" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/connexion" className="hidden text-[14px] text-white/70 transition-colors hover:text-white sm:inline">
              Se connecter
            </Link>
            {offers.length > 0 ? (
              <a href="#offres" className="tap inline-flex h-10 items-center rounded-btn bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
                Voir les programmes
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-[62%] overflow-hidden opacity-60 [mask-image:linear-gradient(to_left,#000,transparent)]">
            <div className="lv-grid-plane" />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-[#0a0b0c] via-[#0a0b0c]/85 to-transparent" />
          <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-brand/25 blur-[130px]" />
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-7 px-5 pb-24 pt-[clamp(48px,9vw,96px)] sm:px-8">
            <Chip><S.spark className="h-3.5 w-3.5" /> Coaching personnalisé</Chip>
            <h1 className="max-w-[16ch] font-archivo text-[clamp(42px,9vw,92px)] font-extrabold leading-[0.94] tracking-[-0.045em] text-balance text-white">
              {title}
            </h1>
            <p className="max-w-[54ch] text-[clamp(16px,2.2vw,20px)] leading-[1.55] text-white/70">{tagline}</p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
              {offers.length > 0 ? (
                <a href="#offres" className="tap inline-flex h-[54px] items-center justify-center gap-2 rounded-btn bg-brand px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                  Voir les programmes <S.arrow className="h-4.5 w-4.5" />
                </a>
              ) : null}
              <a href="#methode" className="tap inline-flex h-[54px] items-center justify-center rounded-btn border border-white/20 bg-white/5 px-8 text-[16px] font-semibold text-white transition-colors duration-150 hover:border-white/40 hover:bg-white/10">
                Comment ça marche
              </a>
            </div>
            <div className="flex flex-wrap gap-x-7 gap-y-3 pt-3">
              {["Santé prise en compte", "Allergies & régimes", "Coach IA inclus"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-[13.5px] text-white/65">
                  <S.check className="h-4 w-4 text-brand" /> {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Bandeau repères */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-y-6 px-5 py-8 sm:px-8 lg:grid-cols-4">
            {[
              { v: "Ton coach", l: "conçoit ta méthode" },
              { v: "100 %", l: "adapté à ta salle & ta santé" },
              { v: "Assistant IA", l: "formé par ton coach, inclus" },
              { v: "0", l: "abonnement, paiement unique" },
            ].map((s) => (
              <div key={s.l} className="flex flex-col gap-1 px-2">
                <div className="font-archivo text-[clamp(24px,4vw,34px)] font-extrabold leading-none tracking-[-0.03em] text-white">{s.v}</div>
                <div className="text-[13px] leading-[1.4] text-white/55">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Fonctionnalités */}
        <section className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Chip>Fonctionnalités</Chip>
              <h2 className={sectionTitle}>Tout ce qu&apos;il faut pour réussir</h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <div key={f.title} className={`flex flex-col gap-4 rounded-card border p-6 transition-colors ${i === 2 ? "border-brand/50 bg-brand/[0.06]" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] border border-brand/30 bg-brand/10 text-brand">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-archivo text-[18px] font-bold leading-snug tracking-[-0.01em] text-white">{f.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-white/60">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Analyse de la salle */}
        <section className="border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(56px,8vw,96px)] sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Chip><S.camera className="h-3.5 w-3.5" /> Analyse IA de ta salle</Chip>
              <h2 className="font-archivo text-[clamp(28px,4.5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Ta salle analysée. Ton programme adapté.
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/65">
                Photographie ta salle : l&apos;IA identifie le matériel disponible et s&apos;assure que chaque exercice de ton programme est réalisable avec ce que tu as.
              </p>
              <ul className="flex flex-col gap-2.5 pt-1">
                {salleBullets.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-[15px] text-white/75">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /> {b}
                  </li>
                ))}
              </ul>
            </div>
            <GridScan label="IA en cours d'analyse, matériel détecté" />
          </div>
        </section>

        {/* Espace client */}
        <section id="espace" className="scroll-mt-24">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(56px,8vw,96px)] sm:px-8 lg:grid-cols-2">
            <div className="order-2 lg:order-1"><AppPreview /></div>
            <div className="order-1 flex flex-col gap-5 lg:order-2">
              <Chip><S.grid className="h-3.5 w-3.5" /> Espace client</Chip>
              <h2 className="font-archivo text-[clamp(28px,4.5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Ton programme, vivant au quotidien.
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/65">
                Plus qu&apos;un document, ton programme est interactif. Coche tes exercices, lance ton chronomètre, consulte ta nutrition et dialogue avec ton coach IA.
              </p>
              <ul className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {espaceBullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-white/75">
                    <S.check className="h-4.5 w-4.5 shrink-0 text-brand" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Nutrition */}
        <section className="border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(56px,8vw,96px)] sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Chip>Nutrition</Chip>
              <h2 className="font-archivo text-[clamp(28px,4.5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                Une nutrition aussi précise que ton entraînement.
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/65">
                Calories, macros, timing des repas et recettes adaptées. Tes allergies, intolérances et ton cadre religieux (halal, casher, végétarien…) pris en compte.
              </p>
              <ul className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {nutritionBullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-white/75">
                    <S.check className="h-4.5 w-4.5 shrink-0 text-brand" /> {b}
                  </li>
                ))}
              </ul>
            </div>
            <MacroOrbit />
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="methode" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Chip>Comment ça marche</Chip>
              <h2 className={sectionTitle}>3 étapes vers ta transformation</h2>
            </div>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.k} className="flex flex-col gap-3">
                  <div className="font-archivo text-[64px] font-extrabold leading-none tracking-[-0.04em] text-white/10">{s.k}</div>
                  <h3 className="font-archivo text-[20px] font-bold tracking-[-0.02em] text-white">{s.title}</h3>
                  <p className="text-[15px] leading-[1.6] text-white/60">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Est-ce pour toi */}
        <section className="scroll-mt-24 border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <h2 className={`${sectionTitle} max-w-[16ch]`}>Est-ce pour toi ?</h2>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {forWho.map((w) => (
                <div key={w.title} className="flex items-start gap-3 rounded-card border border-white/10 bg-white/[0.03] p-5">
                  <S.check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div className="flex flex-col gap-1">
                    <div className="font-archivo text-[15.5px] font-semibold leading-snug text-white">{w.title}</div>
                    <div className="text-[13.5px] leading-[1.55] text-white/55">{w.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* À propos (optionnel) */}
        {tenant.aboutEnabled && (tenant.aboutText || tenant.aboutPhotoUrl) ? (
          <section className="scroll-mt-24">
            <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(64px,9vw,110px)] sm:px-8 lg:grid-cols-[minmax(0,320px)_1fr]">
              {tenant.aboutPhotoUrl ? (
                <div className="mx-auto w-full max-w-[320px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tenant.aboutPhotoUrl}
                    alt={tenant.aboutTitle || tenant.name}
                    className="aspect-square w-full rounded-card-lg border border-white/12 object-cover"
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-5">
                <Chip>À propos</Chip>
                <h2 className="font-archivo text-[clamp(28px,4.5vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white">
                  {tenant.aboutTitle || tenant.name}
                </h2>
                {tenant.aboutText ? (
                  <div className="flex max-w-[60ch] flex-col gap-3 text-[16px] leading-[1.7] text-white/70">
                    {tenant.aboutText.split(/\n{2,}|\n/).filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* Offres */}
        <section id="offres" className="scroll-mt-20 border-t border-white/10 bg-white/[0.015]">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Chip>Programmes</Chip>
              <h2 className={sectionTitle}>Choisis ton programme</h2>
            </div>
            {offers.length === 0 ? (
              <div className="mx-auto mt-10 max-w-[520px] rounded-card border border-white/10 bg-white/[0.03] p-6 text-center text-[15px] text-white/60">
                Aucune offre disponible pour le moment. Reviens bientôt.
              </div>
            ) : (
              <div className={`mx-auto mt-12 grid max-w-[900px] gap-5 ${offers.length === 1 ? "sm:max-w-[440px]" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
                {offers.map((o) => (
                  <OfferCard key={o.id} offer={o} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-white/10">
          <div className="mx-auto w-full max-w-[820px] px-5 py-[clamp(64px,9vw,110px)] sm:px-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <Chip>FAQ</Chip>
              <h2 className={sectionTitle}>Questions fréquentes</h2>
            </div>
            <div className="mt-10 overflow-hidden rounded-card border border-white/10 bg-white/[0.03]">
              {faqs.map((f, i) => (
                <details key={f.q} className={`group ${i > 0 ? "border-t border-white/10" : ""}`}>
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-[18px] font-archivo text-[15.5px] font-semibold leading-snug text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <S.chevron className="h-4.5 w-4.5 shrink-0 text-white/50 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 text-[14px] leading-[1.65] text-white/60">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative isolate overflow-hidden border-t border-white/10">
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-brand/20 blur-[140px]" />
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-7 px-5 py-[clamp(72px,11vw,130px)] text-center sm:px-8">
            <h2 className="max-w-[18ch] font-archivo text-[clamp(32px,6vw,60px)] font-extrabold leading-[1.0] tracking-[-0.035em] text-balance text-white">
              Ta transformation commence aujourd&apos;hui.
            </h2>
            {offers.length > 0 ? (
              <a href="#offres" className="tap inline-flex h-[56px] items-center justify-center gap-2 rounded-btn bg-brand px-9 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                Voir les programmes <S.arrow className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-12 sm:px-8">
          <Brand tenant={tenant} imgClass="h-10" textClass="text-[18px]" />
          <p className="max-w-[70ch] text-[13px] leading-[1.6] text-white/50">
            Accompagnement sportif et de bien-être, sans visée thérapeutique. L&apos;accompagnement nutritionnel est une aide au choix des repas, pas une prescription diététique. Ne remplace pas un avis médical.
          </p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[13px] text-white/50">
            <Link href="/connexion" className="transition-colors hover:text-white">Connexion</Link>
            <Link href="/mentions-legales" className="transition-colors hover:text-white">Mentions légales</Link>
            <Link href="/confidentialite" className="transition-colors hover:text-white">Confidentialité</Link>
            <Link href="/cgv" className="transition-colors hover:text-white">CGV</Link>
          </nav>
          <p className="pt-1 text-[12px] text-white/35">
            Propulsé par <span className="font-archivo font-bold text-white/60">FitMe</span>
            <span className="font-archivo font-bold text-brand">90</span>.
          </p>
        </div>
      </footer>
    </div>
  );
}
