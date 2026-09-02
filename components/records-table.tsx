import { Card, MonoLabel } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import type { PersonalRecord } from "@/lib/records";

// Table des charges max par exercice, alimentée automatiquement par les séances
// validées. Claire et lisible : exercice, charge max (kg x reps), 1RM estimé.
export async function RecordsTable({ records }: { records: PersonalRecord[] }) {
  const { t } = await getT();
  if (!records.length) return null;
  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <MonoLabel>{t("evolution.records")}</MonoLabel>
        <span className="font-mono text-[11px] text-muted-2">{t("evolution.exercisesCount", { n: records.length })}</span>
      </div>
      <p className="text-[12.5px] leading-[1.6] text-muted">
        {t("evolution.recordsHint")}
      </p>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[360px] border-collapse text-[13px]">
          <thead>
            <tr className="text-left text-muted-2">
              <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.08em]">{t("evolution.exercise")}</th>
              <th className="py-1.5 pr-3 font-mono text-[10px] uppercase tracking-[0.08em]">{t("evolution.maxLoad")}</th>
              <th className="py-1.5 font-mono text-[10px] uppercase tracking-[0.08em]">{t("evolution.e1rm")}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.exercise} className="border-t border-line-2">
                <td className="py-2.5 pr-3 text-ink">{r.exercise}</td>
                <td className="py-2.5 pr-3 tabular-nums font-semibold text-ink">
                  {r.kg} kg <span className="font-normal text-muted-2">× {r.reps}</span>
                </td>
                <td className="py-2.5 tabular-nums text-body">{r.e1rm} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
