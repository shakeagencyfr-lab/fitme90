/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { networkAction, supportLoginAs, type NetworkState } from "@/app/admin/actions";
import { Alert, Button } from "@/components/ui";

// Menu « ⋯ » d'un compte du réseau : accès en assistance, crédits IA offerts
// (seulement si l'acteur fournit l'IA en crédits), désactivation / réactivation
// sans suppression, suppression définitive (nom à ressaisir).

/** Contexte de bascule BYOK <-> crédits, pour un revendeur rattaché à l'acteur. */
export interface SupplyInfo {
  current: "byok" | "platform_credits";
  /** Le revendeur a branché sa propre clé Anthropic. */
  targetHasKey: boolean;
  /** L'acteur a une clé : sans elle, l'IA en crédits ne tourne pas. */
  supplierKeyReady: boolean;
  /** L'acteur propose au moins un pack actif : sinon, aucune recharge possible. */
  supplierHasPack: boolean;
  /** Solde de crédits du revendeur. */
  credits: number;
}

interface Props {
  tenantId: string;
  name: string;
  ownerUserId: string | null;
  suspended: boolean;
  canGift: boolean;
  /** Renseigné uniquement pour un revendeur dont l'acteur est le parent. */
  supply?: SupplyInfo | null;
}

type Dialog = "gift" | "suspend" | "delete" | "supply" | null;

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function NetworkActionsMenu({ tenantId, name, ownerUserId, suspended, canGift, supply = null }: Props) {
  const tx = usePhrase();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [state, action, pending] = useActionState(networkAction, {} as NetworkState);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (state.ok) {
      setDialog(null);
      router.refresh();
    }
  }, [state.ok, state.done, router]);

  const item = "tap flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] font-medium transition-colors hover:bg-surface-2";

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tx("Actions")}
        className="tap inline-flex size-9 items-center justify-center rounded-control border border-line-4 bg-surface text-ink hover:border-ink"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1.5 w-[240px] overflow-hidden rounded-card border border-line bg-surface py-1 shadow-[0_18px_50px_-20px_rgba(23,25,27,.35)]">
          {ownerUserId ? (
            <form
              action={supportLoginAs}
              onSubmit={(e) => {
                if (!confirm(`Se connecter en assistance dans le compte « ${name} » ?\n\nUn bandeau te permettra de revenir à ton espace.`)) e.preventDefault();
              }}
            >
              <input type="hidden" name="target_user_id" value={ownerUserId} />
              <button type="submit" className={`${item} text-ink`}>
                <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8l2 2-4 4-2-2" /> {tx("Accéder en assistance")}</button>
            </form>
          ) : null}
          {canGift ? (
            <button type="button" className={`${item} text-ink`} onClick={() => { setOpen(false); setDialog("gift"); }}>
              <Icon d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /> {tx("Offrir des crédits IA")}</button>
          ) : null}
          {supply ? (
            <button type="button" className={`${item} text-ink`} onClick={() => { setOpen(false); setDialog("supply"); }}>
              <Icon d="M4 7h16M4 7l3-3M4 7l3 3M20 17H4m16 0-3-3m3 3-3 3" />{" "}
              {supply.current === "platform_credits" ? tx("Repasser en clé perso") : tx("Passer en crédits IA")}
            </button>
          ) : null}
          {suspended ? (
            <form action={action}>
              <input type="hidden" name="tenant_id" value={tenantId} />
              <input type="hidden" name="op" value="reactivate" />
              <button type="submit" className={`${item} text-ink`} disabled={pending}>
                <Icon d="M5 12h14M12 5l7 7-7 7" /> {tx("Réactiver le compte")}</button>
            </form>
          ) : (
            <button type="button" className={`${item} text-ink`} onClick={() => { setOpen(false); setDialog("suspend"); }}>
              <Icon d="M18.36 6.64A9 9 0 1 1 5.64 5.64M12 2v10" /> {tx("Désactiver le compte")}</button>
          )}
          <button type="button" className={`${item} text-[#C4471A]`} onClick={() => { setOpen(false); setDialog("delete"); }}>
            <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /> {tx("Supprimer le compte")}</button>
        </div>
      ) : null}

      {dialog ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" aria-label={tx("Fermer")} onClick={() => !pending && setDialog(null)} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
          <form action={action} className="relative z-10 flex w-full max-w-[440px] flex-col gap-4 rounded-card border border-line bg-surface p-6">
            <input type="hidden" name="tenant_id" value={tenantId} />
            {dialog === "gift" ? (
              <>
                <input type="hidden" name="op" value="gift" />
                <h2 className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-ink">{tx("Offrir des crédits IA à")} {name}</h2>
                <p className="text-[14px] leading-relaxed text-body">
                  {tx("Geste commercial : les crédits sont ajoutés immédiatement au portefeuille du compte et tracés dans son journal.")}</p>
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{tx("Nombre de crédits")}</span>
                  <input name="amount" type="number" min={1} max={100000} defaultValue={50} required className="h-11 w-[160px] rounded-control border border-line-4 bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink" />
                </label>
              </>
            ) : dialog === "supply" && supply ? (
              <SupplyDialog name={name} supply={supply} />
            ) : dialog === "suspend" ? (
              <>
                <input type="hidden" name="op" value="suspend" />
                <h2 className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-ink">{tx("Désactiver")} {name} ?</h2>
                <p className="text-[14px] leading-relaxed text-body">
                  {tx("Le compte est mis en pause sans rien supprimer : ses clients perdent l'accès à leur espace et le titulaire voit un bandeau l'invitant à te contacter. Tu peux le réactiver à tout moment.")}</p>
              </>
            ) : (
              <>
                <input type="hidden" name="op" value="delete" />
                <input type="hidden" name="expected_name" value={name} />
                <h2 className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-ink">{tx("Supprimer")} {name} ?</h2>
                <p className="text-[14px] leading-relaxed text-body">
                  {tx("Suppression")} <span className="font-semibold text-ink">{tx("définitive")}</span> {tx("du compte, de ses comptes rattachés, de ses clients et de toutes leurs données. Son abonnement chez toi est résilié. Pour confirmer, saisis son nom :")}</p>
                <input name="confirm_name" placeholder={name} autoComplete="off" required className="h-11 rounded-control border border-line-4 bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink" />
              </>
            )}
            {state.error ? <Alert>{state.error}</Alert> : null}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="submit"
                loading={pending}
                variant={dialog === "delete" ? "danger" : "primary"}
                disabled={dialog === "supply" && supply?.current === "byok" && !supply.supplierKeyReady}
                className="h-11"
              >
                {dialog === "gift"
                  ? "Créditer"
                  : dialog === "supply"
                    ? supply?.current === "platform_credits"
                      ? "Repasser en clé perso"
                      : "Basculer en crédits IA"
                    : dialog === "suspend"
                      ? "Désactiver"
                      : "Supprimer définitivement"}
              </Button>
              <button type="button" onClick={() => setDialog(null)} disabled={pending} className="tap rounded-btn border border-line-4 px-4 py-2.5 text-[14px] font-semibold text-body hover:border-ink disabled:opacity-50">
                {tx("Annuler")}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Corps du dialogue de bascule. La fourniture d'IA d'un revendeur décide de
 * QUI paie l'IA de tout son étage : on annonce donc précisément ce qui change
 * pour lui et pour ses coachs, et on bloque le sens « crédits » tant que la
 * clé de l'acteur n'est pas branchée (rien ne tournerait).
 */
function SupplyDialog({ name, supply }: { name: string; supply: SupplyInfo }) {
  const tx = usePhrase();
  const toCredits = supply.current === "byok";
  const next = toCredits ? "platform_credits" : "byok";

  return (
    <>
      <input type="hidden" name="op" value="supply" />
      <input type="hidden" name="supply" value={next} />
      <h2 className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-ink">
        {toCredits ? `Passer ${name} en crédits IA ?` : `Repasser ${name} sur sa propre clé ?`}
      </h2>

      {toCredits ? (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            {tx("Il n'a plus besoin de sa clé Anthropic : l'IA de tous ses coachs tourne sur")}{" "}
            <span className="font-semibold text-ink">{tx("ta clé")}</span>{tx(", et chaque action débite son solde de crédits. Il fixe librement son prix de revente à ses coachs et garde la marge.")}
          </p>
          <ul className="flex flex-col gap-1.5 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.55] text-body">
            <li>{tx("Il passe en « revendeur d'IA » : ce sont ses coachs qui consomment, lui qui paie.")}</li>
            <li>
              {tx("Solde actuel :")}{" "}
              <span className={`font-semibold tabular-nums ${supply.credits > 0 ? "text-ink" : "text-[#C4471A]"}`}>
                {supply.credits}
              </span>{" "}
              {tx("crédit")}{supply.credits > 1 ? "s" : ""}.
              {supply.credits <= 0 ? ` ${tx("À zéro, l'IA de ses coachs s'arrête : offre-lui des crédits ou laisse-le recharger.")}` : ""}
            </li>
            {supply.targetHasKey ? (
              <li>{tx("Sa propre clé reste enregistrée mais n'est plus utilisée. Rien n'est supprimé.")}</li>
            ) : null}
          </ul>
          {!supply.supplierKeyReady ? (
            <Alert>
              {tx("Aucune clé Anthropic sur ton compte plateforme : sans elle, l'IA de ses coachs ne tournerait pas. Branche-la dans « Revenu IA » avant de basculer.")}
            </Alert>
          ) : !supply.supplierHasPack ? (
            <Alert>
              {tx("Tu ne proposes aucun pack de crédits actif : il ne pourra pas recharger tout seul. Crée un pack dans « Revenu IA », ou offre-lui des crédits à la main.")}
            </Alert>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            {tx("Il cesse d'acheter des crédits chez toi et redevient autonome. Son solde restant est conservé mais n'est plus débité.")}
          </p>
          <ul className="flex flex-col gap-1.5 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.55] text-body">
            {supply.targetHasKey ? (
              <li>{tx("Sa clé Anthropic est déjà branchée : il continue de fournir l'IA à ses coachs, à ses frais.")}</li>
            ) : (
              <li className="text-[#C4471A]">
                {tx("Il n'a aucune clé Anthropic. Ses coachs repassent donc en « chacun sa clé » et son modèle de revente redevient l'abonnement, sans quoi son assistant serait muet.")}
              </li>
            )}
          </ul>
        </>
      )}
    </>
  );
}
