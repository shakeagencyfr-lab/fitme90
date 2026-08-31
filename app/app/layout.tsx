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
import { PROGRAM_DAYS } from "@/lib/config";

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
  const [shopEnabled, vip, brand, coachName, freeze, aiIncluded, aff] = await Promise.all([
    isShopEnabled(tenantId),
    clientVipContext(ctx.userId),
    brandForUser(ctx.userId),
    readCoachName(tenantId),
    tenantFreezeState(tenantId),
    clientCoachAiIncluded(ctx.userId),
    affiliationConfig(tenantId),
  ]);

  // Compte du coach gelé (défaut de paiement au revendeur) : les clients perdent
  // temporairement l'accès, sans rien perdre de leurs données.
  if (freeze.frozen) return <FrozenScreen brand={brand} />;
  // Badge de messages non lus sur l'onglet Chat VIP (seulement si l'option est active).
  const vipUnread = vip.enabled ? await clientUnreadVipCount(ctx.userId) : 0;

  const day = ctx.access.day;
  const dayPct = Math.max(1, Math.round((Math.min(day, PROGRAM_DAYS) / PROGRAM_DAYS) * 100));

  const accentStyle = brand?.brandColor
    ? ({
        ["--color-brand" as string]: brand.brandColor,
        ["--color-brand-hover" as string]: `color-mix(in srgb, ${brand.brandColor} 85%, #000)`,
      } as CSSProperties)
    : undefined;

  return (
    <div className="min-h-dvh bg-paper nav:flex nav:items-start" style={accentStyle}>
      <AppNav
        day={day}
        dayPct={dayPct}
        shopEnabled={shopEnabled}
        vipEnabled={vip.enabled}
        affiliationEnabled={aff.enabled}
        vipUnread={vipUnread}
        brandName={brand?.name ?? null}
        brandLogoUrl={brand?.logoUrl ?? null}
      />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[110px] nav:px-8 nav:pt-8 nav:pb-20">
        {ctx.access.restricted ? (
          <div className="mb-5 flex flex-col gap-1.5 rounded-card border border-alert-line bg-alert p-4">
            <span className="font-archivo font-bold text-[15px] text-alert-ink">Paiement en attente</span>
            <p className="text-[13.5px] leading-relaxed text-alert-ink">
              Ton abonnement n&apos;a pas pu être renouvelé. Tu gardes l&apos;accès en lecture seule à
              ton programme et à ce qui a déjà été généré, mais le coach IA et le suivi des séances
              sont en pause. Mets à jour ton moyen de paiement pour tout réactiver.
            </p>
          </div>
        ) : null}
        <PageTransition>{children}</PageTransition>
      </main>
      {ctx.access.coachEnabled && aiIncluded ? <CoachWidget coachName={coachName} /> : null}
      <OnboardingTour />
      {/* Invite à installer l'app (Android natif ; iOS marche à suivre).
          Côté client : on attend la fin du tutoriel d'accueil. */}
      <PwaInstall requireOnboarded />
    </div>
  );
}
