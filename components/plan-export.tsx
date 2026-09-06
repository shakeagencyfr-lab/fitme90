"use client";

import { useState } from "react";
import { useT } from "@/components/locale-provider";
import { Button, Card, MonoLabel } from "@/components/ui";

/**
 * Le client compose son PDF avant de le télécharger : quels cycles (et leurs
 * séances), avec ou sans repères nutritionnels, avec ou sans journée type
 * de repas. Les zones cardiaques et l'échelle RPE y sont toujours : on
 * s'entraîne avec ce papier, il doit se suffire.
 */
export function PlanExport({ cycles }: { cycles: string[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<boolean[]>(() => cycles.map(() => true));
  const [nutrition, setNutrition] = useState(true);
  const [meals, setMeals] = useState(true);

  const selected = chosen.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const all = selected.length === cycles.length;
  const params = new URLSearchParams();
  if (!all) params.set("cycles", selected.join(","));
  if (!nutrition) params.set("nutrition", "0");
  if (!meals) params.set("meals", "0");
  const href = `/api/plan-pdf${params.toString() ? `?${params}` : ""}`;

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="mt-1 h-10 self-start">
        {t("dashboard.exportPdf")}
      </Button>
    );
  }

  const box = "size-4 accent-brand";
  return (
    <Card className="mt-1 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <MonoLabel>{t("dashboard.exportOptions")}</MonoLabel>
        <button type="button" onClick={() => setOpen(false)} className="tap text-[12.5px] text-muted-2 underline hover:text-ink">
          {t("common.close")}
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] text-muted-2">{t("dashboard.exportCycles")}</span>
        {cycles.map((label, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-body">
            <input type="checkbox" className={box} checked={chosen[i]} onChange={(e) => setChosen((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
            {label}
          </label>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-body">
        <input type="checkbox" className={box} checked={nutrition} onChange={(e) => setNutrition(e.target.checked)} />
        {t("dashboard.exportNutrition")}
      </label>
      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-body">
        <input type="checkbox" className={box} checked={meals} onChange={(e) => setMeals(e.target.checked)} />
        {t("dashboard.exportMeals")}
      </label>
      <p className="text-[12px] text-muted-2">{t("dashboard.exportAlways")}</p>
      {selected.length === 0 ? (
        <p className="text-[12.5px] text-alert-ink">{t("dashboard.exportAtLeastOne")}</p>
      ) : (
        <a href={href} download className="tap inline-flex h-11 w-fit items-center justify-center rounded-btn bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-hover">
          {t("dashboard.exportDownload")}
        </a>
      )}
    </Card>
  );
}
