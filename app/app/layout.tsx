import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { getSessionContext } from "@/lib/guard";
import { isCoachAccount } from "@/lib/admin";
import { AppNav } from "@/components/app-nav";
import { CoachWidget } from "@/components/coach-widget";
import { PageTransition } from "@/components/page-transition";
import { OnboardingTour } from "@/components/onboarding-tour";
import { PwaInstall } from "@/components/pwa-install";
import { isShopEnabled } from "@/lib/shop";
import { clientVipContext, clientUnreadVipCount } from "@/lib/vip";
import { clientCoachAiIncluded } from "@/lib/offers";
import { affiliationConfig } from "@/lib/affiliation";
import { brandForUser } from "@/lib/branding";
import { brandMetadataForUser } from "@/lib/brand-metadata";
import { readCoachName } from "@/lib/methodology";
import { tenantFreezeState } from "@/lib/freeze";
import { FrozenScreen } from "@/components/frozen-screen";
import { SupportReturnBar } from "@/components/support-return-bar";
import { resolveLocale, userLocale } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { LocaleProvider } from "@/components/locale-provider";

// Onglet + favicon en marque blanche (coach du client connecté).
export async function generateMetadata() {
  const ctx = await getSessionContext();
  return brandMetadataForUser(ctx?.userId ?? null, "Mon programme");
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app");
  // Espaces distincts : un compte coach/salle n'a pas d'espace client, il va au
  // dashboard admin.
  if (isCoachAccount(ctx)) redirect("/admin");

  // Config propre au tenant du client (= celui de son coach) : boutique, prénom
  // du coach IA, Chat VIP, marque blanche. En parallèle après le contexte.
  const tenantId = ctx.profile?.tenant_id ?? null;
  const [shopEnabled, vip, brand, coachName, freeze, aiIncluded, aff, tenantLang] = await Promise.all([
    isShopEnabled(tenantId),
    clientVipContext(ctx.userId),
    brandForUser(ctx.userId),
    readCoachName(tenantId),
    tenantFreezeState(tenantId),
    clientCoachAiIncluded(ctx.userId),
    affiliationConfig(tenantId),
    userLocale(ctx.userId),
  ]);
  // Langue de l'espace client : choix de la personne, sinon celle du coach.
  const locale = await resolveLocale(tenantLang);
  const t = makeT(locale);

  // Compte du coach gelé (défaut de paiement au revendeur) : les clients perdent
  // temporairement l'accès, sans rien perdre de leurs données.
  if (freeze.frozen) return <FrozenScreen brand={brand} />;
  // Badge de messages non lus sur l'onglet Chat VIP (seulement si l'option est active).
  const vipUnread = vip.enabled ? await clientUnreadVipCount(ctx.userId) : 0;

  const day = ctx.access.day;
  const programDays = ctx.access.programDays;
  const dayPct = Math.max(1, Math.round((Math.min(day, programDays) / programDays) * 100));

  const accentStyle = brand?.brandColor
    ? ({
        ["--color-brand" as string]: brand.brandColor,
        ["--color-brand-hover" as string]: `color-mix(in srgb, ${brand.brandColor} 85%, #000)`,
      } as CSSProperties)
    : undefined;

  return (
    <LocaleProvider locale={locale}>
    <div className="min-h-dvh bg-paper nav:flex nav:items-start" style={accentStyle}>
      {/* Le coach qui saisit pour son client doit voir en permanence au nom de
          qui il enregistre, et pouvoir en sortir d'un geste. */}
      <div className="fixed inset-x-0 top-0 z-50"><SupportReturnBar /></div>
      <AppNav
        day={day}
        dayPct={dayPct}
        programDays={programDays}
        shopEnabled={shopEnabled}
        vipEnabled={vip.enabled}
        affiliationEnabled={aff.enabled}
        vipUnread={vipUnread}
        brandName={brand?.name ?? null}
        brandLogoUrl={brand?.logoUrl ?? null}
      />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[110px] nav:px-8 nav:pt-8 nav:pb-20">
        {ctx.access.phase === "not_paid" ? (
          <Link
            href="/app/paiement"
            className="tap mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand/30 bg-brand/[0.06] p-4 transition-colors hover:border-brand/60"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-archivo font-bold text-[15px] text-ink">{t("dashboard.resumeTitle")}</span>
              <span className="text-[13.5px] leading-relaxed text-muted">{t("dashboard.resumeBody")}</span>
            </span>
            <span className="shrink-0 rounded-btn bg-brand px-4 py-2.5 text-[14px] font-semibold text-white">
              {t("dashboard.resumeCta")}
            </span>
          </Link>
        ) : null}
        {ctx.access.restricted ? (
          <div className="mb-5 flex flex-col gap-1.5 rounded-card border border-alert-line bg-alert p-4">
            <span className="font-archivo font-bold text-[15px] text-alert-ink">{t("dashboard.restrictedTitle")}</span>
            <p className="text-[13.5px] leading-relaxed text-alert-ink">{t("dashboard.restrictedBody")}</p>
          </div>
        ) : null}
        <PageTransition>{children}</PageTransition>
      </main>
      {ctx.access.coachEnabled && aiIncluded ? <CoachWidget coachName={coachName} /> : null}
      {/* Le tutoriel visite programme, séance et nutrition : sans plan consultable
          il tournait à vide, et se marquait « vu » en localStorage, donc le
          client ne le revoyait jamais une fois son programme généré. */}
      {ctx.access.planViewable ? <OnboardingTour /> : null}
      {/* Invite à installer l'app (Android natif ; iOS marche à suivre).
          Côté client : on attend la fin du tutoriel d'accueil. */}
      <PwaInstall requireOnboarded />
    </div>
    </LocaleProvider>
  );
}
