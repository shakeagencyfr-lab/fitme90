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
import { creditPackMargin, creditPackContents, suggestedPackPriceCents } from "@/lib/config";
import type { CreditPack } from "@/lib/credits";

interface Props {
  initialModel: "subscription" | "credits";
  keyConfigured: boolean;
  packs: CreditPack[];
  /** Prix de revente d'1 crédit IA, réglé plus bas dans « Tarification en crédits ». */
  aiUnitCents: number;
  /** Prix de revente d'1 crédit programme, même origine. */
  programUnitCents: number;
}

// Choix du modèle de revente + gestion des packs de crédits (Modèle B).
export function ResellerModelForm({ initialModel, keyConfigured, packs, aiUnitCents, programUnitCents }: Props) {
  const [state, action, saving] = useActionState(saveResellerModelChoice, {} as ResellerAiState);
  const [model, setModel] = useState<"subscription" | "credits">(initialModel);
  // Modèle réellement en base. `state.ok` couvre l'instant entre l'enregistrement
  // et la revalidation de la page.
  const savedModel = state.ok ? model : initialModel;
  const unsaved = model !== savedModel;

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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving} disabled={model === "credits" && !keyConfigured} className="h-11">
            Enregistrer le modèle
          </Button>
          {unsaved ? (
            <span className="text-[13px] text-[#C4471A]">
              Choix pas encore enregistré, rien n&apos;a changé pour tes coachs.
            </span>
          ) : null}
        </div>
      </form>

      {/* Les packs ne s'affichent QUE si le modèle « Crédits IA » est réellement
          enregistré. Sinon on pouvait créer des packs sur une simple sélection
          non sauvegardée : les coachs ne voyaient rien, sans que rien ne le dise.
          Après un enregistrement réussi, on n'attend pas la revalidation pour
          ouvrir la section. */}
      {savedModel === "credits" ? (
        <PacksManager packs={packs} aiUnitCents={aiUnitCents} programUnitCents={programUnitCents} />
      ) : model === "credits" ? (
        <div className="border-t border-line pt-5">
          <Alert>
            Enregistre d&apos;abord le modèle « Crédits IA » ci-dessus : tes packs ne peuvent exister
            que dans ce modèle, et tes coachs ne les verraient pas.
          </Alert>
        </div>
      ) : null}
    </Card>
  );
}

function PacksManager({
  packs,
  aiUnitCents,
  programUnitCents,
}: {
  packs: CreditPack[];
  aiUnitCents: number;
  programUnitCents: number;
}) {
  const [addState, addAction, adding] = useActionState(addCreditPack, {} as ResellerAiState);

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-5">
      <div>
        <div className="font-archivo font-bold text-[15.5px] text-ink">Packs de crédits</div>
        <p className="text-[13px] text-muted">
          Les bundles que tes coachs achètent. Le <span className="text-body">crédit IA</span> couvre
          une action (chat, recette, exercice) ; le <span className="text-body">crédit programme</span>{" "}
          couvre une génération. Un pack peut mélanger les deux : le coach règle tout en un seul
          paiement. Laisse un champ à 0 pour un pack d&apos;un seul type. Le prix se calcule tout
          seul à partir de tes prix de revente réglés plus bas ({(aiUnitCents / 100).toFixed(2)} €
          le crédit IA, {(programUnitCents / 100).toFixed(2)} € le crédit programme) ; tu peux
          l&apos;ajuster pour offrir une remise de volume.
        </p>
      </div>

      {packs.length ? (
        <div className="overflow-x-auto rounded-control border border-line-4">
          <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                {["Pack", "Contenu", "Prix de vente", "Prix de revient", "Marge", ""].map((h) => (
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

      <PackForm
        addAction={addAction}
        adding={adding}
        error={addState.error}
        aiUnitCents={aiUnitCents}
        programUnitCents={programUnitCents}
      />
    </div>
  );
}

const FIELD =
  "h-10 rounded-control border border-line-4 bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-ink";

/**
 * Création d'un pack. Les deux compteurs sont indépendants : mettre les deux à
 * une valeur > 0 crée un pack HYBRIDE (IA + programme) payé en une seule fois.
 *
 * Le PRIX DE VENTE se calcule tout seul à partir des prix unitaires réglés dans
 * « Tarification en crédits » (plus bas sur la page) : le revendeur a déjà fixé
 * combien il vend un crédit, inutile de le lui redemander pack par pack. Il
 * reste libre de l'ajuster pour offrir une remise de volume, auquel cas on lui
 * rappelle le prix conseillé et on lui offre un retour en arrière.
 *
 * Le PRIX DE REVIENT (ce que l'IA lui coûte réellement) et la marge se
 * recalculent à chaque frappe, pour qu'un prix à perte ne passe jamais inaperçu.
 */
function PackForm({
  addAction,
  adding,
  error,
  aiUnitCents,
  programUnitCents,
}: {
  addAction: (formData: FormData) => void;
  adding: boolean;
  error?: string;
  aiUnitCents: number;
  programUnitCents: number;
}) {
  const [ai, setAi] = useState("");
  const [program, setProgram] = useState("");
  // Prix saisi à la main ; `null` = on suit le prix conseillé.
  const [customPrice, setCustomPrice] = useState<string | null>(null);

  const aiN = Math.max(0, Math.trunc(Number(ai) || 0));
  const progN = Math.max(0, Math.trunc(Number(program) || 0));

  // Prix conseillé = ce que valent les crédits du pack à ton tarif unitaire.
  const suggestedCents = suggestedPackPriceCents(aiN, progN, aiUnitCents, programUnitCents);
  const suggested = suggestedCents > 0 ? (suggestedCents / 100).toFixed(2) : "";
  const price = customPrice ?? suggested;

  const priceCents = Math.round((Number(price.replace(",", ".")) || 0) * 100);
  const preview = aiN + progN > 0 ? creditPackMargin(aiN, progN, priceCents) : null;
  const edited = customPrice !== null && customPrice.trim() !== suggested;

  // Changer un nombre de crédits doit recalculer le prix, sauf si le revendeur
  // a délibérément mis un autre montant. Un prix saisi qui vaut exactement le
  // prix conseillé n'est pas une décision : on repasse en automatique.
  const changeCredits = (set: (v: string) => void) => (v: string) => {
    if (customPrice !== null && customPrice.trim() === suggested) setCustomPrice(null);
    set(v);
  };

  return (
    <form action={addAction} className="flex flex-col gap-3 rounded-control border border-line-4 bg-surface-2 p-4">
      <div className="grid items-start gap-3 sm:grid-cols-4">
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
            onChange={(e) => changeCredits(setAi)(e.target.value)}
            className={FIELD}
          />
          <span className="text-[11.5px] text-muted-2">à {(aiUnitCents / 100).toFixed(2)} € pièce</span>
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
            onChange={(e) => changeCredits(setProgram)(e.target.value)}
            className={FIELD}
          />
          <span className="text-[11.5px] text-muted-2">à {(programUnitCents / 100).toFixed(2)} € pièce</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <MonoLabel>Prix de vente (€)</MonoLabel>
          <input
            name="price_euros"
            inputMode="decimal"
            placeholder="calculé"
            value={price}
            onChange={(e) => setCustomPrice(e.target.value)}
            className={FIELD}
          />
          {edited ? (
            <button
              type="button"
              onClick={() => setCustomPrice(null)}
              className="tap self-start text-left text-[11.5px] text-muted underline decoration-line-4 underline-offset-2 hover:text-ink"
            >
              Conseillé : {suggested} €. Revenir au calcul.
            </button>
          ) : (
            <span className="text-[11.5px] text-muted-2">calculé, modifiable</span>
          )}
        </label>
      </div>

      {preview ? (
        <div className="flex flex-col gap-1 rounded-control border border-line-4 bg-surface px-3.5 py-3 text-[13px]">
          <div className="text-body">
            <span className="font-semibold text-ink">{creditPackContents(aiN, progN)}</span> vendus{" "}
            {preview.priceEur.toFixed(2)} €
            {edited && suggestedCents > 0 ? (
              <span className="text-muted-2">
                {" "}
                (remise de {((suggestedCents - priceCents) / 100).toFixed(2)} € sur le prix conseillé)
              </span>
            ) : null}
          </div>
          <div className="text-muted">
            Prix de revient (ce que l&apos;IA te coûte) : ≈ {preview.costEur.toFixed(2)} €{" "}
            <span aria-hidden>→</span>{" "}
            <span className={preview.marginEur < 0 ? "font-semibold text-[#C4471A]" : "font-semibold text-brand"}>
              {preview.marginEur < 0 ? "perte de " : "marge de "}
              {Math.abs(preview.marginEur).toFixed(2)} €
              {preview.marginEur > 0 ? ` (${Math.round(preview.marginPct)} %)` : ""}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted-2">
          Renseigne un nombre de crédits : le prix de vente et le prix de revient s&apos;affichent ici.
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
