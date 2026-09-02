"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { saveCoachConfig, type ConfigState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import {
  estimateAiMonthlyCost,
  estimateAiMonthlyCredits,
  CREDITS_PER_AI_ACTION,
} from "@/lib/config";

interface Props {
  initialMode: "auto" | "custom";
  initialCustom: string;
  initialCoachName: string;
  initialDailyLimit: number;
  initialRecipeLimit: number;
  /**
   * Le coach consomme-t-il des CRÉDITS fournis par son revendeur plutôt que sa
   * propre clé (BYOK) ? Change l'unité de tout le bloc « plafonds » : un solde
   * de crédits qui descend, pas une facture Anthropic en dollars.
   */
  creditMode: boolean;
  /** Crédits consommés par une génération de programme (réglé par le fournisseur). */
  programCredits: number;
}

export function CoachConfigForm({
  initialMode,
  initialCustom,
  initialCoachName,
  initialDailyLimit,
  initialRecipeLimit,
  creditMode,
  programCredits,
}: Props) {
  const tx = usePhrase();
  const [state, action, pending] = useActionState(saveCoachConfig, {} as ConfigState);
  const [mode, setMode] = useState<"auto" | "custom">(initialMode);
  const [limit, setLimit] = useState<number>(initialDailyLimit);
  const [recipeLimit, setRecipeLimit] = useState<number>(initialRecipeLimit);

  const { realMonth, ceilingMonth } = estimateAiMonthlyCost(limit, recipeLimit);
  const credits = estimateAiMonthlyCredits(limit, recipeLimit);

  return (
    <Card as="section" className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Prénom du coach IA")}</div>
          <p className="text-[13px] text-muted">
            {tx("Le prénom sous lequel l'assistant se présente à tes clients (bulle de chat, message d'accueil, signatures).")}</p>
        </div>
        <label className="flex flex-col gap-1.5">
          <input
            type="text"
            name="coach_name"
            defaultValue={initialCoachName}
            maxLength={40}
            placeholder={tx("Ex : Sébastien")}
            className="w-full max-w-[280px] rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
          />
          <span className="text-[12px] text-muted-2">
            {tx("Laisse vide pour le prénom par défaut. Lettres, espaces et tirets uniquement.")}</span>
        </label>

        <div className="h-px bg-line" />

        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Mode de génération")}</div>
          <p className="text-[13px] text-muted">
            {tx("Comment l'IA construit les programmes des clients.")}</p>
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
          <MonoLabel>{tx("Ma méthodologie (utilisée en mode personnalisé)")}</MonoLabel>
          <textarea
            name="custom_methodology"
            defaultValue={initialCustom}
            rows={12}
            maxLength={8000}
            placeholder={tx("Ex : Toujours full-body 3× pour les débutants. Squat et soulevé de terre au cœur du cycle 2. Éviter le développé militaire debout pour les épaules fragiles. Repos 90 s en hypertrophie. Déficit max −20 %…")}
            className="w-full rounded-control border border-line-4 bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink outline-none focus:border-ink"
          />
          <span className="text-[12px] text-muted-2">
            {tx("Écris tes règles comme à un assistant coach. 8000 caractères max.")}</span>
        </label>

        <div className="h-px bg-line" />

        {/* Plafonds Coach IA + estimation de coût réaliste */}
        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Plafonds du Coach IA")}</div>
          <p className="text-[13px] text-muted">
            {creditMode ? (
              <>
                {tx("Deux plafonds")} <span className="text-body">{tx("par client et par jour")}</span> {tx("pour maîtriser ta consommation de crédits : les messages du chat, et les régénérations de recettes. Chaque action décompte")} {CREDITS_PER_AI_ACTION} {tx("crédit IA de ton solde ; une génération de programme en décompte")} {programCredits}.
              </>
            ) : (
              <>
                {tx("Deux plafonds")} <span className="text-body">{tx("par client et par jour")}</span> {tx("pour maîtriser ton coût IA (BYOK) : les messages du chat, et les régénérations de recettes (comptées à part car le modèle recettes coûte un peu plus).")}</>
            )}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Messages chat / jour / client (0 = illimité)")}</MonoLabel>
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
            <MonoLabel>{tx("Recettes régénérées / jour / client (0 = illimité)")}</MonoLabel>
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
        {/* Même bloc, deux unités : des dollars pour un coach BYOK (il reçoit une
            facture Anthropic), des crédits pour un coach en modèle crédits (il
            voit un solde descendre). */}
        <div className="flex flex-col gap-2 rounded-control border border-line-4 bg-surface-2 p-3.5 text-[13px] leading-relaxed text-muted">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{tx("Estimation réaliste")}</span>
            <div className="mt-0.5 text-body">
              {creditMode ? (
                <>
                  {tx("Un client actif consomme environ")}{" "}
                  <span className="font-semibold text-ink">{credits.realMonth} {tx("crédits IA/mois")}</span>
                  {" "}{tx("(≈8 messages + 1 recette par jour), plus")} {programCredits} {tx("crédits à chaque génération de programme. La plupart consomment moins.")}</>
              ) : (
                <>
                  {tx("Un client actif te coûte environ")}{" "}
                  <span className="font-semibold text-ink">${realMonth.toFixed(2)}{tx("/mois")}</span> {tx("en IA")}{" "}{tx("(≈8 messages + 1 recette par jour). La plupart consomment moins.")}</>
              )}
            </div>
          </div>
          <div className="border-t border-line pt-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{tx("Plafond de sécurité")}</span>
            <div className="mt-0.5">
              {creditMode ? (
                credits.ceilingMonth == null ? (
                  <>
                    {tx("Un de tes plafonds est sur")} <span className="font-semibold text-body">{tx("illimité")}</span> {tx(": rien ne borne le nombre de crédits qu'un client peut consommer. Fixe les deux plafonds pour garantir un maximum mensuel.")}</>
                ) : (
                  <>
                    {tx("Même si un client saturait ses plafonds")}{" "}
                    <span className="font-semibold text-body">{tx("tous les jours")}</span>{tx(", il ne dépasserait jamais")}{" "}
                    <span className="font-semibold text-body">{credits.ceilingMonth} {tx("crédits IA/mois")}</span>{tx(". Multiplie par ton nombre de clients pour dimensionner tes recharges.")}</>
                )
              ) : ceilingMonth == null ? (
                <>
                  {tx("Un de tes plafonds est sur")} <span className="font-semibold text-body">{tx("illimité")}</span> {tx(": le coût maximum n'est pas borné. Fixe les deux plafonds pour garantir un coût mensuel maximum.")}</>
              ) : (
                <>
                  {tx("Même si un client saturait ses plafonds")} <span className="font-semibold text-body">{tx("tous les jours")}</span>{tx(", le coût ne dépasserait jamais ≈")}{" "}
                  <span className="font-semibold text-body">${ceilingMonth.toFixed(0)}{tx("/mois")}</span>{tx(". À comparer au prix de ton abonnement : la marge reste très large.")}</>
              )}
            </div>
          </div>
        </div>

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Configuration enregistrée. Elle s'applique aux prochaines générations.")}</Alert> : null}

        <Button type="submit" loading={pending} className="self-start h-11">
          {tx("Enregistrer la configuration")}</Button>
      </form>
    </Card>
  );
}
