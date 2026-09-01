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
import { creditPackMargin, creditPackContents } from "@/lib/config";
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

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-5">
      <div>
        <div className="font-archivo font-bold text-[15.5px] text-ink">Packs de crédits</div>
        <p className="text-[13px] text-muted">
          Les bundles que tes coachs achètent. Le <span className="text-body">crédit IA</span> couvre
          une action (chat, recette, exercice) ; le <span className="text-body">crédit programme</span>{" "}
          couvre une génération. Un pack peut mélanger les deux : le coach règle tout en un seul
          paiement. Laisse un champ à 0 pour un pack d&apos;un seul type.
        </p>
      </div>

      {packs.length ? (
        <div className="overflow-x-auto rounded-control border border-line-4">
          <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                {["Pack", "Contenu", "Prix", "Ton coût", "Marge", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.07em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => {
                const m = creditPackMargin(p.ai_credits, p.program_credits, p.price_cents);
                const hybrid = p.ai_credits > 0 && p.program_credits > 0;
                return (
                  <tr key={p.id} className={`border-b border-line-2 last:border-0 ${p.is_active ? "" : "opacity-55"}`}>
                    <td className="px-3 py-2.5 font-semibold text-ink">
                      {p.name}
                      {hybrid ? (
                        <span className="ml-2 rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase text-brand">
                          Hybride
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-body">
                      {creditPackContents(p.ai_credits, p.program_credits)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-ink">{m.priceEur.toFixed(2)} €</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted">≈ {m.costEur.toFixed(2)} €</td>
                    <td
                      className={`px-3 py-2.5 tabular-nums font-semibold ${m.marginEur < 0 ? "text-[#C4471A]" : "text-brand"}`}
                    >
                      {m.marginEur < 0 ? "" : "+"}
                      {m.marginEur.toFixed(2)} €
                    </td>
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

      <PackForm addAction={addAction} adding={adding} error={addState.error} />
    </div>
  );
}

const FIELD =
  "h-10 rounded-control border border-line-4 bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-ink";

/**
 * Création d'un pack. Les deux compteurs sont indépendants : mettre les deux à
 * une valeur > 0 crée un pack HYBRIDE (IA + programme) payé en une seule fois.
 * Le coût et la marge se recalculent en direct pour que le revendeur ne fixe
 * jamais un prix à perte sans le voir.
 */
function PackForm({
  addAction,
  adding,
  error,
}: {
  addAction: (formData: FormData) => void;
  adding: boolean;
  error?: string;
}) {
  const [ai, setAi] = useState("");
  const [program, setProgram] = useState("");
  const [price, setPrice] = useState("");

  const aiN = Math.max(0, Math.trunc(Number(ai) || 0));
  const progN = Math.max(0, Math.trunc(Number(program) || 0));
  const priceCents = Math.round((Number(price.replace(",", ".")) || 0) * 100);
  const preview = aiN + progN > 0 && priceCents > 0 ? creditPackMargin(aiN, progN, priceCents) : null;

  return (
    <form action={addAction} className="flex flex-col gap-3 rounded-control border border-line-4 bg-surface-2 p-4">
      <div className="grid items-end gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Nom</MonoLabel>
          <input name="name" placeholder="Pack Découverte" className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Crédits IA</MonoLabel>
          <input
            name="ai_credits"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="100"
            value={ai}
            onChange={(e) => setAi(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Crédits programme</MonoLabel>
          <input
            name="program_credits"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="5"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Prix (€)</MonoLabel>
          <input
            name="price_euros"
            inputMode="decimal"
            placeholder="39"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={FIELD}
          />
        </label>
      </div>

      {preview ? (
        <p className="text-[13px] text-muted">
          <span className="text-body">{creditPackContents(aiN, progN)}</span> pour{" "}
          {preview.priceEur.toFixed(2)} €. Ton coût IA estimé : ≈ {preview.costEur.toFixed(2)} € →{" "}
          <span className={preview.marginEur < 0 ? "font-semibold text-[#C4471A]" : "font-semibold text-brand"}>
            {preview.marginEur < 0 ? "perte de " : "marge de "}
            {Math.abs(preview.marginEur).toFixed(2)} €
            {preview.marginEur >= 0 ? ` (${Math.round(preview.marginPct)} %)` : ""}
          </span>
          .
        </p>
      ) : (
        <p className="text-[13px] text-muted-2">
          Renseigne au moins un type de crédit et un prix : coût et marge s&apos;affichent ici.
        </p>
      )}

      {error ? <Alert>{error}</Alert> : null}
      <div>
        <Button type="submit" loading={adding} className="h-10">Ajouter le pack</Button>
      </div>
    </form>
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
