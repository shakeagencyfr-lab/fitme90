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
import { mapsHref, telHref } from "@/components/site-templates/site-utils";

// Habillage « Vitrine » : blanc, structuré, orienté renseignement.
//
// C'est celui du visiteur pressé : il cherche l'adresse, les horaires et le
// numéro. Une carte d'informations reste donc COLLÉE à droite pendant tout le
// défilement sur grand écran, et remonte en tête sur téléphone. Le reste de la
// page est une colonne unique, sections numérotées, sans effet.

const h2 =
  "font-archivo font-extrabold tracking-[-0.03em] text-ink text-[clamp(24px,3.8vw,36px)] leading-[1.1] text-balance";
const eyebrow = "font-mono text-[11px] uppercase tracking-[0.18em] text-brand";

function Brand({ site, imgClass = "h-11" }: { site: PublicSite; imgClass?: string }) {
  if (site.tenant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={site.tenant.logoUrl} alt={site.tenant.name} className={`${imgClass} w-auto max-w-[240px] object-contain`} />;
  }
  return <span className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-ink">{site.tenant.name}</span>;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <S.star key={n} className={`h-4 w-4 ${n <= Math.round(rating) ? "text-[#e8a33d]" : "text-black/12"}`} />
      ))}
    </span>
  );
}

/** La carte de renseignements : adresse, horaires, contact, notation. */
function InfoCard({ site, C }: { site: PublicSite; C: ReturnType<typeof siteCopy> }) {
  const maps = mapsHref(site);
  const tel = telHref(site);
  const t = site.tenant;
  return (
    <aside className="flex flex-col gap-5 rounded-[22px] border border-black/10 bg-[#fbfaf8] p-6">
      {t.googleRating != null ? (
        <div className="flex items-center gap-2.5 border-b border-black/8 pb-5">
          <Stars rating={t.googleRating} />
          <span className="font-archivo text-[16px] font-extrabold text-ink">{t.googleRating.toFixed(1)}</span>
          {t.googleReviewsCount ? <span className="text-[13px] text-ink/50">{C.reviewsOn(t.googleReviewsCount)}</span> : null}
        </div>
      ) : null}

      {site.address ? (
        <div className="flex items-start gap-3">
          <S.pin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">{C.addressLabel}</span>
            <span className="text-[14.5px] leading-[1.5] text-ink/80">{site.address}</span>
          </div>
        </div>
      ) : null}

      {site.openingHours.length > 0 ? (
        <div className="flex items-start gap-3">
          <S.clock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
          <div className="flex w-full flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">{C.hoursLabel}</span>
            <ul className="flex flex-col">
              {site.openingHours.map((d) => (
                <li key={d.day} className="flex items-baseline justify-between gap-3 py-1 text-[13.5px]">
                  <span className="capitalize text-ink/60">{d.day}</span>
                  <span className="text-right font-medium text-ink">{d.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {site.phone ? (
        <div className="flex items-start gap-3">
          <S.phone className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">{C.phoneLabel}</span>
            {tel ? <a href={tel} className="text-[14.5px] font-semibold text-ink hover:text-brand">{site.phone}</a> : <span className="text-[14.5px] text-ink/80">{site.phone}</span>}
          </div>
        </div>
      ) : null}

      {site.websiteUrl ? (
        <div className="flex items-start gap-3">
          <S.globe className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">{C.websiteLabel}</span>
            <a href={site.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[14px] text-brand hover:underline">{site.websiteUrl.replace(/^https?:\/\//, "")}</a>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 border-t border-black/8 pt-5">
        {maps ? (
          <a href={maps} target="_blank" rel="noopener noreferrer" className="tap inline-flex h-12 items-center justify-center gap-2 rounded-btn bg-brand px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover">
            <S.pin className="h-4.5 w-4.5" /> {C.itinerary}
          </a>
        ) : null}
        {tel ? (
          <a href={tel} className="tap inline-flex h-12 items-center justify-center gap-2 rounded-btn border border-black/12 bg-white px-5 text-[15px] font-semibold text-ink transition-colors hover:border-ink/40">
            <S.phone className="h-4.5 w-4.5" /> {C.call}
          </a>
        ) : null}
        {site.offers.length > 0 ? (
          <a href="#programmes" className="text-center text-[13.5px] font-semibold text-brand hover:underline">
            {C.seePrograms}
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export function SiteVitrine({ site, locale = "fr" }: { site: PublicSite; locale?: Locale }) {
  const C = siteCopy(locale, site.tenant.businessType);
  const accent = site.tenant.brandColor || DEFAULT_BRAND_COLOR;
  const t = site.tenant;
  const services = servicesOf(site, C);
  const intro = introOf(site, C);
  const heroPhoto = site.photos[0] ?? t.aboutPhotoUrl;
  const galerie = site.photos.slice(1);
  const maps = mapsHref(site);

  const nav = [
    t.aboutText ? ["#lieu", C.navAbout] : null,
    ["#prestations", C.navServices],
    t.testimonials.length > 0 ? ["#avis", C.navReviews] : null,
    site.offers.length > 0 ? ["#programmes", C.navPrograms] : null,
  ].filter((v): v is [string, string] => v !== null);

  // Les sections numérotées : la numérotation ne décore pas, elle dit combien
  // il en reste. On ne compte donc que celles réellement affichées.
  const sections = [
    t.aboutText ? "lieu" : null,
    "prestations",
    galerie.length > 0 ? "galerie" : null,
    t.testimonials.length > 0 ? "avis" : null,
  ].filter((v): v is string => v !== null);
  const num = (id: string) => String(sections.indexOf(id) + 1).padStart(2, "0");

  return (
    <div
      className="min-h-dvh scroll-smooth bg-white text-ink"
      style={
        {
          ...themeVars(t.theme),
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
          ["--color-ink" as string]: "#17181a",
        } as CSSProperties
      }
      {...themeAttrs(t.theme)}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes vtUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .vt-up { animation: vtUp .7s cubic-bezier(.22,1,.36,1) both }
      `,
        }}
      />

      <header className="sticky top-0 z-30 border-b border-black/8 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="#top" className="flex items-center"><Brand site={site} imgClass="h-10 sm:h-12" /></Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="underline-grow text-[14px] text-ink/60 transition-colors hover:text-ink">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <MobileNav
              className="md:hidden"
              brand={<Brand site={site} imgClass="h-10" />}
              tone="light"
              bg="#ffffff"
              radius={12}
              langLabel={translate(locale, "landing.language")}
              links={nav.map(([href, label]) => ({ href, label }))}
              login={{ href: `/connexion?c=${t.slug}`, label: C.login }}
              cta={maps ? { href: maps, label: C.itinerary } : undefined}
            />
            <span className="hidden md:block"><LangSwitch compact /></span>
            {maps ? (
              <a href={maps} target="_blank" rel="noopener noreferrer" className="tap inline-flex h-10 items-center gap-2 rounded-btn bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
                <S.pin className="h-4 w-4" /> {C.itinerary}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top">
        {/* ─────────────────────────────────────────── bandeau d'entrée */}
        <section className="border-b border-black/8">
          <div className="mx-auto w-full max-w-[1180px] px-5 pb-10 pt-[clamp(32px,5vw,60px)] sm:px-8">
            {site.category ? <span className={`vt-up block ${eyebrow}`}>{site.category}</span> : null}
            <h1 className="vt-up mt-3 max-w-[18ch] font-archivo text-[clamp(34px,6.5vw,64px)] font-extrabold leading-[0.98] tracking-[-0.04em] text-balance" style={{ animationDelay: "60ms" }}>
              {t.headline || t.name}
            </h1>
            <p className="vt-up mt-4 max-w-[60ch] text-[clamp(15.5px,2vw,18px)] leading-[1.6] text-ink/60" style={{ animationDelay: "120ms" }}>{intro}</p>
          </div>
          {heroPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroPhoto} alt="" className="vt-up h-[clamp(220px,38vw,460px)] w-full object-cover" style={{ animationDelay: "160ms" }} />
          ) : null}
        </section>

        {/* Colonne de contenu + carte de renseignements collante. */}
        <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-5 py-[clamp(36px,6vw,72px)] sm:px-8 lg:grid-cols-[1fr_340px]">
          <div className="flex flex-col gap-[clamp(40px,6vw,72px)] lg:order-1">
            {t.aboutText ? (
              <Reveal id="lieu" as="section" className="scroll-mt-24 flex flex-col gap-4">
                <span className={eyebrow}>{num("lieu")} · {C.aboutChip}</span>
                <h2 className={h2}>{t.aboutTitle || C.aboutTitle}</h2>
                <div className="flex flex-col gap-3.5 text-[16px] leading-[1.7] text-ink/70">
                  {t.aboutText.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                </div>
                {t.aboutPhotoUrl && t.aboutPhotoUrl !== heroPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.aboutPhotoUrl} alt="" className="mt-2 aspect-[16/9] w-full rounded-[18px] border border-black/8 object-cover" />
                ) : null}
              </Reveal>
            ) : null}

            <Reveal id="prestations" as="section" className="scroll-mt-24 flex flex-col gap-4">
              <span className={eyebrow}>{num("prestations")} · {C.servicesChip}</span>
              <h2 className={h2}>{C.servicesTitle}</h2>
              <ul className="mt-2 flex flex-col">
                {services.map((s) => (
                  <li key={s.title} className="flex flex-col gap-1.5 border-t border-black/8 py-5 first:border-t-0 first:pt-0">
                    <h3 className="font-archivo text-[19px] font-bold leading-tight tracking-[-0.02em]">{s.title}</h3>
                    {s.body ? <p className="max-w-[62ch] text-[14.5px] leading-[1.6] text-ink/60">{s.body}</p> : null}
                  </li>
                ))}
              </ul>
            </Reveal>

            {galerie.length > 0 ? (
              <Reveal as="section" className="flex flex-col gap-4">
                <span className={eyebrow}>{num("galerie")} · {C.galleryChip}</span>
                <h2 className={h2}>{C.galleryTitle}</h2>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {galerie.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" className="aspect-square w-full rounded-[14px] border border-black/8 object-cover" />
                  ))}
                </div>
              </Reveal>
            ) : null}

            {t.testimonials.length > 0 ? (
              <Reveal id="avis" as="section" className="scroll-mt-24 flex flex-col gap-4">
                <span className={eyebrow}>{num("avis")} · {C.reviewsChip}</span>
                <h2 className={h2}>{C.reviewsTitle}</h2>
                <div className="mt-2 flex flex-col gap-5">
                  {t.testimonials.slice(0, 5).map((a) => (
                    <figure key={a.id} className="border-l-2 border-brand/40 pl-5">
                      {a.rating != null ? <Stars rating={a.rating} /> : null}
                      <blockquote className="mt-2 text-[16px] leading-[1.65] text-ink/75">“{a.body}”</blockquote>
                      <figcaption className="mt-2 text-[13px] text-ink/50">
                        <span className="font-semibold text-ink/70">{a.author}</span>
                        {a.publishedLabel ? ` · ${a.publishedLabel}` : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </Reveal>
            ) : null}
          </div>

          {/* Sur téléphone, la carte passe EN TÊTE : quelqu'un qui ouvre le
              site d'un lieu depuis la rue cherche l'adresse et les horaires,
              pas la biographie. Sur grand écran elle repasse à droite et
              reste collée pendant tout le défilement. */}
          <div className="order-first lg:sticky lg:top-24 lg:order-2 lg:self-start">
            <InfoCard site={site} C={C} />
          </div>
        </div>

        {/* ──────────────────────────────────── programmes en ligne */}
        {site.offers.length > 0 ? (
          <section id="programmes" className="scroll-mt-24 border-t border-black/8 bg-[#fbfaf8]">
            <div className="mx-auto w-full max-w-[1180px] px-5 py-[clamp(52px,8vw,104px)] sm:px-8">
              <Reveal className="flex max-w-[70ch] flex-col gap-4">
                <span className={eyebrow}>{C.programsChip}</span>
                <h2 className="font-archivo text-[clamp(28px,4.6vw,46px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-balance">
                  {site.programsTitle || C.defaultProgramsTitle}
                </h2>
                <p className="text-[16.5px] leading-[1.65] text-ink/60">
                  {site.programsText || C.defaultProgramsText(t.name)}
                </p>
              </Reveal>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {C.programsBullets.map((b, i) => (
                  <Reveal key={b} delay={i * 60} className="flex flex-col gap-3 rounded-[18px] border border-black/8 bg-white p-6">
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand"><S.check className="h-4.5 w-4.5" /></span>
                    <p className="text-[14.5px] leading-[1.6] text-ink/70">{b}</p>
                  </Reveal>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 rounded-[20px] border border-black/8 bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  {site.offers.slice(0, 3).map((o) => (
                    <span key={o.id} className="text-[15px] text-ink/70">
                      <span className="font-semibold text-ink">{o.name}</span>{" "}
                      <span className="font-archivo font-extrabold text-ink">
                        {formatEuros(o.billing_type === "subscription" ? o.price_month_cents : o.price_cents)}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  {site.leadMagnet ? (
                    <Link href={`/c/${t.slug}/decouverte`} className="tap inline-flex h-12 items-center justify-center rounded-btn border border-black/12 px-6 text-[15px] font-semibold text-ink transition-colors hover:border-ink/40">
                      {C.freeProgram}
                    </Link>
                  ) : null}
                  <Link href={`/c/${t.slug}#offres`} className="tap inline-flex h-12 items-center justify-center gap-2 rounded-btn bg-brand px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-hover">
                    {C.seePrograms} <S.arrow className="h-4.5 w-4.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-black/8">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Brand site={site} imgClass="h-9" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13.5px] text-ink/55">
            <Link href={`/connexion?c=${t.slug}`} className="hover:text-ink">{C.login}</Link>
            <Link href="/mentions-legales" className="hover:text-ink">{C.legal}</Link>
            {t.googleMapsUrl ? <a href={t.googleMapsUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:text-ink">Google</a> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
