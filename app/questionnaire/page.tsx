import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { hasProgram } from "@/lib/queries";
import { Questionnaire } from "@/components/questionnaire";
import { CoachMark } from "@/components/brand";
import { brandForUser } from "@/lib/branding";
import { brandMetadataForUser } from "@/lib/brand-metadata";
import { TenantLocale } from "@/components/tenant-locale";

export async function generateMetadata() {
  const ctx = await getSessionContext();
  return brandMetadataForUser(ctx?.userId ?? null, "Questionnaire");
}

export default async function QuestionnairePage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/questionnaire");
  // Le paiement a lieu APRÈS le questionnaire : on n'exige rien ici.
  // Déjà un programme écrit : inutile de refaire le questionnaire. On teste le
  // PROGRAMME et non la phase d'accès : un client créé à la main par son coach
  // est actif sans programme, et se faisait renvoyer ici même à chaque clic.
  if (await hasProgram(ctx.userId)) redirect("/app");

  return (
    <TenantLocale userId={ctx.userId}>
    <div className="min-h-dvh bg-paper">
      <header className="px-5 sm:px-8 pt-6 safe-top">
        <CoachMark brand={await brandForUser(ctx.userId)} imgClass="h-9" />
      </header>
      <div className="px-4 py-8 sm:px-8">
        <Questionnaire />
      </div>
    </div>
    </TenantLocale>
  );
}
