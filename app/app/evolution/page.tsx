import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, MonoLabel } from "@/components/ui";
import { WeightForm, MeasurementForm } from "@/components/evolution-forms";

export const metadata = { title: "Évolution — FitMe90" };

export default async function EvolutionPage() {
  const { ctx } = await loadEspaceOrRedirect();
  const supabase = await createClient();
  const { data: weights } = await supabase
    .from("weights")
    .select("kg, measured_at")
    .eq("user_id", ctx.userId)
    .order("measured_at", { ascending: false })
    .limit(12);

  const rows = weights ?? [];
  const canLog = ctx.access.canLog;

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Évolution
      </h1>

      {canLog ? (
        <>
          <WeightForm />
          <MeasurementForm />
        </>
      ) : (
        <Card><p className="text-[14px] text-muted">Le suivi est en lecture seule : tes 90 jours sont terminés.</p></Card>
      )}

      <Card className="flex flex-col gap-2">
        <MonoLabel>Derniers poids</MonoLabel>
        {rows.length ? (
          <div className="flex flex-col">
            {rows.map((w, i) => (
              <div key={i} className="flex justify-between border-b border-line-2 py-2 text-[14px] last:border-0">
                <span className="text-muted">
                  {new Date(w.measured_at as string).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <span className="font-medium text-ink">{w.kg} kg</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted-2">Aucun poids enregistré pour l'instant.</p>
        )}
      </Card>
    </div>
  );
}
