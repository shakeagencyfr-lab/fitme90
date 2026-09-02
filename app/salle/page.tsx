import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { GymStep } from "@/components/gym-step";
import { CoachMark } from "@/components/brand";
import { brandForUser } from "@/lib/branding";
import { brandMetadataForUser } from "@/lib/brand-metadata";
import { TenantLocale } from "@/components/tenant-locale";

export async function generateMetadata() {
  const ctx = await getSessionContext();
  return brandMetadataForUser(ctx?.userId ?? null, "Ma salle");
}

export default async function SallePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/salle");
  if (ctx.access.phase === "active" || ctx.access.phase === "grace") redirect("/app");
  // Le paiement vient après cette étape : s'il n'a pas payé, la suite est la
  // caisse ; sinon, on peut lancer la génération directement.
  const nextHref = ctx.access.phase === "not_paid" ? "/app/paiement" : "/generation";

  return (
    <TenantLocale userId={ctx.userId}>
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <CoachMark brand={await brandForUser(ctx.userId)} imgClass="h-9" />
      </header>
      <div className="px-4 py-8 sm:px-8">
        <GymStep nextHref={nextHref} />
      </div>
    </div>
    </TenantLocale>
  );
}
