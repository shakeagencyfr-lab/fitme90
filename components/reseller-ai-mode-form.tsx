"use client";

import { useActionState, useState } from "react";
import { saveResellerAiMode, type ResellerAiState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { estimateAiMonthlyCost } from "@/lib/config";

interface Props {
  initialMode: "byok" | "provider";
  initialLimit: number;
}

// Choix du mode de fourniture de l'IA du revendeur + plafond par client. Le
// coût projeté (plafond atteint) s'affiche en direct pour piloter la marge.
export function ResellerAiModeForm({ initialMode, initialLimit }: Props) {
  const [state, action, saving] = useActionState(saveResellerAiMode, {} as ResellerAiState);
  const [mode, setMode] = useState<"byok" | "provider">(initialMode);
  const [limit, setLimit] = useState<number>(initialLimit);

  // Estimation par client : usage réaliste vs plafond de sécurité (recettes
  // bornées côté coach, on retient 1/jour par défaut pour la projection).
  const { realMonth, ceilingMonth } = estimateAiMonthlyCost(limit, 1);

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Mode de fourniture de l&apos;IA</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          Choisis comment l&apos;IA est fournie à tes coachs. Tu peux les laisser brancher leur
          propre clé (tu ne factures que les abonnements), ou fournir <span className="text-body">ta</span>{" "}
          clé à tout ton réseau et refacturer l&apos;IA via tes paliers.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={mode === "byok"}
            onClick={() => setMode("byok")}
            title="Coachs autonomes (BYOK)"
            desc="Chaque coach branche sa propre clé Anthropic et paie sa consommation IA. Tu ne factures que les abonnements."
          />
          <ModeCard
            active={mode === "provider"}
            onClick={() => setMode("provider")}
            title="Revendeur d'IA"
            desc="Tu fournis ta clé à tes coachs et fixes un plafond de messages/jour par client. Tu absorbes le coût IA et le refactures dans tes paliers."
          />
        </div>
        <input type="hidden" name="ai_mode" value={mode} />

        {mode === "provider" ? (
          <div className="flex flex-col gap-3 rounded-control border border-line-4 bg-surface-2 p-4">
            <label className="flex flex-col gap-1.5">
              <MonoLabel>Plafond de messages Coach IA / jour / client (0 = illimité)</MonoLabel>
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
                Recettes incluses. Ce plafond s&apos;impose à tous les clients de tes coachs (le
                coach peut le baisser, jamais le dépasser).
              </span>
            </label>

            <div className="flex flex-col gap-2 border-t border-line pt-3 text-[13px] text-body">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                  Coût IA réaliste par client
                </div>
                <span>
                  ≈ <span className="font-semibold text-ink">${realMonth.toFixed(2)}</span> / client / mois pour
                  un client actif (la plupart consomment moins).
                </span>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                  Plafond de sécurité
                </div>
                <span>
                  {ceilingMonth != null ? (
                    <>
                      Jamais plus de ≈ <span className="font-semibold text-ink">${ceilingMonth.toFixed(0)}</span> /
                      client / mois, même en saturant le plafond tous les jours.
                    </>
                  ) : (
                    <span className="text-muted">Plafond désactivé (illimité) — le coût n&apos;est pas borné.</span>
                  )}
                </span>
              </div>
              <span className="text-[12px] text-muted-2">
                Estimation d&apos;après la conso réelle (chat et recette sur Haiku ≈ $0.015–0.02 l&apos;action).
                Détaille ta marge par crédit dans la « Tarification en crédits » ci-dessous.
              </span>
            </div>
          </div>
        ) : (
          <input type="hidden" name="ai_client_daily_limit" value={initialLimit} />
        )}

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Mode enregistré. Il s&apos;applique dès maintenant.</Alert> : null}

        <Button type="submit" loading={saving} className="self-start h-11">
          Enregistrer le mode
        </Button>
      </form>
    </Card>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "flex flex-col gap-1.5 rounded-control border p-4 text-left transition-colors",
        active ? "border-brand bg-brand/5" : "border-line-4 bg-surface hover:border-ink/40",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            "inline-block h-3 w-3 rounded-full border-2",
            active ? "border-brand bg-brand" : "border-line-4",
          ].join(" ")}
        />
        <span className="font-archivo font-bold text-[15px] text-ink">{title}</span>
      </div>
      <p className="text-[12.5px] leading-[1.55] text-muted">{desc}</p>
    </button>
  );
}
