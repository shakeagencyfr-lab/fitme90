"use client";

import { useMemo, useState } from "react";
import {
  dayMeals,
  shoppingList,
  shoppingListText,
  targetKcalForDay,
  pnum,
  grp,
} from "@/lib/nutrition";
import { Card, MonoLabel, Button, Alert } from "@/components/ui";

interface Recipe {
  name: string;
  kcal: string;
  protein: string;
  time: string;
  ingredients: { food: string; qty: string }[];
  steps: string;
}

interface Props {
  currentDay: number;
  baseKcal: number;
  restPattern: boolean[]; // 7 booléens, ordre LUN→DIM
  startWeekday?: number; // index (0=LUN) du jour de semaine de la date de début
  dayNames: string[]; // 7 codes (LUN…DIM)
  banned: Record<string, 1>;
  dislikes: string[]; // aliments non aimés (termes minuscules)
  macros: { protein: string; carbs: string; fat: string };
  canGenerate: boolean;
}

const WEEKS = 13; // 90 jours ≈ 13 semaines

export function NutritionView({
  currentDay,
  baseKcal,
  restPattern,
  startWeekday = 0,
  dayNames,
  banned,
  dislikes,
  macros,
  canGenerate,
}: Props) {
  const initialWeek = Math.min(WEEKS, Math.floor((currentDay - 1) / 7) + 1);
  const initialDow = (currentDay - 1) % 7;
  const [week, setWeek] = useState(initialWeek);
  const [dow, setDow] = useState(initialDow);
  const [span, setSpan] = useState<3 | 7 | 14>(7);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeBusy, setRecipeBusy] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");

  const day = Math.min(90, (week - 1) * 7 + dow + 1);
  const len = restPattern.length || 7;
  const isRestOf = useMemo(
    () => (d: number) => (restPattern.length ? restPattern[(((startWeekday + d - 1) % len) + len) % len] : false),
    [restPattern, len, startWeekday],
  );
  const dayRest = isRestOf(day);

  const meals = useMemo(() => dayMeals(day, dayRest, baseKcal, banned, dislikes), [day, dayRest, baseKcal, banned, dislikes]);
  const groups = useMemo(() => shoppingList(day, span, isRestOf, baseKcal, banned, 90, dislikes), [day, span, isRestOf, baseKcal, banned, dislikes]);

  // Macros deux états (README/PDF : jour de repos ≈ −10 % kcal, glucides −1/5, protéines maintenues).
  const P = pnum(macros.protein), C = pnum(macros.carbs), F = pnum(macros.fat);
  const trainKcal = targetKcalForDay(baseKcal, false);
  const restKcal = targetKcalForDay(baseKcal, true);

  async function copyList() {
    try {
      await navigator.clipboard.writeText(shoppingListText(groups));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function genRecipes() {
    setRecipeBusy(true);
    setRecipeErr("");
    try {
      const res = await fetch("/api/recipes", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Indisponible.");
      setRecipes(data.recipes ?? []);
    } catch (e) {
      setRecipeErr(e instanceof Error ? e.message : "Indisponible.");
    } finally {
      setRecipeBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sélecteur de semaine + jour (12+ semaines variées) */}
      <section className="flex flex-col gap-3">
        <MonoLabel>Calendrier nutrition</MonoLabel>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {Array.from({ length: WEEKS }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              className={[
                "tap shrink-0 rounded-pill border px-3 text-[13px] font-semibold",
                w === week ? "bg-ink text-white border-ink" : "bg-surface text-body border-line-4",
              ].join(" ")}
            >
              S{w}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {dayNames.slice(0, 7).map((name, i) => {
            const d = (week - 1) * 7 + i + 1;
            const rest = isRestOf(d);
            const on = i === dow;
            const disabled = d > 90;
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => setDow(i)}
                className={[
                  "tap flex flex-col items-center gap-0.5 rounded-control border py-2 text-center",
                  on ? "border-ink border-2" : "border-line",
                  rest ? "bg-surface-2" : "bg-surface",
                  disabled ? "opacity-30" : "",
                ].join(" ")}
              >
                <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-2">{name}</span>
                <span className="text-[11px] text-body tabular-nums">J{d}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-muted-2">
          Jour {day} · {dayRest ? "sans entraînement" : "entraînement"}. Les menus varient au fil des 90 jours.
        </p>
      </section>

      {/* Macros : deux états + explication */}
      <section className="flex flex-col gap-3">
        <MonoLabel>Besoins du jour</MonoLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <MacroCard
            title="Jour d'entraînement"
            active={!dayRest}
            kcal={grp(trainKcal)}
            protein={`${Math.round(P)} g`}
            carbs={`${Math.round(C)} g`}
            fat={`${Math.round(F)} g`}
          />
          <MacroCard
            title="Jour de repos"
            active={dayRest}
            kcal={grp(restKcal)}
            protein={`${Math.round(P)} g`}
            carbs={`${Math.round(C * 0.8)} g`}
            fat={`${Math.round(F)} g`}
          />
        </div>
        <Card className="bg-surface-2">
          <p className="text-[13.5px] leading-[1.65] text-body">
            Les jours d'entraînement, tu vises tes calories complètes. Les jours sans
            entraînement, on retire environ <strong>10 % des calories</strong> et on
            réduit les glucides d'un cinquième, tout en <strong>maintenant les
            protéines</strong> : le muscle continue de récupérer, sans surplus
            inutile les jours où tu bouges moins. Le jour sélectionné ci-dessus est
            mis en avant.
          </p>
        </Card>
      </section>

      {/* Repas du jour */}
      <section className="flex flex-col gap-3">
        <MonoLabel>Repas — jour {day}</MonoLabel>
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

      {/* Générateur de recettes */}
      {canGenerate ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <MonoLabel>Idées de recettes</MonoLabel>
            <p className="text-[13px] text-muted">
              Calculées sur les objectifs du jour, sans tes allergènes ni les aliments que tu refuses.
            </p>
          </div>
          {recipeErr ? <Alert>{recipeErr}</Alert> : null}
          {recipes.map((r, i) => (
            <Card key={i} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-archivo font-semibold text-[16px] text-ink">{r.name}</div>
                <div className="font-mono text-[11px] text-brand">{r.kcal} kcal · {r.protein} · {r.time}</div>
              </div>
              <div className="flex flex-col gap-1">
                {r.ingredients.map((it, j) => (
                  <div key={j} className="flex justify-between text-[14px] text-body border-b border-line-2 py-1 last:border-0">
                    <span>{it.food}</span>
                    <span className="text-muted-2">{it.qty}</span>
                  </div>
                ))}
              </div>
              {r.steps ? <p className="text-[13.5px] text-muted leading-[1.55]">{r.steps}</p> : null}
            </Card>
          ))}
          <Button variant="outline" onClick={genRecipes} loading={recipeBusy} className="self-start h-11">
            {recipes.length ? "De nouvelles idées" : "Générer des idées de recettes"}
          </Button>
        </section>
      ) : null}

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
        <p className="text-[12px] text-muted-2">
          Les allergènes et le régime déclarés sont exclus. Le filtrage est une aide,
          pas une garantie : vérifie toujours les étiquettes des produits.
        </p>
      </section>
    </div>
  );
}

function MacroCard({
  title,
  active,
  kcal,
  protein,
  carbs,
  fat,
}: {
  title: string;
  active: boolean;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}) {
  return (
    <Card className={active ? "border-brand" : ""}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-archivo font-semibold text-[14px] text-ink">{title}</span>
          {active ? (
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-brand">aujourd'hui</span>
          ) : null}
        </div>
        <div className="font-archivo font-extrabold text-[30px] leading-none tracking-[-0.03em] text-ink">
          {kcal}
          <span className="text-[14px] text-muted-2"> kcal</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Prot.", protein],
            ["Gluc.", carbs],
            ["Lip.", fat],
          ].map(([l, v]) => (
            <div key={l} className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-2">{l}</span>
              <span className="font-archivo font-semibold text-[15px] text-ink">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
