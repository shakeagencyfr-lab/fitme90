import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { Questionnaire } from "@/components/questionnaire";
import { CoachMark } from "@/components/brand";
import { brandForUser } from "@/lib/branding";
import { brandMetadataForUser } from "@/lib/brand-metadata";

export async function generateMetadata() {
  const ctx = await getSessionContext();
  return brandMetadataForUser(ctx?.userId ?? null, "Questionnaire");
}

export default async function QuestionnairePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/questionnaire");
  // Le paiement a lieu APRÈS le questionnaire : on n'exige rien ici.
  // Déjà un programme actif : inutile de refaire le questionnaire.
  if (ctx.access.phase === "active" || ctx.access.phase === "grace") redirect("/app");

  return (
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <CoachMark brand={await brandForUser(ctx.userId)} imgClass="h-9" />
      </header>
      <div className="px-4 py-8 sm:px-8">
        <Questionnaire />
      </div>
    </div>
  );
}
