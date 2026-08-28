"use client";

import { useMemo, useRef, useState } from "react";
import {
  dayMeals,
  shoppingList,
  shoppingListText,
  targetKcalForDay,
  pnum,
  grp,
} from "@/lib/nutrition";
import { Card, MonoLabel, Button, Alert } from "@/components/ui";
import { setShoppingCheck } from "@/app/app/nutrition/actions";
import { dateOfProgramDay } from "@/lib/schedule";

interface Recipe {
  name: string;
  level?: string;
  time: string;
  servings?: string;
  kcal: string;
  protein: string;
  carbs?: string;
  fat?: string;
  ingredients: { food: string; qty: string }[];
  steps: string[];
  tip?: string;
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
  initialChecks?: string[]; // clés d'articles déjà cochées (persistées)
  startDate?: string; // date de début du programme (pour les vraies dates)
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
  initialChecks = [],
  startDate = "",
}: Props) {
  // Vraie date d'un jour de programme (numéro + mois court), si connue.
  const dateOf = (d: number) =>
    startDate
      ? dateOfProgramDay(startDate, d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })
      : `J${d}`;
  // Date longue (jour de semaine + numéro + mois), pour le récapitulatif.
  const dateLong = (d: number) =>
    startDate
      ? dateOfProgramDay(startDate, d).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        })
      : `Jour ${d}`;
  // Vrai jour de semaine (abrégé, MAJ) d'un jour de programme, aligné calendrier.
  const weekdayOf = (d: number, fallback: string) =>
    startDate
      ? dateOfProgramDay(startDate, d)
          .toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" })
          .replace(".", "")
          .toUpperCase()
      : fallback;
  const initialWeek = Math.min(WEEKS, Math.floor((currentDay - 1) / 7) + 1);
  const initialDow = (currentDay - 1) % 7;
  const [week, setWeek] = useState(initialWeek);
  const [dow, setDow] = useState(initialDow);
  const [span, setSpan] = useState<3 | 7 | 14>(7);
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialChecks.map((k) => [k, true])),
  );
  const [copied, setCopied] = useState(false);

  // Coche/décoche un article et persiste l'état (optimiste, retour arrière en
  // cas d'échec réseau). La coche survit ainsi au rechargement et se synchronise
  // entre appareils.
  function toggleItem(key: string) {
    const next = !checked[key];
    setChecked((c) => ({ ...c, [key]: next }));
    setShoppingCheck(key, next).then((r) => {
      if (!r?.ok) setChecked((c) => ({ ...c, [key]: !next }));
    });
  }

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  // Deux actions distinctes (générer / photo) : un état de chargement PAR bouton
  // pour n'afficher le spinner que sur celui réellement cliqué.
  const [recipeBusy, setRecipeBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

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

  // Photo d'aliments → recette : compression côté client puis analyse (vision).
  async function onFoodPhoto(file: File | undefined) {
    if (!file) return;
    setRecipeErr("");
    setPhotoBusy(true);
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error("image"));
        im.src = url;
      });
      URL.revokeObjectURL(url);
      const max = 1024;
      let { width, height } = img;
      if (width > max || height > max) {
        const r = Math.min(max / width, max / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
      const data = canvas.toDataURL("image/jpeg", 0.82).split(",")[1] ?? "";
      const res = await fetch("/api/recipes/photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: { data, media_type: "image/jpeg" } }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "Indisponible.");
      if (out.error) throw new Error(out.error);
      setRecipes(out.recipes ?? []);
    } catch (e) {
      setRecipeErr(e instanceof Error ? e.message : "Analyse impossible.");
    } finally {
      setPhotoBusy(false);
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
                w === week ? "bg-fill text-fillfg border-fill" : "bg-surface text-body border-line-4",
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
            const dom = startDate ? dateOfProgramDay(startDate, d).getUTCDate() : d;
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => setDow(i)}
                title={disabled ? undefined : `${dateOf(d)}${rest ? " · repos" : " · entraînement"}`}
                className={[
                  "tap flex flex-col items-center gap-0.5 rounded-control border py-2 text-center transition-colors",
                  on ? "border-ink border-2" : rest ? "border-line" : "border-brand/35",
                  rest ? "bg-surface-2" : "bg-brand/5",
                  disabled ? "opacity-30" : "",
                ].join(" ")}
              >
                <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted-2">{weekdayOf(d, name)}</span>
                <span className={["text-[13px] font-semibold tabular-nums", rest ? "text-body" : "text-brand"].join(" ")}>
                  {dom}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-muted-2">
          <span className="font-semibold text-body capitalize">{dateLong(day)}</span> · jour {day} ·{" "}
          {dayRest ? "sans entraînement" : "entraînement"}. Les menus varient au fil des 90 jours.
        </p>
      </section>

      {/* Macros : deux états + explication */}
      <section className="flex flex-col gap-3">
        <MonoLabel>Besoins du jour</MonoLabel>
        <div className="grid gap-3 sm:grid-cols-2">
          <MacroCard
            title="Jour d'entraînement"
            tone="train"
            active={!dayRest}
            kcal={grp(trainKcal)}
            protein={`${Math.round(P)} g`}
            carbs={`${Math.round(C)} g`}
            fat={`${Math.round(F)} g`}
          />
          <MacroCard
            title="Jour de repos"
            tone="rest"
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
        <MonoLabel>Repas, jour {day}</MonoLabel>
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
            <Card key={i} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-archivo font-semibold text-[16.5px] leading-tight text-ink">{r.name}</div>
                  {r.level ? (
                    <span className="shrink-0 rounded-pill border border-brand/40 bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-brand">
                      {r.level}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-2">
                  <span>{r.time}</span>
                  {r.servings ? <span>· {r.servings}</span> : null}
                  <span>· {r.kcal} kcal</span>
                  <span>· P {r.protein}</span>
                  {r.carbs ? <span>· G {r.carbs}</span> : null}
                  {r.fat ? <span>· L {r.fat}</span> : null}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">Ingrédients</div>
                {r.ingredients.map((it, j) => (
                  <div key={j} className="flex justify-between border-b border-line-2 py-1 text-[14px] text-body last:border-0">
                    <span>{it.food}</span>
                    <span className="text-muted-2">{it.qty}</span>
                  </div>
                ))}
              </div>

              {r.steps && r.steps.length ? (
                <div className="flex flex-col gap-1.5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">Préparation</div>
                  <ol className="flex flex-col gap-2">
                    {r.steps.map((st, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[13.5px] leading-[1.5] text-body">
                        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-[11px] font-bold text-brand">
                          {j + 1}
                        </span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {r.tip ? (
                <div className="rounded-control bg-surface-2 px-3.5 py-2.5 text-[13px] leading-[1.5] text-muted">
                  <span className="font-semibold text-body">Astuce :</span> {r.tip}
                </div>
              ) : null}
            </Card>
          ))}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              onFoodPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={genRecipes} loading={recipeBusy} disabled={photoBusy} className="h-11">
              {recipes.length ? "De nouvelles idées" : "Générer des idées de recettes"}
            </Button>
            <Button variant="outline" onClick={() => photoRef.current?.click()} loading={photoBusy} disabled={recipeBusy} className="h-11">
              Photo de mes aliments
            </Button>
          </div>
          <p className="text-[12px] text-muted-2">
            Prends en photo tes aliments ou ton frigo : le coach identifie ce qu&apos;il y a et te
            propose une recette réalisable avec.
          </p>
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
                  span === d ? "bg-fill text-fillfg border-fill" : "bg-surface text-body border-line-4",
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
                    onClick={() => toggleItem(it.key)}
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
  tone,
  active,
  kcal,
  protein,
  carbs,
  fat,
}: {
  title: string;
  tone: "train" | "rest";
  active: boolean;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
}) {
  // Jour d'entraînement : accent orange (brand). Jour de repos : accent vert
  // (récupération). Le jour actif est nettement mis en avant (bandeau, relief),
  // l'autre est atténué pour ne pas distraire.
  const solid = tone === "train" ? "#E0551F" : "#2F6B3C";
  const accent =
    tone === "train"
      ? { border: "border-brand", bg: "bg-brand/[0.07]", text: "text-brand" }
      : { border: "border-[#2F6B3C]", bg: "bg-[#2F6B3C]/[0.08]", text: "text-[#2F6B3C]" };
  return (
    <Card
      className={[
        "relative overflow-hidden transition-all",
        active
          ? `${accent.border} border-2 ${accent.bg} shadow-[0_8px_24px_rgba(23,25,27,0.10)]`
          : "opacity-60",
      ].join(" ")}
    >
      {active ? (
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-center py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
          style={{ background: solid }}
        >
          Aujourd&apos;hui
        </div>
      ) : null}
      <div className={["flex flex-col gap-3", active ? "pt-5" : ""].join(" ")}>
        <div className="flex items-center justify-between">
          <span className={["font-archivo font-semibold text-[14px]", active ? accent.text : "text-ink"].join(" ")}>{title}</span>
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
