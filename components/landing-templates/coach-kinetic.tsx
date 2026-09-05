"use client";

import type { CSSProperties } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/mobile-nav";
import Link from "next/link";
import { type Offer, type PublicTenant } from "@/lib/offers";
import { formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { S } from "@/components/landing-icons";
import { OfferPrice } from "@/components/offer-price";
import { Reveal, RevealGroup } from "@/components/reveal";
import {
  ScrollProgress,
  HorizontalPin,
  Parallax,
  SplitWords,
  Counter,
  Spotlight,
  Tilt,
  ScrollMarquee,
} from "@/components/landing-templates/scroll-fx";
import { LeadBand } from "@/components/landing-templates/lead-band";
import { TestimonialBand } from "@/components/landing-templates/testimonial-band";
import { AuthorEngine } from "@/components/landing-templates/author-engine";
import { offerCardCopy, landingCopy, type LandingCopy, type Audience } from "@/components/landing-templates/coach-copy";
import { makeT, type Locale } from "@/lib/i18n";
import { themeVars, themeAttrs } from "@/lib/theme";

// Template « Kinetic » : la version démonstrative.
//
// Le principe : on descend, et par moments la page part sur le côté. Deux
// sections sont ÉPINGLÉES et traversées horizontalement (les fonctionnalités,
// puis la méthode). Entre les deux, du texte qui s'assemble mot à mot, des
// chiffres qui montent, un halo qui suit le curseur et de la parallaxe.
//
// Trois limites tenues volontairement :
//   - le détournement du défilement s'arrête sous 1024 px et sans pointeur
//     fin : bloquer le scroll vertical d'un téléphone fait fuir un visiteur,
//     donc les mêmes contenus y deviennent des rails glissés au doigt
//   - tout se coupe si le visiteur a demandé moins de mouvement, et le contenu
//     s'affiche alors dans son état final, pas figé à mi-course
//   - une seule lecture de position par frame pour toute la page (voir
//     scroll-fx), sinon six effets simultanés font saccader un portable

const BG = "#08090b";
const INK = "#eceef1";

const title = "font-archivo font-extrabold tracking-[-0.035em] leading-[0.94] text-balance";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-brand/40 bg-brand/10 px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-brand">
      {children}
    </span>
  );
}

function Brand({ tenant, imgClass = "h-11", textClass = "text-[20px]" }: { tenant: PublicTenant; imgClass?: string; textClass?: string }) {
  if (tenant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={tenant.logoUrl} alt={tenant.name} className={`${imgClass} w-auto max-w-[260px] object-contain`} />;
  }
  return <span className={`font-archivo ${textClass} truncate whitespace-nowrap font-extrabold tracking-[-0.02em] text-white`}>{tenant.name}</span>;
}

function AppCard({ name, L }: { name: string; L: LandingCopy }) {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="rounded-[26px] border border-white/12 bg-white/[0.04] p-3.5 backdrop-blur-xl">
        <div className="rounded-[20px] bg-[#0d0f12] p-4">
          <div className="flex items-center justify-between">
            <span className="font-archivo text-[13px] font-bold text-white">{name}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-brand/20 text-brand"><S.spark className="h-4 w-4" /></span>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">
              <span>{L.mockSession}</span><span className="text-brand">{L.mockDay}</span>
            </div>
            <ul className="mt-2.5 flex flex-col gap-2">
              {[["Développé couché", "4 × 8"], ["Tirage vertical", "4 × 10"], ["Élévations latérales", "3 × 15"]].map(([ex, sr], i) => (
                <li key={ex} className="flex items-center gap-2.5 text-[13px] text-white/80">
                  <span className={`flex size-5 items-center justify-center rounded-md ${i < 2 ? "bg-brand text-white" : "border border-white/20 text-transparent"}`}><S.check className="h-3 w-3" /></span>
                  <span className="flex-1">{ex}</span>
                  <span className="font-mono text-[11px] text-white/35">{sr}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["Prot.", "156 g"], ["Gluc.", "210 g"], ["Lip.", "62 g"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center">
                <div className="font-archivo text-[15px] font-extrabold text-white">{v}</div>
                <div className="text-[10px] text-white/35">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer, offers, slug, chargesEnabled, locale, audience }: { offer: Offer; offers: Offer[]; slug: string; chargesEnabled: boolean; locale: Locale; audience: Audience }) {
  const copy = offerCardCopy(offer, offers, makeT(locale));
  const L = landingCopy(locale, audience);
  const featured = copy.featured;
  return (
    <Tilt className="h-full">
      <article className={`relative flex h-full flex-col gap-5 rounded-[26px] border p-7 backdrop-blur-xl ${featured ? "border-brand/60 bg-brand/[0.07]" : "border-white/12 bg-white/[0.03]"}`}>
        {featured ? (
          <span className="absolute -top-3 left-7 rounded-pill bg-brand px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
            {L.mostChosen}
          </span>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">{copy.eyebrow}</span>
          <h3 className="font-archivo text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-white">{offer.name}</h3>
          {copy.pitch ? <p className="text-[14px] leading-[1.5] text-white/55">{copy.pitch}</p> : null}
        </div>

        <OfferPrice
          slug={slug}
          offerId={offer.id}
          onceCents={offer.price_cents}
          monthlyCents={offer.price_month_cents}
          months={offer.duration_months}
          chargesEnabled={chargesEnabled}
          variant="dark"
          labels={{
            oneTime: L.oneTime,
            perMonthOn: copy.perMonthCents > 0 ? L.perMonthOn(formatEuros(copy.perMonthCents), offer.duration_months) : null,
            payOnce: L.payOnce,
            payInstallments: L.payInstallments(offer.duration_months),
            perMonthTimes: L.perMonthTimes(offer.duration_months),
            autoStop: L.autoStop(offer.duration_months),
            totalOver: offer.price_month_cents != null ? L.totalOver(formatEuros(offer.price_month_cents * offer.duration_months), offer.duration_months) : null,
            choose: L.choose,
            soon: L.soon,
          }}
        >

        <ul className="flex flex-1 flex-col gap-2 border-t border-white/12 pt-4">
          {copy.bullets.map((it) => (
            <li key={it} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-white/70">
              <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
              {it}
            </li>
          ))}
        </ul>

        </OfferPrice>
      </article>
    </Tilt>
  );
}

export function CoachKinetic({ tenant, offers, leadMagnet = false, locale = "fr" }: { tenant: PublicTenant; offers: Offer[]; leadMagnet?: boolean; locale?: Locale }) {
  const L = landingCopy(locale, tenant.businessType);
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const heading = tenant.headline || tenant.name;
  const tagline = tenant.tagline || L.defaultTagline;
  const slide = locale === "en" ? "Swipe" : "Fais glisser";

  return (
    <div
      className="relative min-h-dvh scroll-smooth pb-[76px] sm:pb-0"
      style={
        {
          ...themeVars(tenant.theme),
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #fff)`,
          ["--color-ink" as string]: INK,
          backgroundColor: BG,
          color: INK,
        } as CSSProperties
      }
      {...themeAttrs(tenant.theme)}
    >
      <ScrollProgress />
      <Spotlight />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#08090b]">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="#top" className="flex min-w-0 items-center"><Brand tenant={tenant} imgClass="h-11 sm:h-14" textClass="text-[17px] sm:text-[20px]" /></Link>
          <nav className="hidden items-center gap-6 md:flex">
            {[["#auteur", L.navMethod], ["#offres", L.navPrograms], ["#faq", L.navFaq]].map(([href, label]) => (
              <a key={href} href={href} className="underline-grow text-[14px] text-white/55 transition-colors hover:text-white">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden h-5 w-px bg-white/15 md:block" aria-hidden />
            <MobileNav
              className="md:hidden"
              brand={<Brand tenant={tenant} imgClass="h-11" textClass="text-[17px]" />}
              tone="dark"
              bg="#08090b"
              radius={12}
              langLabel={locale === "en" ? "Language" : "Langue"}
              links={[
                { href: "#auteur", label: L.navMethod },
                { href: "#offres", label: L.navPrograms },
                { href: "#faq", label: L.navFaq },
              ]}
              login={{ href: `/connexion?c=${tenant.slug}`, label: L.login }}
              cta={offers.length > 0 ? { href: "#offres", label: L.seePrograms } : undefined}
            />
            <span className="hidden md:block"><LangSwitch compact tone="dark" /></span>
            <Link href={`/connexion?c=${tenant.slug}`} className="hidden text-[14px] text-white/60 transition-colors hover:text-white sm:inline">{L.login}</Link>
            {offers.length > 0 ? (
              <a href="#offres" className="press tap hidden h-10 shrink-0 items-center whitespace-nowrap rounded-btn bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover sm:inline-flex">
                {L.seePrograms}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top" className="relative z-[1]">
        {/* Hero : titre assemblé mot à mot, halos en parallaxe */}
        <section className="relative overflow-hidden">
          <Parallax speed={0.3} className="pointer-events-none absolute -left-[15%] top-[-10%] h-[560px] w-[560px] rounded-full blur-[130px]">
            <div className="h-full w-full" style={{ background: `color-mix(in srgb, ${accent} 30%, transparent)` }} />
          </Parallax>
          <Parallax speed={-0.2} className="pointer-events-none absolute -right-[10%] top-[20%] h-[420px] w-[420px] rounded-full blur-[140px]">
            <div className="h-full w-full" style={{ background: "rgba(120,160,255,.18)" }} />
          </Parallax>

          <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-20 pt-[clamp(48px,8vw,110px)] sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Reveal><Tag><S.spark className="h-3.5 w-3.5" /> {L.heroChip}</Tag></Reveal>
              <SplitWords
                as="h1"
                text={heading}
                step={55}
                className={`${title} mt-6 block max-w-[15ch] text-[clamp(44px,9vw,96px)] text-white`}
              />
              <Reveal delay={140}>
                <p className="mt-7 max-w-[52ch] text-[clamp(16px,2.2vw,19px)] leading-[1.65] text-white/60">{tagline}</p>
              </Reveal>
              <Reveal delay={200}>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {offers.length > 0 ? (
                    <a href="#offres" className="press tap inline-flex h-[58px] items-center justify-center gap-2 rounded-btn bg-brand px-9 text-[16px] font-semibold text-white shadow-[0_18px_50px_-14px_var(--color-brand)] hover:bg-brand-hover">
                      {L.seePrograms} <S.arrow className="h-5 w-5" />
                    </a>
                  ) : null}
                  {leadMagnet ? (
                    <a href="#offert" className="press tap inline-flex h-[58px] items-center justify-center rounded-btn border border-white/20 px-9 text-[16px] font-semibold text-white transition-colors hover:border-white/55">
                      {L.heroLead}
                    </a>
                  ) : null}
                  <a href="#auteur" className="press tap inline-flex h-[58px] items-center justify-center rounded-btn border border-white/20 px-9 text-[16px] font-semibold text-white transition-colors hover:border-white/55">
                    {L.howItWorks}
                  </a>
                </div>
              </Reveal>
            </div>
            <Reveal delay={160} direction="scale">
              <Parallax speed={0.1}><AppCard name={tenant.name} L={L} /></Parallax>
            </Reveal>
          </div>
        </section>

        {/* Bandeau : avance seul, à vitesse constante */}
        <div className="border-y border-white/10 bg-white/[0.02] py-4">
          <ScrollMarquee items={[...L.heroChecks, ...L.stats.map((s) => s.l)]} className="font-mono text-[12px] uppercase tracking-[0.2em] text-white/40" />
        </div>

        {/* Chiffres qui montent */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-2 gap-y-8 px-5 py-14 sm:px-8 lg:grid-cols-4">
            {[
              { v: 12, s: locale === "en" ? " weeks" : " semaines", l: locale === "en" ? "of programming" : "de programmation" },
              { v: 100, s: " %", l: locale === "en" ? "fitted to your gym" : "adapté à ta salle" },
              { v: 7, s: "/7", l: locale === "en" ? "your coach's method, on tap" : "la méthode de ton coach, à la demande" },
              { v: 4, s: "", l: locale === "en" ? "blocks that learn from you" : "blocs qui apprennent de toi" },
            ].map((k) => (
              <Reveal key={k.l} className="flex flex-col gap-2 px-2">
                <div className="font-archivo text-[clamp(34px,5.5vw,58px)] font-extrabold leading-none tracking-[-0.04em] text-white">
                  <Counter to={k.v} suffix={k.s} />
                </div>
                <div className="text-[13px] leading-[1.45] text-white/45">{k.l}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Traversée horizontale n°1 : les fonctionnalités ── */}
        <section className="relative border-b border-white/10">
          <HorizontalPin
            panels={L.features.length * 0.55}
            hint={slide}
            heading={
              <div className="flex flex-col items-start gap-4">
                <Tag>{L.featuresChip}</Tag>
                <SplitWords as="h2" text={L.featuresTitle} className={`${title} max-w-[18ch] text-[clamp(28px,4.2vw,46px)] text-white`} />
              </div>
            }
          >
            {L.features.map((f, i) => (
              <article
                key={f.title}
                className={`flex min-h-[300px] w-[300px] shrink-0 flex-col gap-4 rounded-[24px] border p-7 backdrop-blur-xl sm:w-[340px] ${i === 3 ? "border-brand/50 bg-brand/[0.07]" : "border-white/12 bg-white/[0.03]"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand/15 text-brand">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.16em] text-white/25">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-archivo text-[19px] font-extrabold leading-snug tracking-[-0.01em] text-white">{f.title}</h3>
                <p className="text-[14px] leading-[1.6] text-white/55">{f.body}</p>
                <span aria-hidden className="mt-auto h-px w-10 bg-brand/40" />
              </article>
            ))}
          </HorizontalPin>
        </section>

        {/* ── Traversée horizontale n°2 : la méthode, en grand ── */}
        <section id="methode" className="relative scroll-mt-24 border-b border-white/10">
          <HorizontalPin
            panels={2.2}
            hint={slide}
            heading={<SplitWords as="h2" text={L.stepsTitle} className={`${title} max-w-[16ch] text-[clamp(28px,4.2vw,46px)] text-white`} />}
          >
            {L.steps.map((s) => (
              <article key={s.k} className="flex w-[80vw] shrink-0 flex-col justify-center gap-5 rounded-[28px] border border-white/12 bg-white/[0.03] p-10 backdrop-blur-xl sm:w-[46vw]">
                <div className="font-archivo text-[clamp(64px,9vw,120px)] font-extrabold leading-none tracking-[-0.05em] text-brand/25">{s.k}</div>
                <h3 className="font-archivo text-[clamp(22px,2.6vw,32px)] font-extrabold leading-tight tracking-[-0.02em] text-white">{s.title}</h3>
                <p className="max-w-[46ch] text-[16px] leading-[1.7] text-white/55">{s.body}</p>
              </article>
            ))}
          </HorizontalPin>
        </section>

        {/* Qui signe, et ce que le moteur apporte */}
        <AuthorEngine L={L} name={tenant.name} tone="dark" />

        {/* Est-ce pour toi */}
        <section className="border-t border-white/10 py-[clamp(56px,8vw,104px)]">
          <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
            <Reveal><SplitWords as="h2" text={L.forWhoTitle} className={`${title} max-w-[16ch] text-[clamp(28px,4.4vw,48px)] text-white`} /></Reveal>
            <RevealGroup className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" step={60}>
              {L.forWho.map((w) => (
                <Tilt key={w.title} max={5} className="h-full">
                  <div className="flex h-full items-start gap-3 rounded-[20px] border border-white/12 bg-white/[0.03] p-5">
                    <S.check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                    <div className="flex flex-col gap-1">
                      <div className="font-archivo text-[15.5px] font-semibold leading-snug text-white">{w.title}</div>
                      <div className="text-[13.5px] leading-[1.55] text-white/50">{w.body}</div>
                    </div>
                  </div>
                </Tilt>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* À propos */}
        {tenant.aboutEnabled && (tenant.aboutText || tenant.aboutPhotoUrl) ? (
          <section className="border-t border-white/10">
            <div className={`mx-auto grid w-full max-w-[1240px] items-center gap-10 px-5 py-[clamp(56px,8vw,104px)] sm:px-8 ${tenant.aboutPhotoUrl ? "lg:grid-cols-[minmax(0,340px)_1fr]" : ""}`}>
              {tenant.aboutPhotoUrl ? (
                <Parallax speed={0.08}>
                  <Reveal direction="left" className="mx-auto w-full max-w-[340px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tenant.aboutPhotoUrl} alt={tenant.aboutTitle || tenant.name} className="w-full rounded-[24px] border border-white/12 object-cover" />
                  </Reveal>
                </Parallax>
              ) : null}
              <Reveal className="flex flex-col gap-4" direction="right">
                <Tag>{L.aboutChip}</Tag>
                {tenant.aboutTitle ? <h2 className={`${title} text-[clamp(26px,4vw,44px)] text-white`}>{tenant.aboutTitle}</h2> : null}
                {tenant.aboutText ? <p className="max-w-[60ch] whitespace-pre-line text-[16px] leading-[1.75] text-white/60">{tenant.aboutText}</p> : null}
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* Ce que disent ses clients. Placé avant le mini-programme :
            la preuve d'abord, la demande d'adresse ensuite. */}
        {tenant.testimonials.length > 0 ? (
          <section className="border-t border-white/10">
            <div className="mx-auto w-full max-w-[1240px] px-5 py-[clamp(44px,6vw,72px)] sm:px-8">
              <TestimonialBand
                items={tenant.testimonials}
                titre={L.testimonialsTitle}
                rating={tenant.googleRating}
                reviewsCount={tenant.googleReviewsCount}
                mapsUrl={tenant.googleMapsUrl}
                tone="dark"
              />
            </div>
          </section>
        ) : null}

        {leadMagnet ? (
          <section id="offert" className="scroll-mt-20 border-t border-white/10">
            <div className="mx-auto w-full max-w-[1240px] px-5 py-[clamp(44px,6vw,72px)] sm:px-8">
              <LeadBand L={L} slug={tenant.slug} tone="dark" />
            </div>
          </section>
        ) : null}

        {/* Programmes */}
        <section id="offres" className="scroll-mt-20 border-t border-white/10">
          <div className="mx-auto w-full max-w-[1240px] px-5 py-[clamp(56px,8vw,104px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Tag>{L.programsChip}</Tag>
              <SplitWords as="h2" text={L.programsTitle} className={`${title} text-[clamp(30px,5vw,56px)] text-white`} />
            </Reveal>

            {offers.length === 0 ? (
              <p className="mt-12 rounded-[24px] border border-white/12 p-8 text-center text-[15px] text-white/50">{L.noOffer}</p>
            ) : (
              <RevealGroup
                className={`mx-auto mt-12 grid gap-5 ${offers.length === 1 ? "max-w-[520px]" : offers.length === 2 ? "max-w-[860px] sm:grid-cols-2" : "max-w-[1240px] sm:grid-cols-2 lg:grid-cols-3"}`}
                step={90}
              >
                {offers.map((o) => (
                  <OfferCard key={o.id} offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
                ))}
              </RevealGroup>
            )}

            {tenant.chargesEnabled && offers.some((o) => o.billing_type !== "subscription") ? (
              <div className="mx-auto mt-12 flex max-w-[600px] flex-col items-center gap-3 rounded-[24px] border border-white/12 bg-white/[0.03] p-8 text-center">
                <div className="font-archivo text-[20px] font-extrabold tracking-[-0.01em] text-white">{L.giftTitle}</div>
                <p className="text-[14px] leading-[1.55] text-white/55">{L.giftBody}</p>
                <Link href={`/c/${tenant.slug}/offrir`} className="press tap mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-btn border border-brand px-6 text-[15px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white">
                  <S.spark className="h-4 w-4" /> {L.giftCta}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-white/10">
          <div className="mx-auto w-full max-w-[860px] px-5 py-[clamp(56px,8vw,104px)] sm:px-8">
            <Reveal className="flex flex-col gap-4">
              <Tag>{L.faqChip}</Tag>
              <SplitWords as="h2" text={L.faqTitle} className={`${title} text-[clamp(28px,4.4vw,48px)] text-white`} />
            </Reveal>
            <div className="mt-10 flex flex-col">
              {L.faqs.map((f) => (
                <details key={f.q} className="group border-t border-white/10 py-4 last:border-b">
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 font-archivo text-[15.5px] font-semibold leading-snug text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <S.chevron className="h-4.5 w-4.5 shrink-0 text-white/35 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-[14px] leading-[1.7] text-white/55">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-white/10">
          <Parallax speed={0.25} className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[860px] -translate-x-1/2 blur-[140px]">
            <div className="h-full w-full rounded-full" style={{ background: `color-mix(in srgb, ${accent} 32%, transparent)` }} />
          </Parallax>
          <div className="relative mx-auto flex w-full max-w-[1240px] flex-col items-center gap-8 px-5 py-[clamp(72px,11vw,140px)] text-center sm:px-8">
            <SplitWords as="h2" text={L.finalTitle} step={60} className={`${title} max-w-[17ch] text-[clamp(34px,6.5vw,76px)] text-white`} />
            {offers.length > 0 ? (
              <a href="#offres" className="press tap inline-flex h-[60px] items-center justify-center gap-2 rounded-btn bg-brand px-10 text-[16px] font-semibold text-white shadow-[0_18px_50px_-14px_var(--color-brand)] hover:bg-brand-hover">
                {L.seePrograms} <S.arrow className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="relative z-[1] border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-5 py-12 sm:px-8">
          <Brand tenant={tenant} imgClass="h-10" textClass="text-[18px]" />
          <p className="max-w-[70ch] text-[13px] leading-[1.6] text-white/40">{L.legalNote}</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[13px] text-white/40">
            <Link href="/connexion" className="underline-grow transition-colors hover:text-white">{L.footerLogin}</Link>
            <Link href="/mentions-legales" className="underline-grow transition-colors hover:text-white">{L.footerLegal}</Link>
            <Link href="/confidentialite" className="underline-grow transition-colors hover:text-white">{L.footerPrivacy}</Link>
            <Link href="/cgv" className="underline-grow transition-colors hover:text-white">{L.footerTerms}</Link>
          </nav>
          {tenant.poweredBy ? (
            <p className="pt-1 text-[12px] text-white/25">
              {L.poweredBy} <span className="font-archivo font-bold text-white/50">{tenant.poweredBy.name}</span>.
            </p>
          ) : null}
        </div>
      </footer>

      {offers.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08090b]/92 px-4 py-3 backdrop-blur-xl sm:hidden">
          <a href="#offres" className="press tap flex w-full items-center justify-center gap-2 rounded-btn bg-brand py-3.5 text-[15px] font-semibold text-white">
            {L.seePrograms} <S.arrow className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
