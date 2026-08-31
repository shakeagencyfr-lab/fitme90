"use client";

import { useActionState, useState } from "react";
import {
  saveResellerModelChoice,
  addCreditPack,
  toggleCreditPack,
  removeCreditPack,
  type ResellerAiState,
} from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";
import { actionCreditMargin, programCreditMargin } from "@/lib/config";
import type { CreditPack } from "@/lib/credits";

interface Props {
  initialModel: "subscription" | "credits";
  keyConfigured: boolean;
  packs: CreditPack[];
}

// Choix du modèle de revente + gestion des packs de crédits (Modèle B).
export function ResellerModelForm({ initialModel, keyConfigured, packs }: Props) {
  const [state, action, saving] = useActionState(saveResellerModelChoice, {} as ResellerAiState);
  const [model, setModel] = useState<"subscription" | "credits">(initialModel);

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">Modèle de revente</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          Deux façons de gagner de l&apos;argent avec ton réseau. Tu choisis l&apos;une des deux pour
          l&apos;ensemble de tes coachs.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <ModelCard
            active={model === "subscription"}
            onClick={() => setModel("subscription")}
            title="Abonnement"
            desc="Tes coachs branchent leur propre clé IA (BYOK) et te paient un abonnement par fonctionnalités. Simple, tu ne gères pas l'IA."
          />
          <ModelCard
            active={model === "credits"}
            onClick={() => keyConfigured && setModel("credits")}
            disabled={!keyConfigured}
            lockNote={keyConfigured ? undefined : "Nécessite ta clé Anthropic (à brancher plus bas)."}
            title="Crédits IA"
            desc="Tes coachs achètent des packs de crédits (IA + programme), clients illimités, pas d'abonnement de base. Tu fournis l'IA et prends ta marge sur chaque crédit."
          />
        </div>
        <input type="hidden" name="reseller_model" value={model} />

        {state.error ? <Alert>{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Modèle enregistré.</Alert> : null}

        <Button type="submit" loading={saving} disabled={model === "credits" && !keyConfigured} className="self-start h-11">
          Enregistrer le modèle
        </Button>
      </form>

      {model === "credits" ? <PacksManager packs={packs} /> : null}
    </Card>
  );
}

function PacksManager({ packs }: { packs: CreditPack[] }) {
  const [addState, addAction, adding] = useActionState(addCreditPack, {} as ResellerAiState);
  const [kind, setKind] = useState<"ai" | "program">("ai");

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-5">
      <div>
        <div className="font-archivo font-bold text-[15.5px] text-ink">Packs de crédits</div>
        <p className="text-[13px] text-muted">
          Les bundles que tes coachs achètent. Le <span className="text-body">crédit IA</span> couvre
          une action (chat, recette, exercice) ; le <span className="text-body">crédit programme</span>{" "}
          couvre une génération.
        </p>
      </div>

      {packs.length ? (
        <div className="overflow-x-auto rounded-control border border-line-4">
          <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                {["Pack", "Type", "Crédits", "Prix", "Ton coût", "Marge", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.07em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => {
                const unit = p.kind === "program" ? programCreditMargin(0) : actionCreditMargin(0);
                const cost = unit.costEur * p.credits;
                const price = p.price_cents / 100;
                const margin = price - cost;
                return (
                  <tr key={p.id} className={`border-b border-line-2 last:border-0 ${p.is_active ? "" : "opacity-55"}`}>
                    <td className="px-3 py-2.5 font-semibold text-ink">{p.name}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-2">
                        {p.kind === "program" ? "Programme" : "IA"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-body">{p.credits}</td>
                    <td className="px-3 py-2.5 tabular-nums text-ink">{price.toFixed(2)} €</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted">≈ {cost.toFixed(2)} €</td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold text-brand">+{margin.toFixed(2)} €</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <form action={toggleCreditPack}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="active" value={p.is_active ? "" : "on"} />
                          <button type="submit" className="tap text-[12px] text-muted hover:text-ink">
                            {p.is_active ? "Masquer" : "Activer"}
                          </button>
                        </form>
                        <form action={removeCreditPack}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="tap text-[12px] text-muted hover:text-[#C4471A]">Suppr.</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[13px] text-muted-2">Aucun pack pour l&apos;instant. Ajoutes-en un ci-dessous.</p>
      )}

      <form action={addAction} className="grid items-end gap-3 rounded-control border border-line-4 bg-surface-2 p-4 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Type</MonoLabel>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value === "program" ? "program" : "ai")}
            className="h-10 rounded-control border border-line-4 bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-ink"
          >
            <option value="ai">Crédit IA</option>
            <option value="program">Crédit programme</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Nom</MonoLabel>
          <input name="name" placeholder="Pack 100 IA" className="h-10 rounded-control border border-line-4 bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Crédits</MonoLabel>
          <input name="credits" type="number" min={1} placeholder="100" className="h-10 rounded-control border border-line-4 bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Prix (€)</MonoLabel>
          <input name="price_euros" placeholder="29" className="h-10 rounded-control border border-line-4 bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-ink" />
        </label>
        {addState.error ? <div className="sm:col-span-4"><Alert>{addState.error}</Alert></div> : null}
        <div className="sm:col-span-4">
          <Button type="submit" loading={adding} className="h-10">Ajouter le pack</Button>
        </div>
      </form>
    </div>
  );
}

function ModelCard({
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
        disabled ? "cursor-not-allowed border-line-4 bg-surface opacity-60" : active ? "border-brand bg-brand/5" : "border-line-4 bg-surface hover:border-ink/40",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className={["inline-block h-3 w-3 rounded-full border-2", active && !disabled ? "border-brand bg-brand" : "border-line-4"].join(" ")} />
        <span className="font-archivo font-bold text-[15px] text-ink">{title}</span>
      </div>
      <p className="text-[12.5px] leading-[1.55] text-muted">{desc}</p>
      {lockNote ? <p className="text-[12px] font-medium text-[#C4471A]">{lockNote}</p> : null}
    </button>
  );
}
