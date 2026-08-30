import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionContext } from "@/lib/guard";
import { isCoachAccount } from "@/lib/admin";
import { AppNav } from "@/components/app-nav";
import { CoachWidget } from "@/components/coach-widget";
import { PageTransition } from "@/components/page-transition";
import { OnboardingTour } from "@/components/onboarding-tour";
import { isShopEnabled } from "@/lib/shop";
import { clientVipContext } from "@/lib/vip";
import { PROGRAM_DAYS } from "@/lib/config";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // En parallèle : le contexte (mis en cache, partagé avec la page) et l'état
  // de la boutique, pour ne pas enchaîner deux allers-retours.
  const [ctx, shopEnabled] = await Promise.all([getSessionContext(), isShopEnabled()]);
  if (!ctx) redirect("/connexion?suite=/app");
  // Espaces distincts : un compte coach/salle n'a pas d'espace client, il va au
  // dashboard admin.
  if (isCoachAccount(ctx)) redirect("/admin");

  // Onglet Chat VIP : uniquement si l'offre du client porte l'option.
  const vip = await clientVipContext(ctx.userId);

  const day = ctx.access.day;
  const dayPct = Math.max(1, Math.round((Math.min(day, PROGRAM_DAYS) / PROGRAM_DAYS) * 100));

  return (
    <div className="min-h-dvh bg-paper nav:flex nav:items-start">
      <AppNav day={day} dayPct={dayPct} shopEnabled={shopEnabled} vipEnabled={vip.enabled} />
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
      {ctx.access.coachEnabled ? <CoachWidget /> : null}
      <OnboardingTour />
    </div>
  );
}
