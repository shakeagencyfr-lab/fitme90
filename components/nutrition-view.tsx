"use client";

import { useMemo, useState } from "react";
import {
  dayMeals,
  shoppingList,
  shoppingListText,
  targetKcalForDay,
} from "@/lib/nutrition";
import { Card, MonoLabel } from "@/components/ui";

interface Props {
  day: number;
  baseKcal: number;
  restPattern: boolean[]; // 7 booléens (LUN→DIM ou ordre du weekPlan)
  banned: Record<string, 1>;
  macros: { protein: string; carbs: string; fat: string };
  canGenerate: boolean;
}

export function NutritionView({ day, baseKcal, restPattern, banned, macros, canGenerate }: Props) {
  const [span, setSpan] = useState<3 | 7 | 14>(7);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const isRestOf = useMemo(
    () => (d: number) => restPattern.length ? restPattern[(d - 1) % restPattern.length] : false,
    [restPattern],
  );

  const todayRest = isRestOf(day);
  const meals = useMemo(
    () => dayMeals(day, todayRest, baseKcal, banned),
    [day, todayRest, baseKcal, banned],
  );
  const target = targetKcalForDay(baseKcal, todayRest);
  const groups = useMemo(
    () => shoppingList(day, span, isRestOf, baseKcal, banned),
    [day, span, isRestOf, baseKcal, banned],
  );

  async function copyList() {
    try {
      await navigator.clipboard.writeText(shoppingListText(groups));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard indisponible */
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Macros du jour */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><MacroStat label={todayRest ? "Kcal (repos)" : "Kcal"} value={String(target).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} /></Card>
        <Card><MacroStat label="Protéines" value={`${macros.protein} g`} /></Card>
        <Card><MacroStat label="Glucides" value={`${todayRest ? Math.round(Number(macros.carbs.replace(/\D/g, "")) * 0.8) : macros.carbs} g`} /></Card>
        <Card><MacroStat label="Lipides" value={`${macros.fat} g`} /></Card>
      </section>
      {todayRest ? (
        <p className="text-[13px] text-muted -mt-2">
          Jour de repos : environ 10 % de calories en moins, glucides réduits, protéines maintenues.
        </p>
      ) : null}

      {/* Repas du jour */}
      <section className="flex flex-col gap-3">
        <MonoLabel>Repas du jour</MonoLabel>
        {meals.map((m, i) => (
          <Card key={i} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-archivo font-semibold text-[16px] text-ink">{m.name}</div>
              <div className="font-mono text-[11px] text-brand">{m.time} · {m.kcal} kcal</div>
            </div>
            <div className="flex flex-col gap-1">
              {m.items.map((it, j) => (
                <div key={j} className="flex justify-between text-[14px] text-body border-b border-line-2 py-1 last:border-0">
                  <span>{it.food}</span>
                  <span className="text-muted-2">{it.qty}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      {/* Liste des courses */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <MonoLabel>Liste des courses</MonoLabel>
          <div className="flex items-center gap-1.5">
            {([3, 7, 14] as const).map((d) => (
              <button
                key={d}
                onClick={() => setSpan(d)}
                className={[
                  "tap rounded-pill px-3 text-[13px] font-medium border",
                  span === d ? "bg-ink text-white border-ink" : "bg-surface text-body border-line-4",
                ].join(" ")}
              >
                {d} j
              </button>
            ))}
            <button onClick={copyList} className="tap rounded-pill border border-line-4 bg-surface px-3 text-[13px] font-medium text-body">
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
        </div>
        {groups.map((g) => (
          <Card key={g.name} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <div className="font-archivo font-semibold text-[15px] text-ink">{g.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{g.count}</div>
            </div>
            <div className="flex flex-col">
              {g.items.map((it) => {
                const on = !!checked[it.key];
                return (
                  <button
                    key={it.key}
                    onClick={() => setChecked((c) => ({ ...c, [it.key]: !on }))}
                    className="tap flex items-center gap-3 border-b border-line-2 py-2 text-left last:border-0"
                  >
                    <span
                      className={[
                        "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border text-[11px] text-white",
                        on ? "bg-brand border-brand" : "bg-surface border-line-4",
                      ].join(" ")}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span className={["flex-1 text-[14px]", on ? "text-disabled line-through" : "text-body"].join(" ")}>
                      {it.food}
                    </span>
                    <span className="text-[13px] text-muted-2">{it.qty}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </section>

      {canGenerate ? (
        <p className="text-[12px] text-muted-2">
          Les allergènes et le régime déclarés sont exclus. Le filtrage est une aide,
          pas une garantie : vérifie toujours les étiquettes des produits.
        </p>
      ) : null}
    </div>
  );
}

function MacroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <MonoLabel>{label}</MonoLabel>
      <div className="font-archivo font-extrabold text-[22px] leading-none tracking-[-0.03em] text-ink">
        {value}
      </div>
    </div>
  );
}
