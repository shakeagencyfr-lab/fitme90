import { readCoachConfig } from "@/lib/methodology";
import { getAdminOrNull } from "@/lib/admin";
import { CoachConfigForm } from "@/components/coach-config-form";
import { clientUsesCredits, programCreditCost } from "@/lib/credits";

export const metadata = { title: "Configuration IA, Admin My Fitness App" };

export default async function AdminConfigPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  // Modèle crédits : les plafonds se lisent en crédits, pas en dollars.
  const [cfg, creditMode, programCredits] = await Promise.all([
    readCoachConfig(tenantId),
    clientUsesCredits(tenantId),
    programCreditCost(tenantId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Configuration de l&apos;IA
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Choisis comment l&apos;IA génère les programmes : sur la base
          evidence-based de référence, ou en suivant ta propre méthode de coach.
          Le changement s&apos;applique aux <span className="text-body">prochaines</span> générations.
        </p>
      </div>

      <CoachConfigForm
        initialMode={cfg.generation_mode}
        initialCustom={cfg.custom_methodology}
        initialCoachName={cfg.coach_name}
        initialDailyLimit={cfg.coach_ai_daily_limit}
        initialRecipeLimit={cfg.recipe_ai_daily_limit}
        creditMode={creditMode}
        programCredits={programCredits}
      />

      {/* La méthodologie de référence n'est volontairement PAS affichée : c'est
          le savoir-faire de la plateforme, ancré dans chaque génération. Le
          coach la complète par ses consignes, il ne la recopie pas. */}
    </div>
  );
}
