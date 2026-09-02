"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useState } from "react";
import { createNetworkAccount, type CreateAccountState } from "@/app/admin/actions";
import { Button, Alert, Card, MonoLabel } from "@/components/ui";

// Création manuelle d'un compte enfant depuis le dashboard réseau.
// La plateforme peut créer un revendeur OU un coach ; un revendeur ne crée que
// des coachs (le sélecteur de type n'apparaît alors pas). En cas de succès, on
// affiche un lien de connexion à usage unique, copiable, à transmettre.
export function CreateAccountForm({ canCreateReseller }: { canCreateReseller: boolean }) {
  const tx = usePhrase();
  const [state, action, saving] = useActionState(createNetworkAccount, {} as CreateAccountState);
  const [kind, setKind] = useState<"reseller" | "coach">(canCreateReseller ? "reseller" : "coach");
  const [supply, setSupply] = useState<"byok" | "platform_credits">("byok");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!state.link) return;
    try {
      await navigator.clipboard.writeText(state.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* le presse-papier peut être indisponible : le lien reste sélectionnable */
    }
  };

  return (
    <Card as="section" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="font-archivo font-bold text-[17px] text-ink">{tx("Ajouter un compte manuellement")}</div>
        <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
          {tx("Crée directement")} {canCreateReseller ? "un revendeur ou un coach" : "un coach"} {tx("rattaché à ton réseau. Tu obtiens un")} <span className="text-body">{tx("lien de connexion à usage unique")}</span> {tx("(valable ~1 h) à copier et envoyer à la personne : elle se connecte, sans mot de passe à gérer.")}</p>
      </div>

      <form action={action} className="flex flex-col gap-3">
        {canCreateReseller ? (
          <div className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Type de compte")}</MonoLabel>
            <div className="flex gap-2">
              {(["reseller", "coach"] as const).map((k) => (
                <label
                  key={k}
                  className={[
                    "tap flex-1 cursor-pointer rounded-control border px-3.5 py-2.5 text-[14px] font-semibold transition-colors",
                    kind === k ? "border-brand bg-brand/[0.06] text-ink" : "border-line-4 text-body hover:border-ink/40",
                  ].join(" ")}
                >
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
                  {k === "reseller" ? "Revendeur" : "Coach / salle"}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <input type="hidden" name="kind" value={tx("coach")} />
        )}

        {canCreateReseller && kind === "reseller" ? (
          <div className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Fourniture de l'IA")}</MonoLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["byok", "Sa propre clé (BYOK)", "Le revendeur branche sa clé Anthropic et paie sa consommation."],
                ["platform_credits", "Crédits achetés chez toi", "Il t'achète des packs de crédits IA et les revend à ses coachs avec sa marge."],
              ] as const).map(([val, title, desc]) => (
                <label
                  key={val}
                  className={[
                    "tap flex cursor-pointer flex-col gap-0.5 rounded-control border px-3.5 py-2.5 transition-colors",
                    supply === val ? "border-brand bg-brand/[0.06]" : "border-line-4 hover:border-ink/40",
                  ].join(" ")}
                >
                  <input type="radio" name="ai_supply" value={val} checked={supply === val} onChange={() => setSupply(val)} className="sr-only" />
                  <span className="text-[14px] font-semibold text-ink">{title}</span>
                  <span className="text-[12px] text-muted-2">{desc}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{kind === "reseller" ? "Nom du réseau / enseigne" : "Nom de la marque / salle"}</MonoLabel>
            <input
              name="name"
              required
              defaultValue={state.name ?? ""}
              placeholder={kind === "reseller" ? "Studio Nord" : "Fit Studio"}
              className="h-10 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("E-mail du titulaire")}</MonoLabel>
            <input
              name="email"
              type="email"
              required
              defaultValue={state.email ?? ""}
              placeholder={tx("contact@exemple.fr")}
              className="h-10 rounded-control border border-line-4 bg-surface-2 px-3 text-[15px] text-ink outline-none focus:border-ink"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving} className="h-10">{tx("Créer le compte")}</Button>
          {state.error ? <Alert>{state.error}</Alert> : null}
        </div>
      </form>

      {state.ok ? (
        <div className="flex flex-col gap-2 rounded-control border border-brand/40 bg-brand/[0.05] p-3.5">
          <div className="text-[13.5px] font-semibold text-ink">
            {tx("Compte créé pour")} <span className="font-mono">{state.email}</span>.
          </div>
          {state.link ? (
            <>
              <MonoLabel>{tx("Lien de connexion à envoyer (valable ~1 h)")}</MonoLabel>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-control border border-line-4 bg-surface-2 px-3 py-2 font-mono text-[12px] text-ink">
                  {state.link}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="tap inline-flex h-9 items-center rounded-btn border border-line-4 px-3.5 text-[13px] font-semibold text-body hover:border-ink"
                >
                  {copied ? "Copié ✓" : "Copier"}
                </button>
              </div>
            </>
          ) : (
            <div className="text-[12.5px] text-muted">
              {tx("Compte créé, mais le lien n'a pas pu être généré. La personne peut se connecter via « mot de passe oublié » avec son e-mail.")}</div>
          )}
        </div>
      ) : null}
    </Card>
  );
}
