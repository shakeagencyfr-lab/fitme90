import type { CSSProperties } from "react";
import Link from "next/link";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/mobile-nav";
import { Reveal } from "@/components/reveal";
import { S } from "@/components/landing-icons";
import { formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { themeVars, themeAttrs } from "@/lib/theme";
import { translate, type Locale } from "@/lib/i18n";
import type { PublicSite } from "@/lib/site";
import { siteCopy, servicesOf, introOf } from "@/components/site-templates/site-copy";
import { durationLabel, mapsHref, telHref } from "@/components/site-templates/site-utils";

// Habillage « Nocturne » : sombre, plein cadre, contrasté.
//
// Le hero est une PHOTO pleine largeur assombrie, pas une colonne de texte à
// côté d'une image : c'est ce qui distingue un lieu qu'on a envie de pousser
// la porte d'un site qui décrit un lieu. Tout le reste est en verre sur fond
// noir, avec l'accent de marque comme seule couleur.

// `w-fit` : dans une colonne flex, un `inline-flex` s'étire sur toute la
// largeur et la pastille devient une barre.
const chip =
  "w-fit inline-flex items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80";
const h2 =
  "font-archivo font-extrabold tracking-[-0.03em] text-white text-[clamp(26px,4.6vw,46px)] leading-[1.04] text-balance";

function Brand({ site, imgClass = "h-11" }: { site: PublicSite; imgClass?: string }) {
  const src = site.tenant.logoDarkUrl || site.tenant.logoUrl;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={site.tenant.name} className={`${imgClass} w-auto max-w-[240px] object-contain`} />;
  }
  return <span className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-white">{site.tenant.name}</span>;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <S.star key={n} className={`h-4 w-4 ${n <= Math.round(rating) ? "text-[#f0b656]" : "text-white/20"}`} />
      ))}
    </span>
  );
}

export function SiteNocturne({ site, locale = "fr" }: { site: PublicSite; locale?: Locale }) {
  const C = siteCopy(locale, site.tenant.businessType);
  const accent = site.tenant.brandColor || DEFAULT_BRAND_COLOR;
  const t = site.tenant;
  const services = servicesOf(site, C);
  const intro = introOf(site, C);
  const heroPhoto = site.photos[0] ?? t.aboutPhotoUrl;
  const galerie = site.photos.slice(1);
  const maps = mapsHref(site);
  const tel = telHref(site);

  const nav = [
    t.aboutText ? ["#lieu", C.navAbout] : null,
    ["#prestations", C.navServices],
    site.address || site.openingHours.length > 0 ? ["#infos", C.navPractical] : null,
    site.offers.length > 0 ? ["#programmes", C.navPrograms] : null,
  ].filter((v): v is [string, string] => v !== null);

  return (
    <div
      className="min-h-dvh scroll-smooth bg-[#0a0b0d] text-white"
      style={
        {
          ...themeVars(t.theme),
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 80%, #fff)`,
        } as CSSProperties
      }
      {...themeAttrs(t.theme)}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes ncUp { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
        .nc-up { animation: ncUp .9s cubic-bezier(.22,1,.36,1) both }
      `,
        }}
      />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0b0d]/75 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="#top" className="flex items-center"><Brand site={site} imgClass="h-10 sm:h-12" /></Link>
          <nav className="hidden items-center gap-7 md:flex">
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="text-[13.5px] uppercase tracking-[0.06em] text-white/55 transition-colors hover:text-white">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <MobileNav
              className="md:hidden"
              brand={<Brand site={site} imgClass="h-10" />}
              tone="dark"
              bg="#0a0b0d"
              radius={12}
              uppercase
              langLabel={translate(locale, "landing.language")}
              links={nav.map(([href, label]) => ({ href, label }))}
              login={{ href: `/connexion?c=${t.slug}`, label: C.login }}
              cta={maps ? { href: maps, label: C.itinerary } : undefined}
            />
            <span className="hidden md:block"><LangSwitch compact /></span>
            {tel ? (
              <a href={tel} className="tap hidden h-10 items-center gap-2 rounded-btn border border-white/20 px-4 text-[14px] font-semibold text-white transition-colors hover:border-white/60 sm:inline-flex">
                <S.phone className="h-4 w-4" /> {C.call}
              </a>
            ) : null}
            {site.offers.length > 0 ? (
              <a href="#programmes" className="tap inline-flex h-10 items-center rounded-btn bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
                {C.navPrograms}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top">
        {/* ────────────────────────────────────── hero plein cadre */}
        <section className="relative isolate overflow-hidden">
          {heroPhoto ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroPhoto} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0a0b0d]/60 via-[#0a0b0d]/75 to-[#0a0b0d]" />
            </>
          ) : (
            <div className="absolute inset-0 -z-10" style={{ background: `radial-gradient(120% 90% at 70% 0%, color-mix(in srgb, ${accent} 26%, transparent), transparent 70%)` }} />
          )}
          <div className="mx-auto w-full max-w-[1160px] px-5 pb-[clamp(56px,9vw,120px)] pt-[clamp(56px,10vw,140px)] sm:px-8">
            {site.category ? <span className="nc-up inline-block"><span className={chip}>{site.category}</span></span> : null}
            <h1 className="nc-up mt-6 max-w-[15ch] font-archivo text-[clamp(42px,9vw,88px)] font-extrabold leading-[0.94] tracking-[-0.045em] text-balance" style={{ animationDelay: "70ms" }}>
              {t.headline || t.name}
            </h1>
            <p className="nc-up mt-6 max-w-[56ch] text-[clamp(16px,2.2vw,20px)] leading-[1.6] text-white/70" style={{ animationDelay: "150ms" }}>{intro}</p>

            <div className="nc-up mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center" style={{ animationDelay: "220ms" }}>
              {maps ? (
                <a href={maps} target="_blank" rel="noopener noreferrer" className="tap inline-flex h-[54px] items-center justify-center gap-2 rounded-btn bg-brand px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                  <S.pin className="h-4.5 w-4.5" /> {C.itinerary}
                </a>
              ) : null}
              {site.offers.length > 0 ? (
                <a href="#programmes" className="tap inline-flex h-[54px] items-center justify-center rounded-btn border border-white/25 px-8 text-[16px] font-semibold text-white transition-colors hover:border-white/60">
                  {C.seePrograms}
                </a>
              ) : null}
              {t.googleRating != null ? (
                <span className="inline-flex items-center gap-2.5 sm:ml-2">
                  <Stars rating={t.googleRating} />
                  <span className="font-archivo text-[15px] font-extrabold">{t.googleRating.toFixed(1)}</span>
                  {t.googleReviewsCount ? <span className="text-[13px] text-white/50">{C.reviewsOn(t.googleReviewsCount)}</span> : null}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────── le lieu */}
        {t.aboutText ? (
          <section id="lieu" className="scroll-mt-24 border-t border-white/10">
            <div className="mx-auto grid w-full max-w-[1160px] items-start gap-10 px-5 py-[clamp(52px,8vw,100px)] sm:px-8 lg:grid-cols-[0.42fr_0.58fr]">
              <Reveal className="flex flex-col gap-4">
                <span className={chip}>{C.aboutChip}</span>
                <h2 className={h2}>{t.aboutTitle || C.aboutTitle}</h2>
              </Reveal>
              <Reveal delay={80} className="flex flex-col gap-4 text-[16.5px] leading-[1.75] text-white/65">
                {t.aboutText.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                {t.aboutPhotoUrl && t.aboutPhotoUrl !== heroPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.aboutPhotoUrl} alt="" className="mt-4 aspect-[16/10] w-full rounded-[20px] border border-white/10 object-cover" />
                ) : null}
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* ──────────────────────────────────────── prestations */}
        <section id="prestations" className="scroll-mt-24 border-t border-white/10">
          <div className="mx-auto w-full max-w-[1160px] px-5 py-[clamp(52px,8vw,100px)] sm:px-8">
            <Reveal className="flex flex-col gap-3">
              <span className={chip}>{C.servicesChip}</span>
              <h2 className={h2}>{C.servicesTitle}</h2>
            </Reveal>
            <div className="mt-10 grid gap-px overflow-hidden rounded-[22px] border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <Reveal key={s.title} delay={i * 60} className="flex flex-col gap-3 bg-[#0a0b0d] p-7 transition-colors hover:bg-white/[0.04]">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-brand">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-archivo text-[20px] font-bold leading-tight tracking-[-0.02em]">{s.title}</h3>
                  {s.body ? <p className="text-[14.5px] leading-[1.6] text-white/55">{s.body}</p> : null}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────── galerie */}
        {galerie.length > 0 ? (
          <section className="border-t border-white/10">
            <div className="mx-auto w-full max-w-[1160px] px-5 py-[clamp(52px,8vw,100px)] sm:px-8">
              <Reveal className="flex flex-col gap-3">
                <span className={chip}>{C.galleryChip}</span>
                <h2 className={h2}>{C.galleryTitle}</h2>
              </Reveal>
              <div className="mt-9 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {galerie.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="h-[230px] w-[300px] shrink-0 snap-start rounded-[18px] border border-white/10 object-cover grayscale transition-[filter] duration-500 hover:grayscale-0 sm:h-auto sm:w-auto sm:aspect-[4/3]" />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ──────────────────────────────────── infos pratiques */}
        {site.address || site.openingHours.length > 0 || site.phone ? (
          <section id="infos" className="scroll-mt-24 border-t border-white/10">
            <div className="mx-auto grid w-full max-w-[1160px] gap-10 px-5 py-[clamp(52px,8vw,100px)] sm:px-8 lg:grid-cols-2">
              <Reveal className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <span className={chip}>{C.practicalChip}</span>
                  <h2 className={h2}>{C.practicalTitle}</h2>
                </div>
                <dl className="flex flex-col gap-5">
                  {site.address ? (
                    <div className="flex items-start gap-3.5 border-t border-white/10 pt-5">
                      <S.pin className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <div className="flex flex-col gap-1">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">{C.addressLabel}</dt>
                        <dd className="text-[16px] leading-[1.5] text-white/85">{site.address}</dd>
                        {maps ? <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-1 w-fit text-[14px] font-semibold text-brand hover:underline">{C.itinerary} ↗</a> : null}
                      </div>
                    </div>
                  ) : null}
                  {site.phone ? (
                    <div className="flex items-start gap-3.5 border-t border-white/10 pt-5">
                      <S.phone className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <div className="flex flex-col gap-1">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">{C.phoneLabel}</dt>
                        <dd>{tel ? <a href={tel} className="text-[16px] font-semibold hover:text-brand">{site.phone}</a> : <span className="text-[16px]">{site.phone}</span>}</dd>
                      </div>
                    </div>
                  ) : null}
                  {site.websiteUrl ? (
                    <div className="flex items-start gap-3.5 border-t border-white/10 pt-5">
                      <S.globe className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                      <div className="flex flex-col gap-1">
                        <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">{C.websiteLabel}</dt>
                        <dd><a href={site.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[15px] text-brand hover:underline">{site.websiteUrl.replace(/^https?:\/\//, "")}</a></dd>
                      </div>
                    </div>
                  ) : null}
                </dl>
              </Reveal>

              {site.openingHours.length > 0 ? (
                <Reveal delay={80} className="flex flex-col gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-7">
                  <div className="flex items-center gap-3">
                    <S.clock className="h-5 w-5 text-brand" />
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">{C.hoursLabel}</span>
                  </div>
                  <ul className="flex flex-col">
                    {site.openingHours.map((d) => (
                      <li key={d.day} className="flex items-baseline justify-between gap-4 border-b border-white/8 py-3 text-[15.5px] last:border-0">
                        <span className="capitalize text-white/55">{d.day}</span>
                        <span className="text-right font-medium">{d.hours}</span>
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ────────────────────────────────────────────── avis */}
        {t.testimonials.length > 0 ? (
          <section className="border-t border-white/10">
            <div className="mx-auto w-full max-w-[1160px] px-5 py-[clamp(52px,8vw,100px)] sm:px-8">
              <Reveal className="flex flex-col gap-3">
                <span className={chip}>{C.reviewsChip}</span>
                <h2 className={h2}>{C.reviewsTitle}</h2>
              </Reveal>
              <div className="mt-9 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                {t.testimonials.slice(0, 6).map((a, i) => (
                  <Reveal key={a.id} delay={i * 50} className="flex w-[300px] shrink-0 snap-start flex-col gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] p-6 sm:w-auto">
                    {a.rating != null ? <Stars rating={a.rating} /> : null}
                    <p className="text-[14.5px] leading-[1.65] text-white/75">“{a.body}”</p>
                    <div className="mt-auto flex items-baseline gap-2 pt-2 text-[13px]">
                      <span className="font-semibold">{a.author}</span>
                      {a.publishedLabel ? <span className="text-white/40">· {a.publishedLabel}</span> : null}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ─────────────────────────── programmes en ligne (panneau clair) */}
        {site.offers.length > 0 ? (
          <section id="programmes" className="scroll-mt-24 border-t border-white/10 bg-white text-[#111214]">
            <div className="mx-auto grid w-full max-w-[1160px] gap-10 px-5 py-[clamp(56px,9vw,116px)] sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
              <Reveal className="flex flex-col gap-5">
                <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-brand/25 bg-brand/[0.08] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
                  <S.ai className="h-3.5 w-3.5" /> {C.programsChip}
                </span>
                <h2 className="font-archivo text-[clamp(28px,4.8vw,48px)] font-extrabold leading-[1.03] tracking-[-0.035em] text-balance">
                  {site.programsTitle || C.defaultProgramsTitle}
                </h2>
                <p className="max-w-[52ch] text-[16.5px] leading-[1.65] text-black/60">
                  {site.programsText || C.defaultProgramsText(t.name)}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {C.programsBullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-[1.55] text-black/70">
                      <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" /> {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <Link href={`/c/${t.slug}#offres`} className="tap inline-flex h-[54px] items-center justify-center gap-2 rounded-btn bg-brand px-8 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                    {C.seePrograms} <S.arrow className="h-4.5 w-4.5" />
                  </Link>
                  {site.leadMagnet ? (
                    <Link href={`/c/${t.slug}/decouverte`} className="tap inline-flex h-[54px] items-center justify-center rounded-btn border border-black/15 px-8 text-[16px] font-semibold transition-colors hover:border-black/45">
                      {C.freeProgram}
                    </Link>
                  ) : null}
                </div>
              </Reveal>

              <Reveal delay={100} className="flex flex-col gap-3">
                {site.offers.slice(0, 3).map((o) => (
                  <Link
                    key={o.id}
                    href={`/c/${t.slug}#offres`}
                    className="group flex items-center justify-between gap-4 rounded-[18px] border border-black/10 p-5 transition-colors hover:border-brand/50 hover:bg-brand/[0.04]"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-archivo text-[18px] font-bold leading-tight tracking-[-0.02em]">{o.name}</span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-black/40">{durationLabel(o, locale)}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-archivo text-[20px] font-extrabold tracking-[-0.02em]">
                        {formatEuros(o.billing_type === "subscription" ? o.price_month_cents : o.price_cents)}
                      </span>
                      <S.arrow className="h-4.5 w-4.5 text-brand transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </Reveal>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Brand site={site} imgClass="h-9" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-white/45">
            <Link href={`/connexion?c=${t.slug}`} className="hover:text-white">{C.login}</Link>
            <Link href="/mentions-legales" className="hover:text-white">{C.legal}</Link>
            {t.googleMapsUrl ? <a href={t.googleMapsUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-white">Google</a> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
