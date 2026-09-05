import type { CSSProperties } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/mobile-nav";
import Link from "next/link";
import { type Offer, type PublicTenant } from "@/lib/offers";
import { formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { S } from "@/components/landing-icons";
import { OfferPrice } from "@/components/offer-price";
import { Reveal, RevealGroup } from "@/components/reveal";
import { Rail } from "@/components/landing-templates/rail";
import { LeadBand } from "@/components/landing-templates/lead-band";
import { TestimonialBand } from "@/components/landing-templates/testimonial-band";
import { AuthorEngine } from "@/components/landing-templates/author-engine";
import { offerCardCopy, landingCopy, type LandingCopy, type Audience } from "@/components/landing-templates/coach-copy";
import { makeT, type Locale } from "@/lib/i18n";
import { themeVars, themeAttrs } from "@/lib/theme";
import { ThemeSwitch } from "@/components/theme-toggle";

// Template « Sage » : calme, éditorial, beaucoup d'air.
//
// Il n'était qu'un Lumen aux angles plus ronds. Le parti pris est maintenant
// l'inverse de Volt : pas de cartes empilées, pas de dalles de couleur, mais
// une mise en page de revue.
//   - une colonne de texte étroite et centrée, à l'ancienne
//   - des filets fins au lieu de boîtes : les listes respirent
//   - un RAIL HORIZONTAL pour la méthode, lue comme une frise
//   - un second rail pour les programmes quand il y en a plusieurs
//   - la couleur de marque employée par touches, jamais en aplat plein écran
//
// Le fond est figé en clair, comme Lumen : la landing publique ne doit pas
// basculer si le visiteur a activé le thème sombre de l'application.

const PAPER = "#f4f1ea";
const INK = "#23211d";

const display =
  "font-archivo font-bold tracking-[-0.025em] text-ink text-[clamp(26px,4.4vw,44px)] leading-[1.08] text-balance";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-brand">
      <span className="h-px w-6 bg-brand/50" aria-hidden />
      {children}
    </span>
  );
}

function Brand({ tenant, imgClass = "h-11", textClass = "text-[20px]" }: { tenant: PublicTenant; imgClass?: string; textClass?: string }) {
  if (tenant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={tenant.logoUrl} alt={tenant.name} className={`${imgClass} w-auto max-w-[260px] object-contain`} />;
  }
  return <span className={`font-archivo ${textClass} font-bold tracking-[-0.02em] text-ink`}>{tenant.name}</span>;
}

// Maquette de l'espace client, très douce (pas d'ombre dure, coins généreux).
function SageAppCard({ name, L }: { name: string; L: LandingCopy }) {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="rounded-[34px] border border-ink/8 bg-white p-4 shadow-[0_50px_100px_-50px_rgba(35,33,29,.5)]">
        <div className="rounded-[26px] bg-[var(--lp-warm)] p-4">
          <div className="flex items-center justify-between">
            <span className="font-archivo text-[13px] font-bold tracking-[-0.01em] text-ink">{name}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-brand"><S.spark className="h-4 w-4" /></span>
          </div>
          <div className="mt-4 rounded-[20px] border border-ink/8 bg-white p-4">
            <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink/40">
              <span>{L.mockSession}</span><span className="text-brand">{L.mockDay}</span>
            </div>
            <ul className="mt-3 flex flex-col divide-y divide-ink/6">
              {[["Développé couché", "4 × 8"], ["Tirage vertical", "4 × 10"], ["Élévations latérales", "3 × 15"]].map(([ex, sr], i) => (
                <li key={ex} className="flex items-center gap-2.5 py-2.5 text-[13px] text-ink/75">
                  <span className={`flex size-5 items-center justify-center rounded-full ${i < 2 ? "bg-brand text-white" : "border border-ink/15 text-transparent"}`}><S.check className="h-3 w-3" /></span>
                  <span className="flex-1">{ex}</span>
                  <span className="font-mono text-[11px] text-ink/40">{sr}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex divide-x divide-ink/8 rounded-[20px] border border-ink/8 bg-white">
            {[["Prot.", "156 g"], ["Gluc.", "210 g"], ["Lip.", "62 g"]].map(([k, v]) => (
              <div key={k} className="flex-1 py-3 text-center">
                <div className="font-archivo text-[15px] font-bold text-ink">{v}</div>
                <div className="text-[10px] text-ink/40">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-5 -left-3 rounded-full border border-ink/8 bg-white px-5 py-3 shadow-[0_24px_50px_-28px_rgba(35,33,29,.55)]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-brand"><S.chat className="h-4.5 w-4.5" /></span>
          <div>
            <div className="font-archivo text-[13.5px] font-bold leading-none text-ink">{L.mockCoach}</div>
            <div className="mt-0.5 text-[11px] text-ink/45">{L.mockCoachSub}</div>
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
    <article className={`lift relative flex h-full flex-col gap-6 rounded-[30px] border bg-white p-8 ${featured ? "border-brand/40" : "border-ink/8"}`}>
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

      <OfferPrice
        slug={slug}
        offerId={offer.id}
        onceCents={offer.price_cents}
        monthlyCents={offer.price_month_cents}
        months={offer.duration_months}
        chargesEnabled={chargesEnabled}
        variant="light"
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

      <ul className="flex flex-1 flex-col divide-y divide-ink/6 border-t border-ink/8">
        {copy.bullets.map((it) => (
          <li key={it} className="flex items-start gap-3 py-2.5 text-[14px] leading-[1.55] text-ink/70">
            <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
            {it}
          </li>
        ))}
      </ul>

      </OfferPrice>
    </article>
  );
}

/** Deux colonnes, texte à gauche, liste en filets à droite. Aucune boîte. */
function Editorial({ label, title, body, bullets, children }: { label: string; title: string; body: string; bullets: string[]; children?: React.ReactNode }) {
  return (
    <div className="grid gap-10 border-t border-ink/10 pt-[clamp(40px,6vw,72px)] lg:grid-cols-[0.95fr_1.05fr]">
      <Reveal className="flex flex-col gap-5" direction="left">
        <Label>{label}</Label>
        <h2 className={display}>{title}</h2>
        <p className="max-w-[46ch] text-[16.5px] leading-[1.75] text-ink/60">{body}</p>
        <ul className="mt-1 flex flex-col divide-y divide-ink/8 border-y border-ink/8">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 py-3 text-[14.5px] text-ink/70">
              <span className="size-1.5 shrink-0 rounded-full bg-brand" />
              {b}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal className="flex items-center justify-center" direction="right">{children}</Reveal>
    </div>
  );
}

export function CoachSage({ tenant, offers, leadMagnet = false, locale = "fr" }: { tenant: PublicTenant; offers: Offer[]; leadMagnet?: boolean; locale?: Locale }) {
  // Coach indépendant ou salle : deux discours distincts pour un même design.
  const L = landingCopy(locale, tenant.businessType);
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const title = tenant.headline || tenant.name;
  const tagline = tenant.tagline || L.defaultTagline;
  const slide = locale === "en" ? "Slide" : "Fais glisser";

  return (
    <div
      className="min-h-dvh scroll-smooth pb-[76px] sm:pb-0"
      style={
        {
          ...themeVars(tenant.theme),
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
          ["--color-ink" as string]: INK,
          backgroundColor: PAPER,
          color: INK,
        } as CSSProperties
      }
      {...themeAttrs(tenant.theme)}
    >
      {/* Header : très léger, presque absent */}
      <header className="sticky top-0 z-30 border-b border-ink/8 bg-[var(--lp-warm-2)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1040px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="#top" className="flex items-center"><Brand tenant={tenant} imgClass="h-10 sm:h-12" /></Link>
          <nav className="hidden items-center gap-6 md:flex">
            {[
              ["#auteur", L.navMethod],
              ["#offres", L.navPrograms],
              ["#faq", L.navFaq],
            ].map(([href, label]) => (
              <a key={href} href={href} className="underline-grow text-[14px] text-ink/60 transition-colors hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden h-5 w-px bg-ink/12 md:block" aria-hidden />
            <MobileNav
              className="md:hidden"
              brand={<Brand tenant={tenant} imgClass="h-10" />}
              tone="light"
              bg="#f4f1ea"
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
            <ThemeSwitch className="hidden md:inline-flex" />
            <Link href={`/connexion?c=${tenant.slug}`} className="hidden text-[14px] text-ink/60 transition-colors hover:text-ink sm:inline">
              {L.login}
            </Link>
            {offers.length > 0 ? (
              <a href="#offres" className="press tap inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13.5px] font-semibold text-paper transition-opacity hover:opacity-85">
                {L.seePrograms}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero : colonne centrée, mesure courte, maquette dessous */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-30%] h-[560px] w-[860px] -translate-x-1/2 rounded-full blur-[140px]"
            style={{ background: `color-mix(in srgb, ${accent} 13%, transparent)` }}
          />
          <div className="relative mx-auto flex w-full max-w-[1040px] flex-col items-center gap-7 px-5 pb-14 pt-[clamp(48px,8vw,104px)] text-center sm:px-8">
            <Reveal><Label>{L.heroChip}</Label></Reveal>
            <Reveal delay={70}>
              <h1 className="max-w-[17ch] font-archivo text-[clamp(36px,7vw,72px)] font-bold leading-[1.02] tracking-[-0.035em] text-balance text-ink">
                {title}
              </h1>
            </Reveal>
            <Reveal delay={130}>
              <p className="max-w-[58ch] text-[clamp(16px,2.1vw,19px)] leading-[1.75] text-ink/60">{tagline}</p>
            </Reveal>
            <Reveal delay={190}>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                {offers.length > 0 ? (
                  <a href="#offres" className="press tap inline-flex h-[54px] items-center justify-center gap-2 rounded-full bg-brand px-9 text-[16px] font-semibold text-white hover:bg-brand-hover">
                    {L.seePrograms} <S.arrow className="h-4.5 w-4.5" />
                  </a>
                ) : null}
                <a href="#auteur" className="press tap inline-flex h-[54px] items-center justify-center rounded-full border border-ink/15 px-9 text-[16px] font-semibold text-ink transition-colors hover:border-ink/45">
                  {L.howItWorks}
                </a>
              </div>
            </Reveal>
            <Reveal delay={240} className="flex flex-wrap justify-center gap-x-7 gap-y-2.5">
              {L.heroChecks.map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-[13.5px] text-ink/55">
                  <S.check className="h-4 w-4 text-brand" /> {t}
                </span>
              ))}
            </Reveal>
            <Reveal delay={200} direction="scale" className="mt-6 w-full"><SageAppCard name={tenant.name} L={L} /></Reveal>
          </div>
        </section>

        {/* Repères, en filets */}
        <section className="border-y border-ink/10">
          <div className="mx-auto grid w-full max-w-[1040px] grid-cols-2 gap-y-8 px-5 py-10 sm:px-8 lg:grid-cols-4">
            {L.stats.map((s) => (
              <div key={s.l} className="flex flex-col gap-1.5 px-1">
                <div className="font-archivo text-[clamp(21px,3.2vw,29px)] font-bold leading-none tracking-[-0.025em] text-ink">{s.v}</div>
                <div className="text-[13px] leading-[1.5] text-ink/50">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Méthode : frise horizontale */}
        <section id="methode" className="scroll-mt-24 py-[clamp(52px,7vw,92px)]">
          <div className="mx-auto w-full max-w-[1040px] px-5 sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Label>{L.howItWorks}</Label>
              <h2 className={`${display} max-w-[18ch]`}>{L.stepsTitle}</h2>
            </Reveal>
          </div>
          <div className="mx-auto mt-10 w-full max-w-[1040px]">
            <Rail hint={slide}>
              {L.steps.map((s) => (
                <article key={s.k} className="flex w-[280px] flex-col gap-3 border-t-2 border-brand/40 pt-5 sm:w-[320px]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-brand">{s.k}</div>
                  <h3 className="font-archivo text-[20px] font-bold leading-snug tracking-[-0.02em] text-ink">{s.title}</h3>
                  <p className="text-[15px] leading-[1.7] text-ink/55">{s.body}</p>
                </article>
              ))}
            </Rail>
          </div>
        </section>

        {/* Fonctionnalités : deux colonnes, sans boîtes */}
        <section className="scroll-mt-24 border-t border-ink/10 py-[clamp(52px,7vw,92px)]">
          <div className="mx-auto w-full max-w-[1040px] px-5 sm:px-8">
            <Reveal className="flex flex-col gap-4">
              <Label>{L.featuresChip}</Label>
              <h2 className={`${display} max-w-[18ch]`}>{L.featuresTitle}</h2>
            </Reveal>
            <RevealGroup className="mt-10 grid gap-x-12 gap-y-0 sm:grid-cols-2" step={55}>
              {L.features.map((f) => (
                <div key={f.title} className="flex h-full items-start gap-4 border-b border-ink/8 py-6">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/8 text-brand">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-archivo text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">{f.title}</h3>
                    <p className="text-[14.5px] leading-[1.65] text-ink/55">{f.body}</p>
                  </div>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Trois blocs éditoriaux */}
        <section id="espace" className="scroll-mt-24">
          <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-[clamp(44px,6vw,80px)] px-5 pb-[clamp(52px,7vw,92px)] sm:px-8">
            <Editorial label={L.gymChip} title={L.gymTitle} body={L.gymBody} bullets={L.gymBullets}>
              <div className="w-full rounded-[28px] border border-ink/8 bg-white p-7">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-brand">{L.gymScanLabel}</div>
                <div className="mt-5 flex flex-col divide-y divide-ink/8">
                  {L.gymBullets.map((b) => (
                    <div key={b} className="flex items-center gap-3 py-3 text-[14px] text-ink/70">
                      <S.check className="h-4.5 w-4.5 shrink-0 text-brand" />
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            </Editorial>

            <Editorial label={L.spaceChip} title={L.spaceTitle} body={L.spaceBody} bullets={L.spaceBullets}>
              <SageAppCard name={tenant.name} L={L} />
            </Editorial>

            <Editorial label={L.nutritionChip} title={L.nutritionTitle} body={L.nutritionBody} bullets={L.nutritionBullets}>
              <div className="w-full rounded-[28px] border border-ink/8 bg-white p-7">
                <div className="flex divide-x divide-ink/8">
                  {[["156 g", "Protéines"], ["210 g", "Glucides"], ["62 g", "Lipides"]].map(([v, k]) => (
                    <div key={k} className="flex-1 px-2 text-center">
                      <div className="font-archivo text-[26px] font-bold leading-none tracking-[-0.02em] text-ink">{v}</div>
                      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Editorial>
          </div>
        </section>

        {/* Qui signe le programme, et ce que le moteur apporte */}
        <AuthorEngine L={L} name={tenant.name} tone="light" />

        {/* Est-ce pour toi */}
        <section className="scroll-mt-24 border-t border-ink/10 py-[clamp(52px,7vw,92px)]">
          <div className="mx-auto w-full max-w-[1040px] px-5 sm:px-8">
            <Reveal><h2 className={`${display} max-w-[16ch]`}>{L.forWhoTitle}</h2></Reveal>
            <RevealGroup className="mt-8 grid gap-x-12 sm:grid-cols-2" step={55}>
              {L.forWho.map((w) => (
                <div key={w.title} className="flex h-full flex-col gap-1.5 border-b border-ink/8 py-5">
                  <div className="font-archivo text-[16px] font-semibold leading-snug text-ink">{w.title}</div>
                  <div className="text-[14px] leading-[1.65] text-ink/55">{w.body}</div>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* À propos (optionnel) */}
        {tenant.aboutEnabled && (tenant.aboutText || tenant.aboutPhotoUrl) ? (
          <section className="scroll-mt-24 border-t border-ink/10">
            <div className="mx-auto grid w-full max-w-[1040px] items-center gap-10 px-5 py-[clamp(52px,7vw,92px)] sm:px-8 lg:grid-cols-[minmax(0,300px)_1fr]">
              {tenant.aboutPhotoUrl ? (
                <Reveal className="mx-auto w-full max-w-[300px]" direction="left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tenant.aboutPhotoUrl} alt={tenant.aboutTitle || tenant.name} className="w-full rounded-[28px] border border-ink/8 object-cover" />
                </Reveal>
              ) : null}
              <Reveal className="flex flex-col gap-4" direction="right">
                <Label>{L.aboutChip}</Label>
                {tenant.aboutTitle ? <h2 className={display}>{tenant.aboutTitle}</h2> : null}
                {tenant.aboutText ? <p className="max-w-[58ch] whitespace-pre-line text-[16.5px] leading-[1.8] text-ink/60">{tenant.aboutText}</p> : null}
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* Ce que disent ses clients. Placé avant le mini-programme :
            la preuve d'abord, la demande d'adresse ensuite. */}
        {tenant.testimonials.length > 0 ? (
          <section className="border-t border-black/8">
            <div className="mx-auto w-full max-w-[1240px] px-5 py-[clamp(44px,6vw,72px)] sm:px-8">
              <TestimonialBand
                items={tenant.testimonials}
                titre={L.testimonialsTitle}
                rating={tenant.googleRating}
                reviewsCount={tenant.googleReviewsCount}
                mapsUrl={tenant.googleMapsUrl}
                tone="light"
                radius="rounded-[26px]"
              />
            </div>
          </section>
        ) : null}

        {/* Mini-programme offert */}
        {leadMagnet ? (
          <section className="border-t border-ink/10">
            <div className="mx-auto w-full max-w-[1040px] px-5 py-[clamp(40px,5.5vw,68px)] sm:px-8">
              <LeadBand L={L} slug={tenant.slug} tone="light" radius="rounded-[30px]" ctaClass="rounded-full" />
            </div>
          </section>
        ) : null}

        <section id="offres" className="scroll-mt-20 border-t border-ink/10">
          <div className="mx-auto w-full max-w-[1040px] px-5 pt-[clamp(52px,7vw,92px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Label>{L.programsChip}</Label>
              <h2 className={`${display} max-w-[16ch]`}>{L.programsTitle}</h2>
            </Reveal>
          </div>

          {offers.length === 0 ? (
            <div className="mx-auto w-full max-w-[1040px] px-5 py-14 sm:px-8">
              <p className="rounded-[28px] border border-ink/10 p-8 text-center text-[15px] text-ink/50">{L.noOffer}</p>
            </div>
          ) : offers.length >= 3 ? (
            <div className="mx-auto mt-10 w-full max-w-[1040px]">
              <Rail hint={slide}>
                {offers.map((o) => (
                  <div key={o.id} className="w-[320px] sm:w-[360px]">
                    <OfferCard offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
                  </div>
                ))}
              </Rail>
            </div>
          ) : (
            <div className={`mx-auto mt-10 grid w-full gap-5 px-5 sm:px-8 ${offers.length === 1 ? "max-w-[520px]" : "max-w-[880px] sm:grid-cols-2"}`}>
              {offers.map((o) => (
                <OfferCard key={o.id} offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
              ))}
            </div>
          )}

          {tenant.chargesEnabled && offers.some((o) => o.billing_type !== "subscription") ? (
            <div className="mx-auto w-full max-w-[1040px] px-5 pb-[clamp(52px,7vw,92px)] pt-10 sm:px-8">
              <div className="mx-auto flex max-w-[560px] flex-col items-center gap-3 rounded-[28px] border border-ink/10 bg-white p-8 text-center">
                <div className="font-archivo text-[20px] font-bold tracking-[-0.02em] text-ink">{L.giftTitle}</div>
                <p className="text-[14.5px] leading-[1.6] text-ink/55">{L.giftBody}</p>
                <Link
                  href={`/c/${tenant.slug}/offrir`}
                  className="press tap mt-1 inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-brand px-6 text-[15px] font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  <S.spark className="h-4 w-4" /> {L.giftCta}
                </Link>
              </div>
            </div>
          ) : (
            <div className="pb-[clamp(52px,7vw,92px)]" />
          )}
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-ink/10">
          <div className="mx-auto w-full max-w-[760px] px-5 py-[clamp(52px,7vw,92px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Label>{L.faqChip}</Label>
              <h2 className={display}>{L.faqTitle}</h2>
            </Reveal>
            <div className="mt-9 flex flex-col">
              {L.faqs.map((f) => (
                <details key={f.q} className="group border-t border-ink/10 py-4 last:border-b">
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 font-archivo text-[16px] font-semibold leading-snug text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <S.chevron className="h-4.5 w-4.5 shrink-0 text-ink/35 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-[14.5px] leading-[1.75] text-ink/60">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-ink/10 bg-white">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2 rounded-full blur-[130px]"
            style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
          />
          <div className="relative mx-auto flex w-full max-w-[1040px] flex-col items-center gap-7 px-5 py-[clamp(60px,9vw,116px)] text-center sm:px-8">
            <h2 className="max-w-[18ch] font-archivo text-[clamp(30px,5.4vw,56px)] font-bold leading-[1.04] tracking-[-0.03em] text-balance text-ink">
              {L.finalTitle}
            </h2>
            {offers.length > 0 ? (
              <a href="#offres" className="press tap inline-flex h-[56px] items-center justify-center gap-2 rounded-full bg-brand px-10 text-[16px] font-semibold text-white hover:bg-brand-hover">
                {L.seePrograms} <S.arrow className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink/10">
        <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-5 py-12 sm:px-8">
          <Brand tenant={tenant} imgClass="h-10" textClass="text-[18px]" />
          <p className="max-w-[70ch] text-[13px] leading-[1.7] text-ink/45">{L.legalNote}</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[13px] text-ink/45">
            <Link href="/connexion" className="underline-grow transition-colors hover:text-ink">{L.footerLogin}</Link>
            <Link href="/mentions-legales" className="underline-grow transition-colors hover:text-ink">{L.footerLegal}</Link>
            <Link href="/confidentialite" className="underline-grow transition-colors hover:text-ink">{L.footerPrivacy}</Link>
            <Link href="/cgv" className="underline-grow transition-colors hover:text-ink">{L.footerTerms}</Link>
          </nav>
          {tenant.poweredBy ? (
            <p className="pt-1 text-[12px] text-ink/30">
              {L.poweredBy} <span className="font-archivo font-bold text-ink/55">{tenant.poweredBy.name}</span>.
            </p>
          ) : null}
        </div>
      </footer>

      {/* CTA collante mobile */}
      {offers.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-[var(--lp-warm-2)]/92 px-4 py-3 backdrop-blur-xl sm:hidden">
          <a href="#offres" className="press tap flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-[15px] font-semibold text-white">
            {L.seePrograms} <S.arrow className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
