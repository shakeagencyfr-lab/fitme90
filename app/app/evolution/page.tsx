import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { WeightTracker } from "@/components/weight-tracker";
import { MeasurementForm } from "@/components/evolution-forms";

export const metadata = { title: "Évolution — FitMe90" };

export default async function EvolutionPage() {
  const { ctx } = await loadEspaceOrRedirect();
  const supabase = await createClient();
  const { data: weights } = await supabase
    .from("weights")
    .select("kg, measured_at")
    .eq("user_id", ctx.userId)
    .order("measured_at", { ascending: true })
    .limit(90);

  const canLog = ctx.access.canLog;

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Mon évolution
      </h1>

      <WeightTracker weights={(weights ?? []) as { kg: number; measured_at: string }[]} />

      {canLog ? (
        <MeasurementForm />
      ) : (
        <Card>
          <p className="text-[14px] text-muted">Le suivi est en lecture seule : tes 90 jours sont terminés.</p>
        </Card>
      )}
    </div>
  );
}
