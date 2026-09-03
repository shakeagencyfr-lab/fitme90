import Link from "next/link";
import { readCoachConfig } from "@/lib/methodology";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { CoachConfigForm } from "@/components/coach-config-form";

export const metadata = { title: "Ma méthode, Admin My Fitness App" };

export default async function AdminConfigPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const cfg = await readCoachConfig(tenantId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Ma méthode de coach")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Choisis comment l'IA génère les programmes : sur la base evidence-based de référence, ou en suivant tes propres règles. Le changement s'applique aux")} <span className="text-body">{tx("prochaines")}</span> {tx("générations. Les plafonds de messages et de recettes se règlent désormais par offre, dans")} <Link href="/admin/plans" className="text-brand hover:underline">{tx("Plans")}</Link>.</p>
      </div>

      <CoachConfigForm
        initialMode={cfg.generation_mode}
        initialCustom={cfg.custom_methodology}
        initialCoachName={cfg.coach_name}
      />

      {/* La méthodologie de référence n'est volontairement PAS affichée : c'est
          le savoir-faire de la plateforme, ancré dans chaque génération. Le
          coach la complète par ses consignes, il ne la recopie pas. */}
    </div>
  );
}
