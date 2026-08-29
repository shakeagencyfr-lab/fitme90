import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { GymStep } from "@/components/gym-step";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Ma salle, FitMe90" };

export default async function SallePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/salle");
  if (ctx.access.phase === "active" || ctx.access.phase === "grace") redirect("/app");
  // Le paiement vient après cette étape : s'il n'a pas payé, la suite est la
  // caisse ; sinon, on peut lancer la génération directement.
  const nextHref = ctx.access.phase === "not_paid" ? "/app/paiement" : "/generation";

  return (
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <Wordmark />
      </header>
      <div className="px-4 py-8 sm:px-8">
        <GymStep nextHref={nextHref} />
      </div>
    </div>
  );
}
