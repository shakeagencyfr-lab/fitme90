"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { saveResellerAiMode, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { estimateAiMonthlyCost } from "@/lib/config";

interface Props {
  initialMode: "byok" | "provider";
  initialLimit: number;
  /** Le revendeur a-t-il branché sa clé Anthropic ? Sans clé, le mode
   *  « revendeur d'IA » n'est pas activable (BYOK forcé). */
  keyConfigured: boolean;
}

// Choix du mode de fourniture de l'IA du revendeur + plafond par client. Le
// coût projeté (plafond atteint) s'affiche en direct pour piloter la marge.
export function ResellerAiModeForm({ initialMode, initialLimit, keyConfigured }: Props) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(saveResellerAiMode, {} as ResellerAiState);
  const [mode, setMode] = useState<"byok" | "provider">(initialMode);
  const [limit, setLimit] = useState<number>(initialLimit);

  // Estimation par client : usage réaliste vs plafond de sécurité (recettes
  // bornées côté coach, on retient 1/jour par défaut pour la projection).
  const { realMonth, ceilingMonth } = estimateAiMonthlyCost(limit, 1);

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Mode de fourniture de l'IA")}</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          {tx("Choisis comment l'IA est fournie à tes coachs. Tu peux les laisser brancher leur propre clé (tu ne factures que les abonnements), ou fournir")} <span className="text-body">{tx("ta")}</span>{" "}
          {tx("clé à tout ton réseau et refacturer l'IA via tes paliers.")}</p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "byok"}
            onClick={() => setMode("byok")}
            title={tx("Coachs autonomes (BYOK)")}
            desc={tx("Chaque coach branche sa propre clé Anthropic et paie sa consommation IA. Tu ne factures que les abonnements.")}
          />
          <ModeCard
            active={mode === "provider"}
            onClick={() => keyConfigured && setMode("provider")}
            disabled={!keyConfigured}
            title={tx("Revendeur d'IA")}
            desc={tx("Tu fournis ta clé à tes coachs et fixes un plafond de messages/jour par client. Tu absorbes le coût IA et le refactures dans tes paliers.")}
            lockNote={keyConfigured ? undefined : "Nécessite ta clé Anthropic (à brancher plus bas)."}
          />
        </div>
        <input type="hidden" name="ai_mode" value={mode} />

        {!keyConfigured ? (
          <Alert>
            {tx("Pour activer le mode")} <span className="font-semibold">{tx("revendeur d'IA")}</span>{tx(", branche d'abord ta clé Anthropic dans la section ci-dessous. Tant qu'aucune clé n'est enregistrée, tes coachs restent en BYOK (chacun sa clé).")}</Alert>
        ) : null}

        {mode === "provider" ? (
          <div className="flex flex-col gap-3 rounded-control border border-line-4 bg-surface-2 p-4">
            <label className="flex flex-col gap-1.5">
              <MonoLabel>{tx("Plafond de messages Coach IA / jour / client (0 = illimité)")}</MonoLabel>
              <input
                type="number"
                name="ai_client_daily_limit"
                min={0}
                max={1000}
                value={limit}
                onChange={(e) => setLimit(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
                className="w-40 rounded-control border border-line-4 bg-surface px-3.5 py-2.5 font-plex text-[14px] text-ink outline-none focus:border-ink"
              />
              <span className="text-[12px] text-muted-2">
                {tx("Recettes incluses. Ce plafond s'impose à tous les clients de tes coachs (le coach peut le baisser, jamais le dépasser).")}</span>
            </label>

            <div className="flex flex-col gap-2 border-t border-line pt-3 text-[13px] text-body">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                  {tx("Coût IA réaliste par client")}</div>
                <span>
                  ≈ <span className="font-semibold text-ink">${realMonth.toFixed(2)}</span> {tx("/ client / mois pour un client actif (la plupart consomment moins).")}</span>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                  {tx("Plafond de sécurité")}</div>
                <span>
                  {ceilingMonth != null ? (
                    <>
                      {tx("Jamais plus de ≈")} <span className="font-semibold text-ink">${ceilingMonth.toFixed(0)}</span> {tx("/ client / mois, même en saturant le plafond tous les jours.")}</>
                  ) : (
                    <span className="text-muted">{tx("Plafond désactivé (illimité) — le coût n'est pas borné.")}</span>
                  )}
                </span>
              </div>
              <span className="text-[12px] text-muted-2">
                {tx("Estimation d'après la conso réelle (chat et recette sur Haiku ≈ $0.015–0.02 l'action). Détaille ta marge par crédit dans la « Tarification en crédits » ci-dessous.")}</span>
            </div>
          </div>
        ) : (
          <input type="hidden" name="ai_client_daily_limit" value={initialLimit} />
        )}

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">{tx("Mode enregistré. Il s'applique dès maintenant.")}</Alert> : null}

        <Button type="submit" loading={saving} disabled={mode === "provider" && !keyConfigured} className="self-start h-11">
          {tx("Enregistrer le mode")}</Button>
      </form>
    </Card>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  desc,
  disabled = false,
  lockNote,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  disabled?: boolean;
  lockNote?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-disabled={disabled}
      className={[
        "flex flex-col gap-1.5 rounded-control border p-4 text-left transition-colors",
        disabled
          ? "cursor-not-allowed border-line-4 bg-surface opacity-60"
          : active
            ? "border-brand bg-brand/5"
            : "border-line-4 bg-surface hover:border-ink/40",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            "inline-block h-3 w-3 rounded-full border-2",
            active && !disabled ? "border-brand bg-brand" : "border-line-4",
          ].join(" ")}
        />
        <span className="font-archivo font-bold text-[15px] text-ink">{title}</span>
        {disabled ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} className="text-muted-2" aria-hidden>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        ) : null}
      </div>
      <p className="text-[12.5px] leading-[1.55] text-muted">{desc}</p>
      {lockNote ? <p className="text-[12px] font-medium text-[#C4471A]">{lockNote}</p> : null}
    </button>
  );
}
