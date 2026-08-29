import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { Questionnaire } from "@/components/questionnaire";
import { Wordmark } from "@/components/brand";

export const metadata = { title: "Questionnaire, FitMe90" };

export default async function QuestionnairePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/questionnaire");
  // Le paiement a lieu APRÈS le questionnaire : on n'exige rien ici.
  // Déjà un programme actif : inutile de refaire le questionnaire.
  if (ctx.access.phase === "active" || ctx.access.phase === "grace") redirect("/app");

  return (
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <Wordmark />
      </header>
      <div className="px-4 py-8 sm:px-8">
        <Questionnaire />
      </div>
    </div>
  );
}
