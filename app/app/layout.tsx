import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionContext } from "@/lib/guard";
import { AppNav } from "@/components/app-nav";
import { CoachWidget } from "@/components/coach-widget";
import { PageTransition } from "@/components/page-transition";
import { OnboardingTour } from "@/components/onboarding-tour";
import { PROGRAM_DAYS } from "@/lib/config";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app");

  const day = ctx.access.day;
  const dayPct = Math.max(1, Math.round((Math.min(day, PROGRAM_DAYS) / PROGRAM_DAYS) * 100));

  return (
    <div className="min-h-dvh bg-paper nav:flex nav:items-start">
      <AppNav day={day} dayPct={dayPct} />
      <main className="min-w-0 flex-1 px-4 pt-5 pb-[110px] nav:px-8 nav:pt-8 nav:pb-20">
        <PageTransition>{children}</PageTransition>
      </main>
      {ctx.access.coachEnabled ? <CoachWidget /> : null}
      <OnboardingTour />
    </div>
  );
}
