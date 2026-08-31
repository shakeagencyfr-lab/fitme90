"use client";

import { useActionState, useState } from "react";
import { saveCoachConfig, type ConfigState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { estimateAiMonthlyCost } from "@/lib/config";

interface Props {
  initialMode: "auto" | "custom";
  initialCustom: string;
  initialCoachName: string;
  initialDailyLimit: number;
  initialRecipeLimit: number;
}

export function CoachConfigForm({
  initialMode,
  initialCustom,
  initialCoachName,
  initialDailyLimit,
  initialRecipeLimit,
}: Props) {
  const [state, action, pending] = useActionState(saveCoachConfig, {} as ConfigState);
  const [mode, setMode] = useState<"auto" | "custom">(initialMode);
  const [limit, setLimit] = useState<number>(initialDailyLimit);
  const [recipeLimit, setRecipeLimit] = useState<number>(initialRecipeLimit);

  const { realMonth, ceilingMonth } = estimateAiMonthlyCost(limit, recipeLimit);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">Prénom du coach IA</div>
          <p className="text-[13px] text-muted">
            Le prénom sous lequel l&apos;assistant se présente à tes clients (bulle
            de chat, message d&apos;accueil, signatures).
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <input
            type="text"
            name="coach_name"
            defaultValue={initialCoachName}
            maxLength={40}
            placeholder="Ex : Sébastien"
            className="w-full max-w-[280px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
          />
          <span className="text-[12px] text-muted-2">
            Laisse vide pour le prénom par défaut. Lettres, espaces et tirets uniquement.
          </span>
        </label>

        <div className="h-px bg-line" />

        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">Mode de génération</div>
          <p className="text-[13px] text-muted">
            Comment l&apos;IA construit les programmes des clients.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {(
            [
              ["auto", "Laisser l'IA décider", "L'IA applique la méthodologie evidence-based de référence."],
              ["custom", "Personnaliser avec ma méthode", "L'IA suit TES consignes ci-dessous (prioritaires) en plus de la base."],
            ] as const
          ).map(([val, title, desc]) => (
            <label
              key={val}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-control border p-3.5 transition-colors",
                mode === val ? "border-brand bg-alert" : "border-line-4 bg-surface hover:border-ink",
              ].join(" ")}
            >
              <input
                type="radio"
                name="mode"
                value={val}
                checked={mode === val}
                onChange={() => setMode(val)}
                className="mt-1"
                style={{ accentColor: "#e0551f" }}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-[15px] text-ink">{title}</span>
                <span className="text-[13px] text-muted">{desc}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <MonoLabel>Ma méthodologie (utilisée en mode personnalisé)</MonoLabel>
          <textarea
            name="custom_methodology"
            defaultValue={initialCustom}
            rows={12}
            maxLength={8000}
            placeholder="Ex : Toujours full-body 3× pour les débutants. Squat et soulevé de terre au cœur du cycle 2. Éviter le développé militaire debout pour les épaules fragiles. Repos 90 s en hypertrophie. Déficit max −20 %…"
            className="w-full rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
          <span className="text-[12px] text-muted-2">
            Écris tes règles comme à un assistant coach. 8000 caractères max.
          </span>
        </label>

        <div className="h-px bg-line" />

        {/* Plafonds Coach IA + estimation de coût réaliste */}
        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">Plafonds du Coach IA</div>
          <p className="text-[13px] text-muted">
            Deux plafonds <span className="text-body">par client et par jour</span> pour maîtriser ton coût
            IA (BYOK) : les messages du chat, et les régénérations de recettes (comptées à part car le
            modèle recettes coûte un peu plus).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <MonoLabel>Messages chat / jour / client (0 = illimité)</MonoLabel>
            <input
              type="number"
              name="coach_ai_daily_limit"
              min={0}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-full max-w-[160px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>Recettes régénérées / jour / client (0 = illimité)</MonoLabel>
            <input
              type="number"
              name="recipe_ai_daily_limit"
              min={0}
              max={100}
              value={recipeLimit}
              onChange={(e) => setRecipeLimit(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="w-full max-w-[160px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>
        </div>
        <div className="flex flex-col gap-2 rounded-control border border-line-4 bg-surface-2 p-3.5 text-[13px] leading-relaxed text-muted">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">Estimation réaliste</span>
            <div className="mt-0.5 text-body">
              Un client actif te coûte environ{" "}
              <span className="font-semibold text-ink">${realMonth.toFixed(2)}/mois</span> en IA
              {" "}(≈8 messages + {recipeLimit > 0 ? recipeLimit : "quelques"} recette
              {recipeLimit === 1 ? "" : "s"}/jour). La plupart consomment moins.
            </div>
          </div>
          <div className="border-t border-line pt-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">Plafond de sécurité</span>
            <div className="mt-0.5">
              Même si un client saturait ses plafonds <span className="font-semibold text-body">tous les jours</span>,
              le coût ne dépasserait jamais ≈{" "}
              <span className="font-semibold text-body">${ceilingMonth.toFixed(0)}/mois</span>. À comparer au
              prix de ton abonnement : la marge reste très large.
            </div>
          </div>
        </div>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Configuration enregistrée. Elle s&apos;applique aux prochaines générations.</Alert> : null}

        <Button type="submit" loading={pending} className="self-start h-11">
          Enregistrer la configuration
        </Button>
      </form>
    </Card>
  );
}
