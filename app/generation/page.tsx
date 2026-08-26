import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { GenerateStep } from "@/components/generate-step";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Génération, FitMe90" };

export default async function GenerationPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/generation");
  if (ctx.access.phase === "not_paid") redirect("/app/paiement");
  if (ctx.access.phase === "active" || ctx.access.phase === "grace") redirect("/app");

  return (
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <Wordmark />
      </header>
      <div className="flex min-h-[70dvh] items-center px-4 py-8 sm:px-8">
        <div className="w-full">
          <GenerateStep />
        </div>
      </div>
    </div>
  );
}
