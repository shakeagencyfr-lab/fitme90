"use client";

import type { CSSProperties } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/landing-templates/mobile-nav";
import Link from "next/link";
import { type Offer, type PublicTenant } from "@/lib/offers";
import { formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { S } from "@/components/landing-icons";
import { SubscriptionPrice } from "@/components/subscription-price";
import { Reveal, RevealGroup } from "@/components/reveal";
import {
  ScrollProgress,
  HorizontalPin,
  Parallax,
  SplitWords,
  Counter,
  Tilt,
  ScrollMarquee,
} from "@/components/landing-templates/scroll-fx";
import { LeadBand } from "@/components/landing-templates/lead-band";
import { AuthorEngine } from "@/components/landing-templates/author-engine";
import { offerCardCopy, landingCopy, type LandingCopy, type Audience } from "@/components/landing-templates/coach-copy";
import { makeT, type Locale } from "@/lib/i18n";

// Template « Aurora » : le même arsenal que Kinetic, employé à l'envers.
//
// Kinetic impressionne par la vitesse et le contraste. Aurora impressionne par
// le calme : dégradés très doux, grandes respirations, titres qui s'assemblent
// lentement, et deux traversées horizontales lentes (la méthode, puis les
// programmes). Pas de halo au curseur, pas d'inclinaison agressive : ce qui
// fait « premium » ici, c'est la retenue.
//
// Les mêmes limites que Kinetic s'appliquent : pas de détournement du
// défilement sous 1024 px ni sans pointeur fin, tout se coupe si le visiteur a
// demandé moins de mouvement, une seule lecture de position par frame.

const PAPER = "#faf8f4";
const INK = "#1d1b19";

const display = "font-archivo font-bold tracking-[-0.03em] leading-[1.03] text-balance text-ink";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.24em] text-brand">
      <span className="h-px w-7 bg-brand/50" aria-hidden />
      {children}
    </span>
  );
}

function Brand({ tenant, imgClass = "h-11", textClass = "text-[20px]" }: { tenant: PublicTenant; imgClass?: string; textClass?: string }) {
  if (tenant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={tenant.logoUrl} alt={tenant.name} className={`${imgClass} w-auto max-w-[260px] object-contain`} />;
  }
  return <span className={`font-archivo ${textClass} truncate whitespace-nowrap font-bold tracking-[-0.02em] text-ink`}>{tenant.name}</span>;
}

function AppCard({ name, L }: { name: string; L: LandingCopy }) {
  return (
    <div className="relative mx-auto w-full max-w-[350px]">
      <div className="rounded-[36px] border border-ink/6 bg-white p-4 shadow-[0_60px_120px_-60px_rgba(29,27,25,.55)]">
        <div className="rounded-[28px] bg-[#faf8f4] p-4">
          <div className="flex items-center justify-between">
            <span className="font-archivo text-[13px] font-bold text-ink">{name}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-brand"><S.spark className="h-4 w-4" /></span>
          </div>
          <div className="mt-4 rounded-[22px] border border-ink/6 bg-white p-4">
            <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink/40">
              <span>{L.mockSession}</span><span className="text-brand">{L.mockDay}</span>
            </div>
            <ul className="mt-3 flex flex-col divide-y divide-ink/5">
              {[["Développé couché", "4 × 8"], ["Tirage vertical", "4 × 10"], ["Élévations latérales", "3 × 15"]].map(([ex, sr], i) => (
                <li key={ex} className="flex items-center gap-2.5 py-2.5 text-[13px] text-ink/75">
                  <span className={`flex size-5 items-center justify-center rounded-full ${i < 2 ? "bg-brand text-white" : "border border-ink/15 text-transparent"}`}><S.check className="h-3 w-3" /></span>
                  <span className="flex-1">{ex}</span>
                  <span className="font-mono text-[11px] text-ink/40">{sr}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex divide-x divide-ink/6 rounded-[22px] border border-ink/6 bg-white">
            {[["Prot.", "156 g"], ["Gluc.", "210 g"], ["Lip.", "62 g"]].map(([k, v]) => (
              <div key={k} className="flex-1 py-3 text-center">
                <div className="font-archivo text-[15px] font-bold text-ink">{v}</div>
                <div className="text-[10px] text-ink/40">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfferCard({ offer, offers, slug, chargesEnabled, locale, audience }: { offer: Offer; offers: Offer[]; slug: string; chargesEnabled: boolean; locale: Locale; audience: Audience }) {
  const isSub = offer.billing_type === "subscription";
  const copy = offerCardCopy(offer, offers, makeT(locale));
  const L = landingCopy(locale, audience);
  const featured = copy.featured;
  return (
    <Tilt max={4} className="h-full">
      <article className={`relative flex h-full flex-col gap-6 rounded-[32px] border bg-white p-8 ${featured ? "border-brand/35 shadow-[0_40px_90px_-50px_rgba(29,27,25,.5)]" : "border-ink/7"}`}>
        {featured ? (
          <span className="absolute -top-3 left-8 rounded-full bg-brand px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white">
            {L.mostChosen}
          </span>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label>{copy.eyebrow}</Label>
          <h3 className="font-archivo text-[23px] font-bold leading-tight tracking-[-0.02em] text-ink">{offer.name}</h3>
          {copy.pitch ? <p className="text-[14.5px] leading-[1.6] text-ink/55">{copy.pitch}</p> : null}
        </div>

        {isSub ? (
          <SubscriptionPrice slug={slug} offerId={offer.id} priceMonthCents={offer.price_month_cents} priceYearCents={offer.price_year_cents} chargesEnabled={chargesEnabled} variant="light" />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <span className="font-archivo text-[clamp(38px,6.5vw,54px)] font-bold leading-none tracking-[-0.03em] text-ink">
                {formatEuros(offer.price_cents)}
              </span>
              <span className="pb-2 text-[13px] text-ink/45">{L.oneTime}</span>
            </div>
            {copy.perMonthCents > 0 ? (
              <span className="text-[13px] text-ink/50">{L.perMonthOn(formatEuros(copy.perMonthCents), offer.duration_months)}</span>
            ) : null}
          </div>
        )}

        <ul className="flex flex-1 flex-col divide-y divide-ink/5 border-t border-ink/7">
          {copy.bullets.map((it) => (
            <li key={it} className="flex items-start gap-3 py-2.5 text-[14px] leading-[1.55] text-ink/70">
              <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
              {it}
            </li>
          ))}
        </ul>

        {!isSub &&
          (chargesEnabled ? (
            <Link href={`/inscription?c=${slug}&offer=${offer.id}`} className="press tap inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-brand px-6 text-[15px] font-semibold text-white hover:bg-brand-hover">
              {L.choose} <S.arrow className="h-4.5 w-4.5 shrink-0" />
            </Link>
          ) : (
            <span className="inline-flex h-[54px] items-center justify-center rounded-full border border-ink/10 px-6 text-[14px] text-ink/35">{L.soon}</span>
          ))}
      </article>
    </Tilt>
  );
}

export function CoachAurora({ tenant, offers, leadMagnet = false, locale = "fr" }: { tenant: PublicTenant; offers: Offer[]; leadMagnet?: boolean; locale?: Locale }) {
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
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
          ["--color-ink" as string]: INK,
          background: PAPER,
          color: INK,
        } as CSSProperties
      }
    >
      <ScrollProgress />

      {/* Aurore de fond : deux voiles très diffus, en parallaxe lente. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Parallax speed={0.18} className="absolute -left-[20%] top-[-5%] h-[720px] w-[720px] rounded-full blur-[160px]">
          <div className="h-full w-full" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)` }} />
        </Parallax>
        <Parallax speed={-0.12} className="absolute -right-[15%] top-[45%] h-[620px] w-[620px] rounded-full blur-[170px]">
          <div className="h-full w-full" style={{ background: "rgba(150,175,255,.14)" }} />
        </Parallax>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink/6 bg-[#faf8f4]">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="#top" className="flex min-w-0 items-center"><Brand tenant={tenant} imgClass="h-10 sm:h-12" textClass="text-[17px] sm:text-[20px]" /></Link>
          <nav className="hidden items-center gap-7 md:flex">
            {[["#auteur", L.navMethod], ["#offres", L.navPrograms], ["#faq", L.navFaq]].map(([href, label]) => (
              <a key={href} href={href} className="underline-grow text-[14px] text-ink/55 transition-colors hover:text-ink">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden h-5 w-px bg-ink/10 md:block" aria-hidden />
            <MobileNav
              className="md:hidden"
              brand={<Brand tenant={tenant} imgClass="h-10" textClass="text-[17px]" />}
              tone="light"
              bg="#faf8f4"
              radius={999}
              langLabel={locale === "en" ? "Language" : "Langue"}
              links={[
                { href: "#auteur", label: L.navMethod },
                { href: "#offres", label: L.navPrograms },
                { href: "#faq", label: L.navFaq },
              ]}
              login={{ href: `/connexion?c=${tenant.slug}`, label: L.login }}
              cta={offers.length > 0 ? { href: "#offres", label: L.seePrograms } : undefined}
            />
            <span className="hidden md:block"><LangSwitch compact /></span>
            <Link href={`/connexion?c=${tenant.slug}`} className="hidden text-[14px] text-ink/55 transition-colors hover:text-ink sm:inline">{L.login}</Link>
            {offers.length > 0 ? (
              <a href="#offres" className="press tap hidden h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-ink px-5 text-[13.5px] font-semibold text-[#faf8f4] transition-opacity hover:opacity-85 sm:inline-flex">
                {L.seePrograms}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top" className="relative z-[1]">
        {/* Hero : mesure courte, titre lent, maquette en parallaxe */}
        <section className="relative">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-8 px-5 pb-16 pt-[clamp(52px,9vw,120px)] text-center sm:px-8">
            <Reveal><Label>{L.heroChip}</Label></Reveal>
            <SplitWords
              as="h1"
              text={heading}
              step={70}
              className={`${display} max-w-[17ch] text-[clamp(38px,7.4vw,80px)]`}
            />
            <Reveal delay={160}>
              <p className="max-w-[56ch] text-[clamp(16px,2.1vw,19px)] leading-[1.8] text-ink/60">{tagline}</p>
            </Reveal>
            <Reveal delay={230}>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                {offers.length > 0 ? (
                  <a href="#offres" className="press tap inline-flex h-[56px] items-center justify-center gap-2 rounded-full bg-brand px-9 text-[16px] font-semibold text-white hover:bg-brand-hover">
                    {L.seePrograms} <S.arrow className="h-4.5 w-4.5" />
                  </a>
                ) : null}
                <a href="#auteur" className="press tap inline-flex h-[56px] items-center justify-center rounded-full border border-ink/15 px-9 text-[16px] font-semibold text-ink transition-colors hover:border-ink/45">
                  {L.howItWorks}
                </a>
              </div>
            </Reveal>
            <Reveal delay={290} className="flex flex-wrap justify-center gap-x-8 gap-y-2.5">
              {L.heroChecks.map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-[13.5px] text-ink/55">
                  <S.check className="h-4 w-4 text-brand" /> {t}
                </span>
              ))}
            </Reveal>
            <Reveal delay={240} direction="scale" className="mt-6 w-full">
              <Parallax speed={0.09}><AppCard name={tenant.name} L={L} /></Parallax>
            </Reveal>
          </div>
        </section>

        {/* Chiffres, en filets */}
        <section className="border-y border-ink/8 bg-white/40 backdrop-blur-sm">
          <div className="mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-y-8 px-5 py-12 sm:px-8 lg:grid-cols-4">
            {[
              { v: 12, s: locale === "en" ? " weeks" : " sem.", l: locale === "en" ? "of programming" : "de programmation" },
              { v: 100, s: " %", l: locale === "en" ? "fitted to your gym" : "adapté à ta salle" },
              { v: 7, s: "/7", l: locale === "en" ? "support, on tap" : "un interlocuteur, à la demande" },
              { v: 4, s: "", l: locale === "en" ? "blocks that learn from you" : "blocs qui apprennent de toi" },
            ].map((k) => (
              <Reveal key={k.l} className="flex flex-col gap-1.5 px-1">
                <div className="font-archivo text-[clamp(28px,4.6vw,46px)] font-bold leading-none tracking-[-0.03em] text-ink">
                  <Counter to={k.v} suffix={k.s} duration={1700} />
                </div>
                <div className="text-[13px] leading-[1.5] text-ink/50">{k.l}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Bandeau : avance seul, lentement, dans le sens de la lecture inverse */}
        <div className="border-y border-ink/8 bg-ink/[0.02] py-3.5">
          <ScrollMarquee
            items={[...L.heroChecks, ...L.stats.map((st) => st.l)]}
            seconds={46}
            reverse
            className="font-mono text-[12px] uppercase tracking-[0.2em] text-ink/35"
          />
        </div>

        {/* ── Traversée horizontale n°1 : la méthode, en frise lente ── */}
        <section id="methode" className="relative scroll-mt-24">
          <HorizontalPin
            panels={2.4}
            hint={slide}
            heading={
              <div className="flex flex-col items-center gap-4 text-center">
                <Label>{L.howItWorks}</Label>
                <SplitWords as="h2" text={L.stepsTitle} className={`${display} max-w-[18ch] text-[clamp(26px,3.8vw,42px)]`} />
              </div>
            }
          >
            {L.steps.map((s) => (
              <article key={s.k} className="flex w-[80vw] shrink-0 flex-col justify-center gap-5 rounded-[34px] border border-ink/7 bg-white p-10 shadow-[0_50px_110px_-70px_rgba(29,27,25,.55)] sm:w-[44vw]">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-brand">{s.k}</div>
                <h3 className="font-archivo text-[clamp(22px,2.6vw,34px)] font-bold leading-tight tracking-[-0.025em] text-ink">{s.title}</h3>
                <p className="max-w-[44ch] text-[16px] leading-[1.8] text-ink/55">{s.body}</p>
              </article>
            ))}
          </HorizontalPin>
        </section>

        {/* Fonctionnalités : deux colonnes en filets, sans boîtes */}
        <section className="border-t border-ink/8 py-[clamp(56px,8vw,100px)]">
          <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8">
            <Reveal className="flex flex-col gap-4">
              <Label>{L.featuresChip}</Label>
              <SplitWords as="h2" text={L.featuresTitle} className={`${display} max-w-[18ch] text-[clamp(28px,4.6vw,50px)]`} />
            </Reveal>
            <RevealGroup className="mt-10 grid gap-x-14 sm:grid-cols-2" step={55}>
              {L.features.map((f) => (
                <div key={f.title} className="flex h-full items-start gap-4 border-b border-ink/7 py-6">
                  <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/8 text-brand">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-archivo text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">{f.title}</h3>
                    <p className="text-[14.5px] leading-[1.7] text-ink/55">{f.body}</p>
                  </div>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Qui signe, et ce que le moteur apporte */}
        <AuthorEngine L={L} name={tenant.name} tone="light" />

        {/* Est-ce pour toi */}
        <section className="border-t border-ink/8 py-[clamp(56px,8vw,100px)]">
          <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8">
            <Reveal><SplitWords as="h2" text={L.forWhoTitle} className={`${display} max-w-[16ch] text-[clamp(28px,4.4vw,48px)]`} /></Reveal>
            <RevealGroup className="mt-8 grid gap-x-14 sm:grid-cols-2" step={55}>
              {L.forWho.map((w) => (
                <div key={w.title} className="flex h-full flex-col gap-1.5 border-b border-ink/7 py-5">
                  <div className="font-archivo text-[16px] font-semibold leading-snug text-ink">{w.title}</div>
                  <div className="text-[14px] leading-[1.7] text-ink/55">{w.body}</div>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* À propos */}
        {tenant.aboutEnabled && (tenant.aboutText || tenant.aboutPhotoUrl) ? (
          <section className="border-t border-ink/8">
            <div className={`mx-auto grid w-full max-w-[1120px] items-center gap-12 px-5 py-[clamp(56px,8vw,100px)] sm:px-8 ${tenant.aboutPhotoUrl ? "lg:grid-cols-[minmax(0,320px)_1fr]" : ""}`}>
              {tenant.aboutPhotoUrl ? (
                <Parallax speed={0.07}>
                  <Reveal direction="left" className="mx-auto w-full max-w-[320px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tenant.aboutPhotoUrl} alt={tenant.aboutTitle || tenant.name} className="w-full rounded-[32px] border border-ink/7 object-cover" />
                  </Reveal>
                </Parallax>
              ) : null}
              <Reveal className="flex flex-col gap-4" direction="right">
                <Label>{L.aboutChip}</Label>
                {tenant.aboutTitle ? <h2 className={`${display} text-[clamp(26px,4vw,42px)]`}>{tenant.aboutTitle}</h2> : null}
                {tenant.aboutText ? <p className="max-w-[58ch] whitespace-pre-line text-[16.5px] leading-[1.85] text-ink/60">{tenant.aboutText}</p> : null}
              </Reveal>
            </div>
          </section>
        ) : null}

        {leadMagnet ? (
          <section className="border-t border-ink/8">
            <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(44px,6vw,72px)] sm:px-8">
              <LeadBand L={L} slug={tenant.slug} tone="light" radius="rounded-[32px]" ctaClass="rounded-full" />
            </div>
          </section>
        ) : null}

        {/* ── Traversée horizontale n°2 : les programmes ── */}
        <section id="offres" className="scroll-mt-20 border-t border-ink/8">
          {offers.length < 3 ? (
            <div className="mx-auto w-full max-w-[1120px] px-5 pt-[clamp(56px,8vw,100px)] sm:px-8">
              <Reveal className="flex flex-col items-center gap-4 text-center">
                <Label>{L.programsChip}</Label>
                <SplitWords as="h2" text={L.programsTitle} className={`${display} max-w-[16ch] text-[clamp(28px,4.6vw,52px)]`} />
              </Reveal>
            </div>
          ) : null}

          {offers.length === 0 ? (
            <div className="mx-auto w-full max-w-[1120px] px-5 py-14 sm:px-8">
              <p className="rounded-[30px] border border-ink/8 bg-white p-8 text-center text-[15px] text-ink/50">{L.noOffer}</p>
            </div>
          ) : offers.length >= 3 ? (
            // Trois offres ou plus : la traversée horizontale a du sens.
            // En dessous, une grille reste plus lisible qu'un rail à deux cartes.
            <HorizontalPin
              panels={1.7}
              hint={slide}
              heading={
                <div className="flex flex-col items-center gap-4 text-center">
                  <Label>{L.programsChip}</Label>
                  <SplitWords as="h2" text={L.programsTitle} className={`${display} max-w-[16ch] text-[clamp(26px,3.8vw,44px)]`} />
                </div>
              }
            >
              {offers.map((o) => (
                <div key={o.id} className="w-[86vw] shrink-0 sm:w-[400px]">
                  <OfferCard offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
                </div>
              ))}
            </HorizontalPin>
          ) : (
            <RevealGroup className={`mx-auto mt-12 grid w-full gap-6 px-5 sm:px-8 ${offers.length === 1 ? "max-w-[540px]" : "max-w-[920px] sm:grid-cols-2"}`} step={90}>
              {offers.map((o) => (
                <OfferCard key={o.id} offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
              ))}
            </RevealGroup>
          )}

          {tenant.chargesEnabled && offers.some((o) => o.billing_type !== "subscription") ? (
            <div className="mx-auto w-full max-w-[1120px] px-5 pb-[clamp(56px,8vw,100px)] pt-12 sm:px-8">
              <div className="mx-auto flex max-w-[580px] flex-col items-center gap-3 rounded-[32px] border border-ink/8 bg-white p-8 text-center">
                <div className="font-archivo text-[20px] font-bold tracking-[-0.02em] text-ink">{L.giftTitle}</div>
                <p className="text-[14.5px] leading-[1.6] text-ink/55">{L.giftBody}</p>
                <Link href={`/c/${tenant.slug}/offrir`} className="press tap mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-brand px-6 text-[15px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white">
                  <S.spark className="h-4 w-4" /> {L.giftCta}
                </Link>
              </div>
            </div>
          ) : (
            <div className="pb-[clamp(56px,8vw,100px)]" />
          )}
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-ink/8">
          <div className="mx-auto w-full max-w-[800px] px-5 py-[clamp(56px,8vw,100px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Label>{L.faqChip}</Label>
              <SplitWords as="h2" text={L.faqTitle} className={`${display} text-[clamp(26px,4.2vw,46px)]`} />
            </Reveal>
            <div className="mt-10 flex flex-col">
              {L.faqs.map((f) => (
                <details key={f.q} className="group border-t border-ink/8 py-4 last:border-b">
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 font-archivo text-[16px] font-semibold leading-snug text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <S.chevron className="h-4.5 w-4.5 shrink-0 text-ink/35 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-[14.5px] leading-[1.8] text-ink/60">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-ink/8 bg-white">
          <Parallax speed={0.2} className="pointer-events-none absolute left-1/2 top-0 h-[380px] w-[820px] -translate-x-1/2 blur-[150px]">
            <div className="h-full w-full rounded-full" style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)` }} />
          </Parallax>
          <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center gap-8 px-5 py-[clamp(68px,10vw,132px)] text-center sm:px-8">
            <SplitWords as="h2" text={L.finalTitle} step={75} className={`${display} max-w-[18ch] text-[clamp(30px,5.6vw,64px)]`} />
            {offers.length > 0 ? (
              <a href="#offres" className="press tap inline-flex h-[58px] items-center justify-center gap-2 rounded-full bg-brand px-10 text-[16px] font-semibold text-white hover:bg-brand-hover">
                {L.seePrograms} <S.arrow className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="relative z-[1] border-t border-ink/8">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-12 sm:px-8">
          <Brand tenant={tenant} imgClass="h-10" textClass="text-[18px]" />
          <p className="max-w-[70ch] text-[13px] leading-[1.7] text-ink/45">{L.legalNote}</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[13px] text-ink/45">
            <Link href="/connexion" className="underline-grow transition-colors hover:text-ink">{L.footerLogin}</Link>
            <Link href="/mentions-legales" className="underline-grow transition-colors hover:text-ink">{L.footerLegal}</Link>
            <Link href="/confidentialite" className="underline-grow transition-colors hover:text-ink">{L.footerPrivacy}</Link>
            <Link href="/cgv" className="underline-grow transition-colors hover:text-ink">{L.footerTerms}</Link>
          </nav>
          <p className="pt-1 text-[12px] text-ink/30">
            {L.poweredBy} <span className="font-archivo font-bold text-ink/55">My Fitness <span className="text-brand">App</span></span>.
          </p>
        </div>
      </footer>

      {offers.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/8 bg-[#faf8f4]/92 px-4 py-3 backdrop-blur-xl sm:hidden">
          <a href="#offres" className="press tap flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-[15px] font-semibold text-white">
            {L.seePrograms} <S.arrow className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
