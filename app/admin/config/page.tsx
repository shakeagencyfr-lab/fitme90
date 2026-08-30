import { readCoachConfig, BASE_METHODOLOGY } from "@/lib/methodology";
import { getAdminOrNull } from "@/lib/admin";
import { CoachConfigForm } from "@/components/coach-config-form";
import { MonoLabel } from "@/components/ui";

export const metadata = { title: "Configuration IA, Admin FitMe90" };

export default async function AdminConfigPage() {
  const ctx = await getAdminOrNull();
  const cfg = await readCoachConfig(ctx?.profile?.tenant_id ?? null);

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
      />

      <details className="group rounded-card border border-line bg-surface p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="font-archivo font-bold text-[16px] text-ink">
            Méthodologie de référence (base evidence-based)
          </span>
          <span className="text-muted-2 transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <MonoLabel>Toujours appliquée, complétée par tes consignes en mode personnalisé</MonoLabel>
          <pre className="overflow-x-auto whitespace-pre-wrap font-plex text-[13px] leading-[1.6] text-body">
            {BASE_METHODOLOGY}
          </pre>
        </div>
      </details>
    </div>
  );
}
