import type { CSSProperties } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/landing-templates/mobile-nav";
import Link from "next/link";
import { type Offer, type PublicTenant } from "@/lib/offers";
import { formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { S } from "@/components/landing-icons";
import { SubscriptionPrice } from "@/components/subscription-price";
import { Reveal } from "@/components/reveal";
import { LeadBand } from "@/components/landing-templates/lead-band";
import { AuthorEngine } from "@/components/landing-templates/author-engine";
import { offerCardCopy, landingCopy, type LandingCopy, type Audience } from "@/components/landing-templates/coach-copy";
import { makeT, type Locale } from "@/lib/i18n";

// Template « Lumen » : design clair, éditorial et aéré. Même contenu que Onyx,
// habillage lumineux (fond papier chaud, encre sombre, accent de marque).

const eyebrow = "font-mono text-[11px] uppercase tracking-[0.18em] text-brand";
const sectionTitle =
  "font-archivo font-extrabold tracking-[-0.03em] text-ink text-[clamp(28px,5vw,48px)] leading-[1.04] text-balance";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-brand/25 bg-brand/[0.07] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-brand">
      {children}
    </span>
  );
}

function Brand({ tenant, imgClass = "h-11", textClass = "text-[20px]" }: { tenant: PublicTenant; imgClass?: string; textClass?: string }) {
  if (tenant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={tenant.logoUrl} alt={tenant.name} className={`${imgClass} w-auto max-w-[260px] object-contain`} />;
  }
  return <span className={`font-archivo ${textClass} font-extrabold tracking-[-0.02em] text-ink`}>{tenant.name}</span>;
}

// Maquette « produit » claire pour le hero (aperçu de l'espace client).
function LumenAppCard({ name, L }: { name: string; L: LandingCopy }) {
  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <div className="rounded-[28px] border border-black/8 bg-white p-4 shadow-[0_40px_90px_-30px_rgba(30,20,10,.35)]">
        <div className="rounded-[20px] bg-[#faf8f5] p-4">
          <div className="flex items-center justify-between">
            <span className="font-archivo text-[13px] font-bold tracking-[-0.01em] text-ink">{name}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-brand/12 text-brand"><S.spark className="h-4 w-4" /></span>
          </div>
          <div className="mt-4 rounded-2xl border border-black/8 bg-white p-3.5">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.12em] text-ink/45">
              <span>{L.mockSession}</span><span className="text-brand">{L.mockDay}</span>
            </div>
            <ul className="mt-2.5 flex flex-col gap-2">
              {[["Développé couché", "4 × 8"], ["Tirage vertical", "4 × 10"], ["Élévations latérales", "3 × 15"]].map(([ex, sr], i) => (
                <li key={ex} className="flex items-center gap-2.5 text-[13px] text-ink/80">
                  <span className={`flex size-5 items-center justify-center rounded-md ${i < 2 ? "bg-brand text-white" : "border border-black/12 text-transparent"}`}><S.check className="h-3 w-3" /></span>
                  <span className="flex-1">{ex}</span>
                  <span className="font-mono text-[11px] text-ink/45">{sr}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["Prot.", "156 g"], ["Gluc.", "210 g"], ["Lip.", "62 g"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-black/8 bg-white p-2.5 text-center">
                <div className="font-archivo text-[15px] font-extrabold text-ink">{v}</div>
                <div className="text-[10px] text-ink/45">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-4 -left-4 rounded-2xl border border-black/8 bg-white px-4 py-3 shadow-[0_20px_50px_-20px_rgba(30,20,10,.4)]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand/12 text-brand"><S.chat className="h-5 w-5" /></span>
          <div>
            <div className="font-archivo text-[14px] font-extrabold leading-none text-ink">{L.mockCoach}</div>
            <div className="mt-0.5 text-[11px] text-ink/50">{L.mockCoachSub}</div>
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
    <article className={`relative flex flex-col gap-5 rounded-[24px] border p-7 transition-all duration-300 hover:-translate-y-1 ${featured ? "border-brand/40 bg-white shadow-[0_30px_70px_-32px_rgba(30,20,10,.45)]" : "border-black/8 bg-white hover:border-brand/30"}`}>
      {featured ? (
        <span className="absolute -top-3 left-6 rounded-pill bg-brand px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
          {L.mostChosen}
        </span>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <span className={eyebrow}>{copy.eyebrow}</span>
        <h3 className="font-archivo text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">{offer.name}</h3>
        {copy.pitch ? <p className="text-[14px] leading-[1.5] text-ink/60">{copy.pitch}</p> : null}
      </div>

      {isSub ? (
        <SubscriptionPrice
          slug={slug}
          offerId={offer.id}
          priceMonthCents={offer.price_month_cents}
          priceYearCents={offer.price_year_cents}
          chargesEnabled={chargesEnabled}
          variant="light"
        />
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2">
            <span className="font-archivo text-[clamp(40px,7vw,56px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
              {formatEuros(offer.price_cents)}
            </span>
            <span className="pb-2 text-[13px] text-ink/50">{L.oneTime}</span>
          </div>
          {copy.perMonthCents > 0 ? (
            <span className="text-[13px] text-ink/55">
              {L.perMonthOn(formatEuros(copy.perMonthCents), offer.duration_months)}
            </span>
          ) : null}
        </div>
      )}

      <ul className="flex flex-col gap-2 border-t border-black/8 pt-4">
        {copy.bullets.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-ink/75">
            <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
            {it}
          </li>
        ))}
      </ul>

      {!isSub &&
        (chargesEnabled ? (
          <Link
            href={`/inscription?c=${slug}&offer=${offer.id}`}
            className="tap inline-flex h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-btn bg-brand px-5 text-[15px] font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]"
          >
            {L.choose}
            <S.arrow className="h-4.5 w-4.5 shrink-0" />
          </Link>
        ) : (
          <span className="inline-flex h-[52px] items-center justify-center rounded-btn border border-black/10 px-6 text-[14px] text-ink/40">
            {L.soon}
          </span>
        ))}
    </article>
  );
}

// Petite illustration claire réutilisable (encadré tramé + libellé).
function ShotFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-black/8 bg-white p-6 shadow-[0_30px_70px_-34px_rgba(30,20,10,.4)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(20,15,10,.06) 1px, transparent 0)", backgroundSize: "22px 22px" }} />
      <div className="relative">{children}</div>
    </div>
  );
}

export function CoachLumen({ tenant, offers, leadMagnet = false, locale = "fr" }: { tenant: PublicTenant; offers: Offer[]; leadMagnet?: boolean; locale?: Locale }) {
  // Coach indépendant ou salle : deux discours distincts pour un même design.
  const L = landingCopy(locale, tenant.businessType);
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const title = tenant.headline || tenant.name;
  const tagline =
    tenant.tagline ||
    L.defaultTagline;

  return (
    <div
      className="min-h-dvh scroll-smooth bg-[#f6f4ef] pb-[76px] text-ink sm:pb-0"
      style={
        {
          ["--color-brand" as string]: accent,
          ["--color-brand-hover" as string]: `color-mix(in srgb, ${accent} 85%, #000)`,
          // Le template clair fige son encre : la landing publique ne doit pas
          // basculer si le visiteur a activé le thème sombre de l'app.
          ["--color-ink" as string]: "#1b1815",
        } as CSSProperties
      }
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes lmUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .lm-up { animation: lmUp .85s cubic-bezier(.22,1,.36,1) both }
      `,
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f6f4ef]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="#top" className="flex items-center"><Brand tenant={tenant} imgClass="h-11 sm:h-14" /></Link>
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
            <span className="hidden h-5 w-px bg-black/10 md:block" aria-hidden />
            <MobileNav
              className="md:hidden"
              brand={<Brand tenant={tenant} imgClass="h-11" />}
              tone="light"
              bg="#f6f4ef"
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
            <span className="hidden md:block"><LangSwitch compact /></span>
            <Link href={`/connexion?c=${tenant.slug}`} className="hidden text-[14px] text-ink/70 transition-colors hover:text-ink sm:inline">
              {L.login}
            </Link>
            {offers.length > 0 ? (
              <a href="#offres" className="tap inline-flex h-10 items-center rounded-btn bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
                {L.seePrograms}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-32 -top-40 h-[460px] w-[460px] rounded-full blur-[120px]" style={{ background: `color-mix(in srgb, ${accent} 22%, transparent)` }} />
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-5 pb-16 pt-[clamp(40px,7vw,84px)] sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="lm-up inline-block"><Eyebrow><S.spark className="h-3.5 w-3.5" /> {L.heroChip}</Eyebrow></span>
              <h1 className="lm-up mt-5 max-w-[16ch] font-archivo text-[clamp(40px,8vw,80px)] font-extrabold leading-[0.96] tracking-[-0.04em] text-balance text-ink" style={{ animationDelay: "70ms" }}>
                {title}
              </h1>
              <p className="lm-up mt-5 max-w-[54ch] text-[clamp(16px,2.2vw,19px)] leading-[1.6] text-ink/65" style={{ animationDelay: "140ms" }}>{tagline}</p>
              <div className="lm-up mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ animationDelay: "210ms" }}>
                {offers.length > 0 ? (
                  <a href="#offres" className="tap inline-flex h-[54px] items-center justify-center gap-2 rounded-btn bg-brand px-8 text-[16px] font-semibold text-white shadow-[0_14px_40px_-12px_var(--color-brand)] transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                    {L.seePrograms} <S.arrow className="h-4.5 w-4.5" />
                  </a>
                ) : null}
                <a href="#methode" className="tap inline-flex h-[54px] items-center justify-center rounded-btn border border-black/12 bg-white px-8 text-[16px] font-semibold text-ink transition-colors duration-150 hover:border-ink/40">
                  {L.howItWorks}
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3">
                {L.heroChecks.map((t) => (
                  <span key={t} className="inline-flex items-center gap-2 text-[13.5px] text-ink/60">
                    <S.check className="h-4 w-4 text-brand" /> {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="lm-up" style={{ animationDelay: "180ms" }}><LumenAppCard name={tenant.name} L={L} /></div>
          </div>
        </section>

        {/* Bandeau repères */}
        <section className="border-y border-black/8 bg-white">
          <div className="mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-y-6 px-5 py-8 sm:px-8 lg:grid-cols-4">
            {L.stats.map((s) => (
              <div key={s.l} className="flex flex-col gap-1 px-2">
                <div className="font-archivo text-[clamp(24px,4vw,34px)] font-extrabold leading-none tracking-[-0.03em] text-ink">{s.v}</div>
                <div className="text-[13px] leading-[1.4] text-ink/55">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Fonctionnalités */}
        <section className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(56px,8vw,100px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Eyebrow>{L.featuresChip}</Eyebrow>
              <h2 className={sectionTitle}>{L.featuresTitle}</h2>
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {L.features.map((f, i) => (
                <div key={f.title} className={`flex flex-col gap-4 rounded-[20px] border p-6 transition-all duration-300 hover:-translate-y-1 ${i === 2 ? "border-brand/40 bg-brand/[0.05]" : "border-black/8 bg-white hover:border-brand/25"}`}>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-brand/10 text-brand">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-archivo text-[18px] font-bold leading-snug tracking-[-0.01em] text-ink">{f.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-ink/60">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Analyse de la salle */}
        <section className="border-t border-black/8 bg-white">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(52px,7vw,90px)] sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Eyebrow><S.camera className="h-3.5 w-3.5" /> {L.gymChip}</Eyebrow>
              <h2 className="font-archivo text-[clamp(26px,4vw,42px)] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink">
                {L.gymTitle}
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-ink/65">
                {L.gymBody}
              </p>
              <ul className="flex flex-col gap-2.5 pt-1">
                {L.gymBullets.map((b) => (
                  <li key={b} className="flex items-center gap-3 text-[15px] text-ink/75">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /> {b}
                  </li>
                ))}
              </ul>
            </div>
            <ShotFrame>
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.12em] text-ink/45">
                <span>Matériel détecté</span><span className="text-brand">IA</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {["Rack à squat", "Haltères 2–40 kg", "Poulie haute", "Banc réglable", "Barre EZ", "Kettlebells"].map((m) => (
                  <span key={m} className="inline-flex items-center gap-2 rounded-xl border border-black/8 bg-[#faf8f5] px-3 py-2.5 text-[13px] text-ink/80">
                    <S.check className="h-4 w-4 shrink-0 text-brand" /> {m}
                  </span>
                ))}
              </div>
            </ShotFrame>
          </div>
        </section>

        {/* Espace client */}
        <section id="espace" className="scroll-mt-24">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(52px,7vw,90px)] sm:px-8 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <ShotFrame>
                <LumenAppCard name={tenant.name} L={L} />
              </ShotFrame>
            </div>
            <div className="order-1 flex flex-col gap-5 lg:order-2">
              <Eyebrow><S.grid className="h-3.5 w-3.5" /> {L.spaceChip}</Eyebrow>
              <h2 className="font-archivo text-[clamp(26px,4vw,42px)] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink">
                {L.spaceTitle}
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-ink/65">
                {L.spaceBody}
              </p>
              <ul className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {L.spaceBullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-ink/75">
                    <S.check className="h-4.5 w-4.5 shrink-0 text-brand" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Nutrition */}
        <section className="border-t border-black/8 bg-white">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(52px,7vw,90px)] sm:px-8 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Eyebrow>{L.nutritionChip}</Eyebrow>
              <h2 className="font-archivo text-[clamp(26px,4vw,42px)] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink">
                {L.nutritionTitle}
              </h2>
              <p className="max-w-[52ch] text-[16px] leading-[1.65] text-ink/65">
                {L.nutritionBody}
              </p>
              <ul className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {L.nutritionBullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-ink/75">
                    <S.check className="h-4.5 w-4.5 shrink-0 text-brand" /> {b}
                  </li>
                ))}
              </ul>
            </div>
            <ShotFrame>
              <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/[0.06] p-4">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand"><S.heart className="h-6 w-6" /></span>
                <div className="text-[14px] text-ink/80">Bowl poulet & patate douce<br /><span className="text-ink/45">642 kcal · 12 min</span></div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {[["Prot.", "42 g"], ["Gluc.", "58 g"], ["Lip.", "16 g"]].map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-black/8 bg-[#faf8f5] p-3 text-center">
                    <div className="font-archivo text-[17px] font-extrabold text-ink">{v}</div>
                    <div className="text-[10px] text-ink/45">{k}</div>
                  </div>
                ))}
              </div>
            </ShotFrame>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="methode" className="scroll-mt-24">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(56px,8vw,100px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Eyebrow>Comment ça marche</Eyebrow>
              <h2 className={sectionTitle}>{L.stepsTitle}</h2>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {L.steps.map((s) => (
                <div key={s.k} className="flex flex-col gap-3 rounded-[20px] border border-black/8 bg-white p-7">
                  <div className="font-archivo text-[44px] font-extrabold leading-none tracking-[-0.04em] text-brand/25">{s.k}</div>
                  <h3 className="font-archivo text-[19px] font-bold tracking-[-0.02em] text-ink">{s.title}</h3>
                  <p className="text-[15px] leading-[1.6] text-ink/60">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Qui signe le programme, et ce que le moteur apporte */}
        <AuthorEngine L={L} name={tenant.name} tone="light" />

        {/* Est-ce pour toi */}
        <section className="scroll-mt-24 border-t border-black/8 bg-white">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(56px,8vw,100px)] sm:px-8">
            <h2 className={`${sectionTitle} max-w-[16ch]`}>{L.forWhoTitle}</h2>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {L.forWho.map((w) => (
                <div key={w.title} className="flex items-start gap-3 rounded-[18px] border border-black/8 bg-[#faf8f5] p-5">
                  <S.check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div className="flex flex-col gap-1">
                    <div className="font-archivo text-[15.5px] font-semibold leading-snug text-ink">{w.title}</div>
                    <div className="text-[13.5px] leading-[1.55] text-ink/55">{w.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* À propos (optionnel) */}
        {tenant.aboutEnabled && (tenant.aboutText || tenant.aboutPhotoUrl) ? (
          <section className="scroll-mt-24">
            <div className="mx-auto grid w-full max-w-[1120px] items-center gap-10 px-5 py-[clamp(56px,8vw,100px)] sm:px-8 lg:grid-cols-[minmax(0,320px)_1fr]">
              {tenant.aboutPhotoUrl ? (
                <div className="mx-auto w-full max-w-[320px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tenant.aboutPhotoUrl}
                    alt={tenant.aboutTitle || tenant.name}
                    className="aspect-square w-full rounded-[24px] border border-black/8 object-cover"
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-5">
                <Eyebrow>{L.aboutChip}</Eyebrow>
                <h2 className="font-archivo text-[clamp(26px,4vw,42px)] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink">
                  {tenant.aboutTitle || tenant.name}
                </h2>
                {tenant.aboutText ? (
                  <div className="flex max-w-[60ch] flex-col gap-3 text-[16px] leading-[1.7] text-ink/70">
                    {tenant.aboutText.split(/\n{2,}|\n/).filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* Lead magnet : mini-programme gratuit */}
        {leadMagnet ? (
          <section className="border-t border-black/8">
            <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(44px,6vw,72px)] sm:px-8">
              <LeadBand L={L} slug={tenant.slug} tone="light" />
            </div>
          </section>
        ) : null}

        <section id="offres" className="scroll-mt-20 border-t border-black/8 bg-white">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-[clamp(56px,8vw,100px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Eyebrow>{L.programsChip}</Eyebrow>
              <h2 className={sectionTitle}>{L.programsTitle}</h2>
            </Reveal>
            {offers.length === 0 ? (
              <div className="mx-auto mt-10 max-w-[520px] rounded-[20px] border border-black/8 bg-[#faf8f5] p-6 text-center text-[15px] text-ink/60">
                {L.noOffer}
              </div>
            ) : (
              <div
                className={`mx-auto mt-12 grid gap-5 ${
                  offers.length === 1
                    ? "max-w-[520px]"
                    : offers.length === 2
                      ? "max-w-[820px] sm:grid-cols-2"
                      : "max-w-[1120px] sm:grid-cols-2 lg:grid-cols-3"
                }`}
              >
                {offers.map((o) => (
                  <OfferCard key={o.id} offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
                ))}
              </div>
            )}

            {tenant.chargesEnabled && offers.some((o) => o.billing_type !== "subscription") ? (
              <div className="mx-auto mt-10 flex max-w-[560px] flex-col items-center gap-3 rounded-[24px] border border-black/8 bg-[#faf8f5] p-7 text-center">
                <div className="font-archivo text-[20px] font-bold tracking-[-0.02em] text-ink">
                  {L.giftTitle}
                </div>
                <p className="text-[14px] leading-[1.55] text-ink/60">
                  {L.giftBody}
                </p>
                <Link
                  href={`/c/${tenant.slug}/offrir`}
                  className="tap mt-1 inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-btn border border-brand bg-brand/10 px-6 text-[15px] font-semibold text-brand transition-colors hover:bg-brand/20"
                >
                  <S.spark className="h-4 w-4 text-brand" /> {L.giftCta}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-black/8">
          <div className="mx-auto w-full max-w-[820px] px-5 py-[clamp(56px,8vw,100px)] sm:px-8">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Eyebrow>{L.faqChip}</Eyebrow>
              <h2 className={sectionTitle}>{L.faqTitle}</h2>
            </Reveal>
            <div className="mt-10 flex flex-col gap-3">
              {L.faqs.map((f) => (
                <details key={f.q} className="group rounded-[18px] border border-black/8 bg-white px-5 py-4 open:border-brand/30">
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 font-archivo text-[15.5px] font-semibold leading-snug text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <S.chevron className="h-4.5 w-4.5 shrink-0 text-ink/40 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-[14px] leading-[1.65] text-ink/60">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-black/8 bg-white">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[720px] -translate-x-1/2 rounded-full blur-[130px]" style={{ background: `color-mix(in srgb, ${accent} 16%, transparent)` }} />
          <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center gap-7 px-5 py-[clamp(64px,10vw,120px)] text-center sm:px-8">
            <h2 className="max-w-[18ch] font-archivo text-[clamp(30px,5.5vw,56px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-balance text-ink">
              {L.finalTitle}
            </h2>
            {offers.length > 0 ? (
              <a href="#offres" className="tap inline-flex h-[56px] items-center justify-center gap-2 rounded-btn bg-brand px-9 text-[16px] font-semibold text-white shadow-[0_14px_40px_-12px_var(--color-brand)] transition-[transform,background-color] duration-150 hover:bg-brand-hover active:scale-[0.98]">
                {L.seePrograms} <S.arrow className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/8 bg-[#f6f4ef]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-12 sm:px-8">
          <Brand tenant={tenant} imgClass="h-10" textClass="text-[18px]" />
          <p className="max-w-[70ch] text-[13px] leading-[1.6] text-ink/50">
            {L.legalNote}
          </p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[13px] text-ink/50">
            <Link href="/connexion" className="transition-colors hover:text-ink">{L.footerLogin}</Link>
            <Link href="/mentions-legales" className="transition-colors hover:text-ink">{L.footerLegal}</Link>
            <Link href="/confidentialite" className="transition-colors hover:text-ink">{L.footerPrivacy}</Link>
            <Link href="/cgv" className="transition-colors hover:text-ink">{L.footerTerms}</Link>
          </nav>
          <p className="pt-1 text-[12px] text-ink/35">
            {L.poweredBy} <span className="font-archivo font-bold text-ink/60">My Fitness <span className="text-brand">App</span></span>.
          </p>
        </div>
      </footer>

      {/* CTA collante mobile */}
      {offers.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-[#f6f4ef]/92 px-4 py-3 backdrop-blur-xl sm:hidden">
          <a href="#offres" className="tap flex w-full items-center justify-center gap-2 rounded-btn bg-brand py-3.5 text-[15px] font-semibold text-white active:scale-[0.98]">
            {L.seePrograms} <S.arrow className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
