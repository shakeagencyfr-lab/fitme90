import type { CSSProperties } from "react";
import Link from "next/link";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/mobile-nav";
import { Reveal } from "@/components/reveal";
import { S } from "@/components/landing-icons";
import { formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { themeVars, themeAttrs } from "@/lib/theme";
import type { Locale } from "@/lib/i18n";
import type { PublicSite } from "@/lib/site";
import { siteCopy, servicesOf, introOf } from "@/components/site-templates/site-copy";
import { durationLabel, mapsHref, telHref } from "@/components/site-templates/site-utils";

// Habillage « Atelier » : clair, éditorial, chaleureux.
//
// Le repère visuel est le papier : fond crème, filets fins, colonnes larges,
// et une seule couleur d'accent, celle de la marque du coach. C'est
// l'habillage par défaut parce qu'il convient à un cabinet, un studio, un
// coach indépendant, sans jamais crier.

// `w-fit` : dans une colonne flex, un `inline-flex` s'étire sur toute la
// largeur et la pastille devient une barre.
const chip =
  "w-fit inline-flex items-center gap-2 rounded-pill border border-brand/25 bg-brand/[0.07] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand";
const h2 =
  "font-archivo font-extrabold tracking-[-0.03em] text-ink text-[clamp(26px,4.6vw,44px)] leading-[1.05] text-balance";

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
        <S.star key={n} className={`h-4 w-4 ${n <= Math.round(rating) ? "text-[#e8a33d]" : "text-black/15"}`} />
      ))}
    </span>
  );
}

export function SiteAtelier({ site, locale = "fr" }: { site: PublicSite; locale?: Locale }) {
  const C = siteCopy(locale, site.tenant.businessType);
  const accent = site.tenant.brandColor || DEFAULT_BRAND_COLOR;
  const t = site.tenant;
  const services = servicesOf(site, C);
  const intro = introOf(site, C);
  const heroPhoto = site.photos[0] ?? t.aboutPhotoUrl;
  const galerie = site.photos.slice(site.photos[0] === heroPhoto ? 1 : 0);
  const maps = mapsHref(site);
  const tel = telHref(site);
  const aPhotoLieu = !!t.aboutPhotoUrl && t.aboutPhotoUrl !== heroPhoto;

  const nav = [
    t.aboutText ? ["#lieu", C.navAbout] : null,
    ["#prestations", C.navServices],
    site.address || site.openingHours.length > 0 ? ["#infos", C.navPractical] : null,
    site.offers.length > 0 ? ["#programmes", C.navPrograms] : null,
  ].filter((v): v is [string, string] => v !== null);

  return (
    <div
      className="min-h-dvh scroll-smooth bg-[#f7f4ee] text-ink"
      style={
        {
          ...themeVars(t.theme),
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
          // La page publique fige son encre : elle ne doit pas basculer si le
          // visiteur a laissé le thème sombre de l'application activé.
          ["--color-ink" as string]: "#1b1815",
        } as CSSProperties
      }
      {...themeAttrs(t.theme)}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes atUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        .at-up { animation: atUp .8s cubic-bezier(.22,1,.36,1) both }
      `,
        }}
      />

      <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f7f4ee]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
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
              bg="#f7f4ee"
              radius={12}
              langLabel={locale === "en" ? "Language" : "Langue"}
              links={nav.map(([href, label]) => ({ href, label }))}
              login={{ href: `/connexion?c=${t.slug}`, label: C.login }}
              cta={maps ? { href: maps, label: C.itinerary } : undefined}
            />
            <span className="hidden md:block"><LangSwitch compact /></span>
            {tel ? (
              <a href={tel} className="tap hidden h-10 items-center gap-2 rounded-btn border border-black/12 bg-white px-4 text-[14px] font-semibold text-ink transition-colors hover:border-ink/40 sm:inline-flex">
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
        {/* ───────────────────────────────────────────────────────── hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 -top-40 h-[420px] w-[420px] rounded-full blur-[120px]" style={{ background: `color-mix(in srgb, ${accent} 20%, transparent)` }} />
          {/* Sans photo, la colonne de droite serait un grand vide à côté du
              titre : la grille retombe sur une seule colonne, et le texte
              s'autorise alors des lignes plus longues. */}
          <div className={`mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 pb-14 pt-[clamp(36px,6vw,72px)] sm:px-8 ${heroPhoto ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}>
            <div>
              {site.category ? <span className="at-up inline-block"><span className={chip}><S.spark className="h-3.5 w-3.5" /> {site.category}</span></span> : null}
              <h1
                className={`at-up mt-5 font-archivo text-[clamp(38px,7.5vw,72px)] font-extrabold leading-[0.97] tracking-[-0.04em] text-balance text-ink ${heroPhoto ? "max-w-[16ch]" : "max-w-[22ch]"}`}
                style={{ animationDelay: "70ms" }}
              >
                {t.headline || t.name}
              </h1>
              <p className="at-up mt-5 max-w-[54ch] text-[clamp(16px,2.1vw,19px)] leading-[1.6] text-ink/65" style={{ animationDelay: "140ms" }}>{intro}</p>

              {t.googleRating != null ? (
                <div className="at-up mt-6 inline-flex items-center gap-3 rounded-pill border border-black/10 bg-white px-4 py-2.5" style={{ animationDelay: "180ms" }}>
                  <Stars rating={t.googleRating} />
                  <span className="font-archivo text-[15px] font-extrabold text-ink">{t.googleRating.toFixed(1)}</span>
                  {t.googleReviewsCount ? <span className="text-[13px] text-ink/55">{C.reviewsOn(t.googleReviewsCount)}</span> : null}
                </div>
              ) : null}

              <div className="at-up mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ animationDelay: "220ms" }}>
                {maps ? (
                  <a href={maps} target="_blank" rel="noopener noreferrer" className="tap inline-flex h-[52px] items-center justify-center gap-2 rounded-btn bg-brand px-7 text-[16px] font-semibold text-white shadow-[0_14px_40px_-14px_var(--color-brand)] transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                    <S.pin className="h-4.5 w-4.5" /> {C.itinerary}
                  </a>
                ) : null}
                {site.offers.length > 0 ? (
                  <a href="#programmes" className="tap inline-flex h-[52px] items-center justify-center rounded-btn border border-black/12 bg-white px-7 text-[16px] font-semibold text-ink transition-colors duration-150 hover:border-ink/40">
                    {C.seePrograms}
                  </a>
                ) : null}
              </div>
            </div>

            {heroPhoto ? (
              <div className="at-up" style={{ animationDelay: "180ms" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroPhoto} alt={t.name} className="aspect-[4/3] w-full rounded-[26px] border border-black/8 object-cover shadow-[0_40px_90px_-40px_rgba(30,20,10,.5)]" />
              </div>
            ) : null}
          </div>
        </section>

        {/* ────────────────────────────────────────────────────── le lieu */}
        {t.aboutText ? (
          <section id="lieu" className="scroll-mt-24 border-y border-black/8 bg-white">
            {/* Sans photo, la colonne de texte se retrouvait à 0.9fr avec un
                grand vide à droite. On garde alors une colonne unique, et
                c'est la largeur de LECTURE qui borne le texte. */}
            <div className={`mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(48px,7vw,88px)] sm:px-8 ${aPhotoLieu ? "lg:grid-cols-[0.9fr_1.1fr]" : ""}`}>
              {aPhotoLieu ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.aboutPhotoUrl!} alt={t.aboutTitle || t.name} className="aspect-[4/5] w-full rounded-[24px] border border-black/8 object-cover" />
              ) : null}
              <Reveal className={`flex flex-col gap-5 ${aPhotoLieu ? "" : "max-w-[68ch]"}`}>
                <span className={chip}>{C.aboutChip}</span>
                <h2 className={h2}>{t.aboutTitle || C.aboutTitle}</h2>
                <div className="flex flex-col gap-3.5 text-[16px] leading-[1.7] text-ink/70">
                  {t.aboutText.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                </div>
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* ──────────────────────────────────────────────── prestations */}
        <section id="prestations" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(48px,7vw,88px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <span className={chip}>{C.servicesChip}</span>
              <h2 className={h2}>{C.servicesTitle}</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <Reveal key={s.title} delay={i * 60} className="flex flex-col gap-3 rounded-[20px] border border-black/8 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/30">
                  <span className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand"><S.dumbbell className="h-5 w-5" /></span>
                  <h3 className="font-archivo text-[19px] font-bold leading-tight tracking-[-0.02em] text-ink">{s.title}</h3>
                  {s.body ? <p className="text-[14.5px] leading-[1.6] text-ink/60">{s.body}</p> : null}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────── galerie */}
        {galerie.length > 0 ? (
          <section className="border-y border-black/8 bg-white">
            <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(48px,7vw,88px)] sm:px-8">
              <Reveal className="flex flex-col gap-3">
                <span className={chip}>{C.galleryChip}</span>
                <h2 className={h2}>{C.galleryTitle}</h2>
              </Reveal>
              {/* Défilement horizontal sur téléphone, mosaïque au-delà : une
                  grille de vignettes sur un écran de 390 px ne montre rien. */}
              <div className="mt-8 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
                {galerie.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className={`h-[220px] w-[280px] shrink-0 snap-start rounded-[18px] border border-black/8 object-cover sm:h-auto sm:w-auto ${i % 5 === 0 ? "sm:aspect-[4/5] sm:row-span-2" : "sm:aspect-[4/3]"}`} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ─────────────────────────────────────────────── infos pratiques */}
        {site.address || site.openingHours.length > 0 || site.phone ? (
          <section id="infos" className="scroll-mt-24">
            <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(48px,7vw,88px)] sm:px-8">
              <Reveal className="flex flex-col gap-3">
                <span className={chip}>{C.practicalChip}</span>
                <h2 className={h2}>{C.practicalTitle}</h2>
              </Reveal>
              <div className="mt-10 grid gap-4 lg:grid-cols-2">
                <Reveal className="flex flex-col gap-5 rounded-[20px] border border-black/8 bg-white p-7">
                  {site.address ? (
                    <div className="flex items-start gap-3.5">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><S.pin className="h-4.5 w-4.5" /></span>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/40">{C.addressLabel}</span>
                        <span className="text-[15.5px] leading-[1.5] text-ink/80">{site.address}</span>
                        {maps ? <a href={maps} target="_blank" rel="noopener noreferrer" className="mt-1 text-[14px] font-semibold text-brand hover:underline">{C.itinerary} ↗</a> : null}
                      </div>
                    </div>
                  ) : null}
                  {site.phone ? (
                    <div className="flex items-start gap-3.5 border-t border-black/8 pt-5">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><S.phone className="h-4.5 w-4.5" /></span>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/40">{C.phoneLabel}</span>
                        {tel ? <a href={tel} className="text-[15.5px] font-semibold text-ink hover:text-brand">{site.phone}</a> : <span className="text-[15.5px] text-ink/80">{site.phone}</span>}
                      </div>
                    </div>
                  ) : null}
                  {site.websiteUrl ? (
                    <div className="flex items-start gap-3.5 border-t border-black/8 pt-5">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"><S.globe className="h-4.5 w-4.5" /></span>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/40">{C.websiteLabel}</span>
                        <a href={site.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[15px] text-brand hover:underline">{site.websiteUrl.replace(/^https?:\/\//, "")}</a>
                      </div>
                    </div>
                  ) : null}
                </Reveal>

                {site.openingHours.length > 0 ? (
                  <Reveal delay={80} className="flex flex-col gap-4 rounded-[20px] border border-black/8 bg-white p-7">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-brand"><S.clock className="h-4.5 w-4.5" /></span>
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink/40">{C.hoursLabel}</span>
                    </div>
                    <ul className="flex flex-col">
                      {site.openingHours.map((d) => (
                        <li key={d.day} className="flex items-baseline justify-between gap-4 border-b border-black/6 py-2.5 text-[15px] last:border-0">
                          <span className="capitalize text-ink/70">{d.day}</span>
                          <span className="text-right font-medium text-ink">{d.hours}</span>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* ────────────────────────────────────────────────────── avis */}
        {t.testimonials.length > 0 ? (
          <section className="border-y border-black/8 bg-white">
            <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(48px,7vw,88px)] sm:px-8">
              <Reveal className="flex flex-col items-center gap-4 text-center">
                <span className={chip}>{C.reviewsChip}</span>
                <h2 className={h2}>{C.reviewsTitle}</h2>
              </Reveal>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {t.testimonials.slice(0, 6).map((a, i) => (
                  <Reveal key={a.id} delay={i * 50} className="flex flex-col gap-3 rounded-[20px] border border-black/8 bg-[#f7f4ee] p-6">
                    {a.rating != null ? <Stars rating={a.rating} /> : null}
                    <p className="text-[14.5px] leading-[1.65] text-ink/75">“{a.body}”</p>
                    <div className="mt-auto flex items-baseline gap-2 pt-2 text-[13px]">
                      <span className="font-semibold text-ink">{a.author}</span>
                      {a.publishedLabel ? <span className="text-ink/45">· {a.publishedLabel}</span> : null}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ──────────────────────────────────────── programmes en ligne */}
        {site.offers.length > 0 ? (
          <section id="programmes" className="scroll-mt-24">
            <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(56px,8vw,104px)] sm:px-8">
              <div className="overflow-hidden rounded-[28px] border border-black/8 bg-ink text-white">
                <div className="grid gap-10 p-7 sm:p-12 lg:grid-cols-[1.05fr_0.95fr]">
                  <Reveal className="flex flex-col gap-5">
                    <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-white/80">
                      <S.ai className="h-3.5 w-3.5" /> {C.programsChip}
                    </span>
                    <h2 className="font-archivo text-[clamp(28px,4.6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance">
                      {site.programsTitle || C.defaultProgramsTitle}
                    </h2>
                    <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/70">
                      {site.programsText || C.defaultProgramsText(t.name)}
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {C.programsBullets.map((b) => (
                        <li key={b} className="flex items-start gap-2.5 text-[14.5px] leading-[1.55] text-white/80">
                          <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" /> {b}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                      <Link href={`/c/${t.slug}#offres`} className="tap inline-flex h-[52px] items-center justify-center gap-2 rounded-btn bg-brand px-7 text-[16px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                        {C.seePrograms} <S.arrow className="h-4.5 w-4.5" />
                      </Link>
                      {site.leadMagnet ? (
                        <Link href={`/c/${t.slug}/decouverte`} className="tap inline-flex h-[52px] items-center justify-center rounded-btn border border-white/25 px-7 text-[16px] font-semibold text-white transition-colors hover:border-white/60">
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
                        className="group flex items-center justify-between gap-4 rounded-[18px] border border-white/12 bg-white/[0.06] p-5 transition-colors hover:border-brand/50 hover:bg-white/[0.1]"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-archivo text-[18px] font-bold leading-tight tracking-[-0.02em]">{o.name}</span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">{durationLabel(o, locale)}</span>
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
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-black/8 bg-white">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
