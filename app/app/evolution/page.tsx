import { loadEspaceOrRedirect } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Card, MonoLabel } from "@/components/ui";
import { WeightTracker } from "@/components/weight-tracker";
import { MeasurementForm } from "@/components/evolution-forms";
import { RecordsTable } from "@/components/records-table";
import { personalRecords, type LogEntry } from "@/lib/records";

export const metadata = { title: "Évolution" };

type Measure = {
  waist: number | null;
  hips: number | null;
  chest: number | null;
  thigh: number | null;
  arm: number | null;
  measured_at: string;
};

const MEAS_COLS: [keyof Measure, string][] = [
  ["waist", "Taille"],
  ["hips", "Hanches"],
  ["chest", "Poitrine"],
  ["thigh", "Cuisse"],
  ["arm", "Bras"],
];

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function EvolutionPage() {
  const { ctx, answers } = await loadEspaceOrRedirect();
  const supabase = await createClient();
  const [{ data: weights }, { data: measures }, { data: logs }] = await Promise.all([
    supabase
      .from("weights")
      .select("kg, measured_at")
      .eq("user_id", ctx.userId)
      .order("measured_at", { ascending: true })
      .limit(90),
    supabase
      .from("measurements")
      .select("waist, hips, chest, thigh, arm, measured_at")
      .eq("user_id", ctx.userId)
      .order("measured_at", { ascending: false })
      .limit(60),
    supabase
      .from("session_logs")
      .select("entries")
      .eq("user_id", ctx.userId)
      .returns<{ entries: LogEntry[] | null }[]>(),
  ]);

  // Records de charges : agrégés depuis toutes les séries validées.
  const allEntries: LogEntry[] = [];
  for (const l of logs ?? []) for (const e of l.entries ?? []) allEntries.push(e);
  const records = personalRecords(allEntries);

  // Poids de départ (renseigné à l'inscription) = 1er point de la courbe, par
  // défaut, même sans pesée saisie. On l'ajoute au tracé s'il manque une pesée
  // au (ou avant le) jour de début du programme.
  const weightRows = (weights ?? []) as { kg: number; measured_at: string }[];
  const startDate = ctx.profile?.start_date ?? null;
  const startWeight = Number(String(answers?.weight ?? "").replace(",", "."));
  if (
    startDate &&
    startWeight >= 20 &&
    startWeight <= 400 &&
    (weightRows.length === 0 || weightRows[0].measured_at > startDate)
  ) {
    weightRows.unshift({ kg: startWeight, measured_at: startDate });
  }

  const canLog = ctx.access.canLog;
  const rows = (measures ?? []) as Measure[];
  // Delta = dernière (rows[0]) vs première mesure (fin du tableau).
  const first = rows.length ? rows[rows.length - 1] : null;
  const latest = rows.length ? rows[0] : null;
  const delta = (k: keyof Measure) => {
    if (!latest || !first || latest[k] == null || first[k] == null) return null;
    return (latest[k] as number) - (first[k] as number);
  };

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5">
      <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
        Mon évolution
      </h1>

      <WeightTracker weights={weightRows} />

      <RecordsTable records={records} />

      {canLog ? (
        <MeasurementForm />
      ) : (
        <Card>
          <p className="text-[14px] text-muted">Le suivi est en lecture seule : ton programme est terminé.</p>
        </Card>
      )}

      {/* Historique des mensurations (ce qui manquait : rien ne s'affichait) */}
      {rows.length ? (
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <MonoLabel>Mensurations (cm)</MonoLabel>
            <span className="font-mono text-[11px] text-muted-2">{rows.length} relevé(s)</span>
          </div>

          {/* Dernières valeurs + variation depuis la 1re prise */}
          {latest ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {MEAS_COLS.map(([k, label]) => {
                const v = latest[k];
                if (v == null) return null;
                const d = delta(k);
                return (
                  <div key={k} className="flex flex-col gap-0.5 rounded-control border border-line-2 bg-surface-2 px-3 py-2.5">
                    <MonoLabel>{label}</MonoLabel>
                    <div className="font-archivo font-extrabold text-[20px] leading-none tracking-[-0.02em] text-ink">
                      {String(v).replace(".", ",")}
                    </div>
                    {d != null && rows.length > 1 ? (
                      <span
                        className={[
                          "text-[12px] font-medium",
                          d < 0 ? "text-brand" : d > 0 ? "text-muted" : "text-muted-2",
                        ].join(" ")}
                      >
                        {d > 0 ? "+" : ""}
                        {String(Math.round(d * 10) / 10).replace(".", ",")} cm
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Historique daté */}
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[380px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-muted-2">
                  <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.08em]">Date</th>
                  {MEAS_COLS.map(([k, label]) => (
                    <th key={k} className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.08em]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-line-2">
                    <td className="py-2 pr-3 text-muted">{fmtDate(r.measured_at)}</td>
                    {MEAS_COLS.map(([k]) => (
                      <td key={k} className="py-2 pr-3 tabular-nums text-body">
                        {r[k] != null ? String(r[k]).replace(".", ",") : "·"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
