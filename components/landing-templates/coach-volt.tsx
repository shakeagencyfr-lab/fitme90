import type { CSSProperties } from "react";
import { LangSwitch } from "@/components/lang-switch";
import { MobileNav } from "@/components/mobile-nav";
import Link from "next/link";
import { type Offer, type PublicTenant } from "@/lib/offers";
import { formatEuros, DEFAULT_BRAND_COLOR } from "@/lib/config";
import { S } from "@/components/landing-icons";
import { SubscriptionPrice } from "@/components/subscription-price";
import { Reveal, RevealGroup } from "@/components/reveal";
import { Rail, Marquee } from "@/components/landing-templates/rail";
import { LeadBand } from "@/components/landing-templates/lead-band";
import { AuthorEngine } from "@/components/landing-templates/author-engine";
import { offerCardCopy, landingCopy, type LandingCopy, type Audience } from "@/components/landing-templates/coach-copy";
import { makeT, type Locale } from "@/lib/i18n";
import { themeVars, themeAttrs } from "@/lib/theme";

// Template « Volt » : sombre, contrasté, tranchant.
//
// Il partageait auparavant la structure de Lumen à quelques bordures près, ce
// qui lui donnait l'air d'une variante de couleur plutôt que d'un design. Ici
// la STRUCTURE change :
//   - une bande de mots-clés qui défile, entre le hero et le reste
//   - les fonctionnalités et les programmes en RAILS HORIZONTAUX au milieu
//     d'une page qui, elle, défile verticalement
//   - des blocs pleine largeur en alternance plutôt que des grilles de cartes
//   - des chiffres surdimensionnés et des angles droits
//
// Le fond est figé en sombre : la landing publique ne doit pas basculer si le
// visiteur a activé le thème clair de l'application.

const INK = "#e9eaec";
const BG = "#0b0c0e";
const PANEL = "#111316";

const sectionTitle =
  "font-archivo font-extrabold uppercase tracking-[-0.02em] text-[clamp(28px,5vw,52px)] leading-[0.98] text-balance";

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 bg-brand px-3 py-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-white">
      {children}
    </span>
  );
}

function Brand({ tenant, imgClass = "h-11", textClass = "text-[20px]" }: { tenant: PublicTenant; imgClass?: string; textClass?: string }) {
  if (tenant.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={tenant.logoUrl} alt={tenant.name} className={`${imgClass} w-auto max-w-[260px] object-contain`} />;
  }
  return <span className={`font-archivo ${textClass} font-extrabold uppercase tracking-[-0.01em] text-white`}>{tenant.name}</span>;
}

// Maquette de l'espace client, version sombre.
function VoltAppCard({ name, L }: { name: string; L: LandingCopy }) {
  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <div className="border border-white/12 bg-[#141619] p-4">
        <div className="border border-white/8 bg-[#0e1013] p-4">
          <div className="flex items-center justify-between">
            <span className="font-archivo text-[13px] font-bold uppercase tracking-[-0.01em] text-white">{name}</span>
            <span className="flex size-8 items-center justify-center bg-brand/20 text-brand"><S.spark className="h-4 w-4" /></span>
          </div>
          <div className="mt-4 border border-white/10 bg-[#141619] p-3.5">
            <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/40">
              <span>{L.mockSession}</span><span className="text-brand">{L.mockDay}</span>
            </div>
            <ul className="mt-2.5 flex flex-col gap-2">
              {[["Développé couché", "4 × 8"], ["Tirage vertical", "4 × 10"], ["Élévations latérales", "3 × 15"]].map(([ex, sr], i) => (
                <li key={ex} className="flex items-center gap-2.5 text-[13px] text-white/80">
                  <span className={`flex size-5 items-center justify-center ${i < 2 ? "bg-brand text-white" : "border border-white/20 text-transparent"}`}><S.check className="h-3 w-3" /></span>
                  <span className="flex-1">{ex}</span>
                  <span className="font-mono text-[11px] text-white/35">{sr}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[["Prot.", "156 g"], ["Gluc.", "210 g"], ["Lip.", "62 g"]].map(([k, v]) => (
              <div key={k} className="border border-white/10 bg-[#141619] p-2.5 text-center">
                <div className="font-archivo text-[15px] font-extrabold text-white">{v}</div>
                <div className="text-[10px] text-white/35">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-5 -left-5 border border-white/12 bg-[#141619] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center bg-brand/20 text-brand"><S.chat className="h-5 w-5" /></span>
          <div>
            <div className="font-archivo text-[14px] font-extrabold uppercase leading-none text-white">{L.mockCoach}</div>
            <div className="mt-0.5 text-[11px] text-white/45">{L.mockCoachSub}</div>
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
    <article className={`lift relative flex h-full flex-col gap-5 border p-7 ${featured ? "border-brand bg-[#15171a]" : "border-white/12 bg-[#111316]"}`}>
      {featured ? (
        <span className="absolute -top-3 left-6 bg-brand px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white">
          {L.mostChosen}
        </span>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">{copy.eyebrow}</span>
        <h3 className="font-archivo text-[22px] font-extrabold uppercase leading-tight tracking-[-0.02em] text-white">{offer.name}</h3>
        {copy.pitch ? <p className="text-[14px] leading-[1.5] text-white/55">{copy.pitch}</p> : null}
      </div>

      {isSub ? (
        <SubscriptionPrice
          slug={slug}
          offerId={offer.id}
          priceMonthCents={offer.price_month_cents}
          priceYearCents={offer.price_year_cents}
          chargesEnabled={chargesEnabled}
          variant="dark"
        />
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-end gap-2">
            <span className="font-archivo text-[clamp(40px,7vw,56px)] font-extrabold leading-none tracking-[-0.04em] text-white">
              {formatEuros(offer.price_cents)}
            </span>
            <span className="pb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">{L.oneTime}</span>
          </div>
          {copy.perMonthCents > 0 ? (
            <span className="text-[13px] text-white/50">
              {L.perMonthOn(formatEuros(copy.perMonthCents), offer.duration_months)}
            </span>
          ) : null}
        </div>
      )}

      <ul className="flex flex-1 flex-col gap-2 border-t border-white/12 pt-4">
        {copy.bullets.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-white/70">
            <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
            {it}
          </li>
        ))}
      </ul>

      {!isSub &&
        (chargesEnabled ? (
          <Link
            href={`/inscription?c=${slug}&offer=${offer.id}`}
            className="press tap inline-flex h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap bg-brand px-5 font-archivo text-[15px] font-bold uppercase tracking-[0.02em] text-white hover:bg-brand-hover"
          >
            {L.choose}
            <S.arrow className="h-4.5 w-4.5 shrink-0" />
          </Link>
        ) : (
          <span className="inline-flex h-[52px] items-center justify-center border border-white/12 px-6 text-[14px] text-white/35">
            {L.soon}
          </span>
        ))}
    </article>
  );
}

/** Bloc pleine largeur en deux colonnes, alterné gauche/droite. */
function Split({
  tag,
  title,
  body,
  bullets,
  flip = false,
  children,
}: {
  tag: string;
  title: string;
  body: string;
  bullets: string[];
  flip?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 ${flip ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <Reveal className="flex flex-col gap-5" direction={flip ? "right" : "left"}>
        <Tag>{tag}</Tag>
        <h2 className={`${sectionTitle} text-white`}>{title}</h2>
        <p className="max-w-[52ch] text-[16px] leading-[1.65] text-white/60">{body}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-white/70">
              <S.check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand" />
              {b}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal direction={flip ? "left" : "right"}>{children}</Reveal>
    </div>
  );
}

export function CoachVolt({ tenant, offers, leadMagnet = false, locale = "fr" }: { tenant: PublicTenant; offers: Offer[]; leadMagnet?: boolean; locale?: Locale }) {
  // Coach indépendant ou salle : deux discours distincts pour un même design.
  const L = landingCopy(locale, tenant.businessType);
  const accent = tenant.brandColor || DEFAULT_BRAND_COLOR;
  const title = tenant.headline || tenant.name;
  const tagline = tenant.tagline || L.defaultTagline;
  const marquee = [...L.heroChecks, ...L.stats.map((s) => s.l)];

  return (
    <div
      className="min-h-dvh scroll-smooth pb-[76px] sm:pb-0"
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
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0c0e]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link href="#top" className="flex items-center"><Brand tenant={tenant} imgClass="h-11 sm:h-14" /></Link>
          <nav className="hidden items-center gap-6 md:flex">
            {[
              ["#auteur", L.navMethod],
              ["#offres", L.navPrograms],
              ["#faq", L.navFaq],
            ].map(([href, label]) => (
              <a key={href} href={href} className="underline-grow font-archivo text-[13px] font-bold uppercase tracking-[0.06em] text-white/55 transition-colors hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden h-5 w-px bg-white/15 md:block" aria-hidden />
            <MobileNav
              className="md:hidden"
              brand={<Brand tenant={tenant} imgClass="h-11" />}
              tone="dark"
              bg="#0b0c0e"
              radius={0}
              uppercase
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
            <Link href={`/connexion?c=${tenant.slug}`} className="hidden text-[14px] text-white/60 transition-colors hover:text-white sm:inline">
              {L.login}
            </Link>
            {offers.length > 0 ? (
              <a href="#offres" className="press tap inline-flex h-10 items-center bg-brand px-4 font-archivo text-[13px] font-bold uppercase tracking-[0.04em] text-white hover:bg-brand-hover">
                {L.seePrograms}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero : titre surdimensionné, dalle de marque en diagonale */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[10%] top-[-20%] h-[520px] w-[520px] rotate-12 opacity-[0.16]"
            style={{ background: `linear-gradient(135deg, ${accent}, transparent 62%)` }}
          />
          <div className="mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-16 pt-[clamp(40px,7vw,84px)] sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Reveal><Tag><S.spark className="h-3.5 w-3.5" /> {L.heroChip}</Tag></Reveal>
              <Reveal delay={60}>
                <h1 className="mt-5 max-w-[15ch] font-archivo text-[clamp(42px,8.6vw,88px)] font-extrabold uppercase leading-[0.92] tracking-[-0.045em] text-balance text-white">
                  {title}
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-6 max-w-[54ch] text-[clamp(16px,2.2vw,19px)] leading-[1.6] text-white/60">{tagline}</p>
              </Reveal>
              <Reveal delay={180}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {offers.length > 0 ? (
                    <a href="#offres" className="press tap inline-flex h-[56px] items-center justify-center gap-2 bg-brand px-9 font-archivo text-[15px] font-bold uppercase tracking-[0.04em] text-white hover:bg-brand-hover">
                      {L.seePrograms} <S.arrow className="h-4.5 w-4.5" />
                    </a>
                  ) : null}
                  <a href="#auteur" className="press tap inline-flex h-[56px] items-center justify-center border border-white/20 px-9 font-archivo text-[15px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:border-white/50">
                    {L.howItWorks}
                  </a>
                </div>
              </Reveal>
            </div>
            <Reveal delay={140} direction="scale"><VoltAppCard name={tenant.name} L={L} /></Reveal>
          </div>
        </section>

        {/* Bande défilante : rythme la page sans rien demander au visiteur */}
        <div className="border-b border-white/10 bg-[#0e1013]">
          <Marquee items={marquee} />
        </div>

        {/* Repères chiffrés */}
        <section className="border-b border-white/10">
          <div className="mx-auto grid w-full max-w-[1240px] grid-cols-2 divide-white/10 px-5 sm:px-8 lg:grid-cols-4 lg:divide-x">
            {L.stats.map((s) => (
              <div key={s.l} className="flex flex-col gap-2 py-9 lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <div className="font-archivo text-[clamp(22px,3.4vw,32px)] font-extrabold uppercase leading-none tracking-[-0.03em] text-white">{s.v}</div>
                <div className="text-[13px] leading-[1.45] text-white/45">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Fonctionnalités : RAIL horizontal */}
        <section className="scroll-mt-24 border-b border-white/10 py-[clamp(52px,7vw,88px)]">
          <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
            <Reveal className="flex flex-col gap-4">
              <Tag>{L.featuresChip}</Tag>
              <h2 className={`${sectionTitle} max-w-[18ch] text-white`}>{L.featuresTitle}</h2>
            </Reveal>
          </div>
          <div className="mx-auto mt-10 w-full max-w-[1240px]">
            <Rail tone="dark" hint={locale === "en" ? "Slide" : "Fais glisser"}>
              {L.features.map((f, i) => (
                <article
                  key={f.title}
                  className={`lift flex w-[260px] flex-col gap-4 border p-6 sm:w-[300px] ${i === 3 ? "border-brand bg-[#15171a]" : "border-white/12 bg-[#111316]"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center bg-brand/15 text-brand">
                      <f.icon className="h-6 w-6" />
                    </span>
                    <span className="font-mono text-[11px] tracking-[0.16em] text-white/25">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="font-archivo text-[18px] font-extrabold uppercase leading-snug tracking-[-0.01em] text-white">{f.title}</h3>
                  <p className="text-[14px] leading-[1.6] text-white/55">{f.body}</p>
                </article>
              ))}
            </Rail>
          </div>
        </section>

        {/* Trois blocs pleine largeur, alternés */}
        <section id="espace" className="scroll-mt-24 border-b border-white/10">
          <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-[clamp(56px,8vw,104px)] px-5 py-[clamp(56px,8vw,104px)] sm:px-8">
            <Split tag={L.gymChip} title={L.gymTitle} body={L.gymBody} bullets={L.gymBullets}>
              <div className="border border-white/12 bg-[#111316] p-6">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">{L.gymScanLabel}</div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {L.gymBullets.map((b) => (
                    <div key={b} className="flex items-center gap-2 border border-white/10 bg-[#0e1013] px-3 py-2.5 text-[12.5px] text-white/70">
                      <span className="size-1.5 shrink-0 bg-brand" />
                      <span className="truncate">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Split>

            <Split tag={L.spaceChip} title={L.spaceTitle} body={L.spaceBody} bullets={L.spaceBullets} flip>
              <VoltAppCard name={tenant.name} L={L} />
            </Split>

            <Split tag={L.nutritionChip} title={L.nutritionTitle} body={L.nutritionBody} bullets={L.nutritionBullets}>
              <div className="border border-white/12 bg-[#111316] p-6">
                <div className="grid grid-cols-3 gap-3">
                  {[["156 g", "Protéines"], ["210 g", "Glucides"], ["62 g", "Lipides"]].map(([v, k]) => (
                    <div key={k} className="border border-white/10 bg-[#0e1013] p-4 text-center">
                      <div className="font-archivo text-[24px] font-extrabold leading-none text-white">{v}</div>
                      <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {L.nutritionBullets.slice(0, 4).map((b) => (
                    <span key={b} className="border border-white/12 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/50">{b}</span>
                  ))}
                </div>
              </div>
            </Split>
          </div>
        </section>

        {/* Étapes : chiffres surdimensionnés */}
        <section id="methode" className="scroll-mt-24 border-b border-white/10 py-[clamp(56px,8vw,104px)]">
          <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
            <Reveal><h2 className={`${sectionTitle} max-w-[16ch] text-white`}>{L.stepsTitle}</h2></Reveal>
            <RevealGroup className="mt-12 grid gap-px bg-white/10 md:grid-cols-3" step={90}>
              {L.steps.map((s) => (
                <div key={s.k} className="flex h-full flex-col gap-3 bg-[#0b0c0e] p-8">
                  <div className="font-archivo text-[64px] font-extrabold leading-none tracking-[-0.05em] text-brand/30">{s.k}</div>
                  <h3 className="font-archivo text-[19px] font-extrabold uppercase tracking-[-0.01em] text-white">{s.title}</h3>
                  <p className="text-[15px] leading-[1.6] text-white/55">{s.body}</p>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* Qui signe le programme, et ce que le moteur apporte */}
        <AuthorEngine L={L} name={tenant.name} tone="dark" />

        {/* Est-ce pour toi */}
        <section className="scroll-mt-24 border-t border-white/10 py-[clamp(56px,8vw,104px)]">
          <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
            <Reveal><h2 className={`${sectionTitle} max-w-[16ch] text-white`}>{L.forWhoTitle}</h2></Reveal>
            <RevealGroup className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" step={60}>
              {L.forWho.map((w) => (
                <div key={w.title} className="flex h-full items-start gap-3 border border-white/12 bg-[#111316] p-5">
                  <S.check className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                  <div className="flex flex-col gap-1">
                    <div className="font-archivo text-[15.5px] font-semibold leading-snug text-white">{w.title}</div>
                    <div className="text-[13.5px] leading-[1.55] text-white/50">{w.body}</div>
                  </div>
                </div>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* À propos (optionnel) */}
        {tenant.aboutEnabled && (tenant.aboutText || tenant.aboutPhotoUrl) ? (
          <section className="scroll-mt-24 border-t border-white/10">
            <div className="mx-auto grid w-full max-w-[1240px] items-center gap-10 px-5 py-[clamp(56px,8vw,104px)] sm:px-8 lg:grid-cols-[minmax(0,320px)_1fr]">
              {tenant.aboutPhotoUrl ? (
                <Reveal className="mx-auto w-full max-w-[320px]" direction="left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tenant.aboutPhotoUrl} alt={tenant.aboutTitle || tenant.name} className="w-full border border-white/12 object-cover" />
                </Reveal>
              ) : null}
              <Reveal className="flex flex-col gap-4" direction="right">
                <Tag>{L.aboutChip}</Tag>
                {tenant.aboutTitle ? <h2 className={`${sectionTitle} text-white`}>{tenant.aboutTitle}</h2> : null}
                {tenant.aboutText ? <p className="max-w-[60ch] whitespace-pre-line text-[16px] leading-[1.7] text-white/60">{tenant.aboutText}</p> : null}
              </Reveal>
            </div>
          </section>
        ) : null}

        {/* Mini-programme offert */}
        {leadMagnet ? (
          <section className="border-t border-white/10">
            <div className="mx-auto w-full max-w-[1240px] px-5 py-[clamp(44px,6vw,72px)] sm:px-8">
              <LeadBand L={L} slug={tenant.slug} tone="dark" radius="rounded-none" ctaClass="rounded-none" />
            </div>
          </section>
        ) : null}

        <section id="offres" className="scroll-mt-20 border-t border-white/10 bg-[#0e1013]">
          <div className="mx-auto w-full max-w-[1240px] px-5 pt-[clamp(56px,8vw,104px)] sm:px-8">
            <Reveal className="flex flex-col gap-4">
              <Tag>{L.programsChip}</Tag>
              <h2 className={`${sectionTitle} max-w-[16ch] text-white`}>{L.programsTitle}</h2>
            </Reveal>
          </div>

          {offers.length === 0 ? (
            <div className="mx-auto w-full max-w-[1240px] px-5 py-16 sm:px-8">
              <p className="border border-white/12 p-8 text-center text-[15px] text-white/50">{L.noOffer}</p>
            </div>
          ) : offers.length >= 3 ? (
            <div className="mx-auto mt-10 w-full max-w-[1240px]">
              <Rail tone="dark" hint={locale === "en" ? "Slide" : "Fais glisser"}>
                {offers.map((o) => (
                  <div key={o.id} className="w-[320px] sm:w-[360px]">
                    <OfferCard offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
                  </div>
                ))}
              </Rail>
            </div>
          ) : (
            <div className={`mx-auto mt-10 grid w-full gap-5 px-5 sm:px-8 ${offers.length === 1 ? "max-w-[560px]" : "max-w-[900px] sm:grid-cols-2"}`}>
              {offers.map((o) => (
                <OfferCard key={o.id} offer={o} offers={offers} slug={tenant.slug} chargesEnabled={tenant.chargesEnabled} locale={locale} audience={tenant.businessType} />
              ))}
            </div>
          )}

          {tenant.chargesEnabled && offers.some((o) => o.billing_type !== "subscription") ? (
            <div className="mx-auto w-full max-w-[1240px] px-5 pb-[clamp(56px,8vw,104px)] pt-10 sm:px-8">
              <div className="mx-auto flex max-w-[600px] flex-col items-center gap-3 border border-white/12 p-8 text-center">
                <div className="font-archivo text-[20px] font-extrabold uppercase tracking-[-0.01em] text-white">{L.giftTitle}</div>
                <p className="text-[14px] leading-[1.55] text-white/55">{L.giftBody}</p>
                <Link
                  href={`/c/${tenant.slug}/offrir`}
                  className="press tap mt-1 inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap border border-brand px-6 font-archivo text-[14px] font-bold uppercase tracking-[0.04em] text-brand hover:bg-brand hover:text-white"
                >
                  <S.spark className="h-4 w-4" /> {L.giftCta}
                </Link>
              </div>
            </div>
          ) : (
            <div className="pb-[clamp(56px,8vw,104px)]" />
          )}
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-white/10">
          <div className="mx-auto w-full max-w-[860px] px-5 py-[clamp(56px,8vw,104px)] sm:px-8">
            <Reveal className="flex flex-col gap-4">
              <Tag>{L.faqChip}</Tag>
              <h2 className={`${sectionTitle} text-white`}>{L.faqTitle}</h2>
            </Reveal>
            <div className="mt-10 flex flex-col">
              {L.faqs.map((f) => (
                <details key={f.q} className="group border-t border-white/10 py-4 last:border-b">
                  <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 font-archivo text-[15.5px] font-semibold leading-snug text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <S.chevron className="h-4.5 w-4.5 shrink-0 text-white/35 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 text-[14px] leading-[1.65] text-white/55">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden border-t border-white/10" style={{ background: PANEL }}>
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[760px] -translate-x-1/2 opacity-20 blur-[130px]"
            style={{ background: accent }}
          />
          <div className="relative mx-auto flex w-full max-w-[1240px] flex-col items-center gap-7 px-5 py-[clamp(64px,10vw,124px)] text-center sm:px-8">
            <h2 className="max-w-[17ch] font-archivo text-[clamp(32px,6vw,64px)] font-extrabold uppercase leading-[0.96] tracking-[-0.04em] text-balance text-white">
              {L.finalTitle}
            </h2>
            {offers.length > 0 ? (
              <a href="#offres" className="press tap inline-flex h-[58px] items-center justify-center gap-2 bg-brand px-10 font-archivo text-[16px] font-bold uppercase tracking-[0.04em] text-white hover:bg-brand-hover">
                {L.seePrograms} <S.arrow className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-5 py-12 sm:px-8">
          <Brand tenant={tenant} imgClass="h-10" textClass="text-[18px]" />
          <p className="max-w-[70ch] text-[13px] leading-[1.6] text-white/40">{L.legalNote}</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[13px] text-white/40">
            <Link href="/connexion" className="transition-colors hover:text-white">{L.footerLogin}</Link>
            <Link href="/mentions-legales" className="transition-colors hover:text-white">{L.footerLegal}</Link>
            <Link href="/confidentialite" className="transition-colors hover:text-white">{L.footerPrivacy}</Link>
            <Link href="/cgv" className="transition-colors hover:text-white">{L.footerTerms}</Link>
          </nav>
          <p className="pt-1 text-[12px] text-white/25">
            {L.poweredBy} <span className="font-archivo font-bold text-white/50">My Fitness <span className="text-brand">App</span></span>.
          </p>
        </div>
      </footer>

      {/* CTA collante mobile */}
      {offers.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0c0e]/92 px-4 py-3 backdrop-blur-xl sm:hidden">
          <a href="#offres" className="press tap flex w-full items-center justify-center gap-2 bg-brand py-3.5 font-archivo text-[15px] font-bold uppercase tracking-[0.04em] text-white">
            {L.seePrograms} <S.arrow className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
