/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { usePhrase } from "@/components/locale-provider";

import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { networkAction, supportLoginAs, type NetworkState } from "@/app/admin/actions";
import { Alert, Button } from "@/components/ui";

// Menu « ⋯ » d'un compte du réseau : accès en assistance, crédits IA offerts
// (seulement si l'acteur fournit l'IA en crédits), désactivation / réactivation
// sans suppression, suppression définitive (nom à ressaisir).

/** Contexte de bascule BYOK <-> crédits, pour un revendeur rattaché à l'acteur. */
export interface SupplyInfo {
  /** Étage concerné : le geste et son libellé ne sont pas les mêmes. */
  kind: "reseller" | "coach";
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
  /** Paliers que l'acteur peut poser sur ce compte (les siens). */
  plans?: PlanChoice[];
  /** Palier actuellement posé, pour présélectionner le bon choix. */
  currentPlanId?: string | null;
  /** Le palier a-t-il été OFFERT (pas payé) ? Change le libellé du dialogue. */
  planGranted?: boolean;
  /**
   * Ce que la capacité du palier plafonne sur CE compte : les clients d'un
   * coach, les comptes de réseau d'un revendeur. Le nombre est le même en base,
   * la phrase ne peut pas l'être.
   */
  capacityUnit?: "clients" | "comptes";
}

type Dialog = "gift" | "suspend" | "delete" | "supply" | "plan" | null;

/** Palier proposé par l'acteur, tel qu'il peut le poser sur un compte enfant. */
export interface PlanChoice {
  id: string;
  name: string;
  /** Capacité incluse, en clients ou en comptes selon le compte visé. null = illimité. */
  clientLimit: number | null;
}

/** « 25 comptes », « clients illimités » : le nombre, puis le bon mot. */
function capaciteLabel(
  limite: number | null,
  unite: "clients" | "comptes",
  tx: (s: string) => string,
): string {
  if (limite == null) return unite === "comptes" ? tx("comptes illimités") : tx("clients illimités");
  const mot =
    unite === "comptes"
      ? limite > 1
        ? tx("comptes")
        : tx("compte")
      : limite > 1
        ? tx("clients")
        : tx("client");
  return `${limite} ${mot}`;
}

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function NetworkActionsMenu({
  tenantId,
  name,
  ownerUserId,
  suspended,
  canGift,
  supply = null,
  plans = [],
  currentPlanId = null,
  planGranted = false,
  capacityUnit = "clients",
}: Props) {
  const tx = usePhrase();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [state, action, pending] = useActionState(networkAction, {} as NetworkState);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Le menu est rendu dans un PORTAL : la table est dans un conteneur
  // `overflow-x-auto`, qui découpait purement et simplement un menu positionné
  // en absolu. En `fixed`, il échappe au découpage et peut s'ouvrir vers le
  // haut quand le bas de l'écran est trop proche.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Position calculée APRÈS rendu, quand la hauteur réelle du menu est connue :
  // l'estimer d'après le nombre d'entrées se trompait dès qu'une entrée
  // conditionnelle apparaissait.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function place() {
      const btn = btnRef.current;
      const menu = menuRef.current;
      if (!btn || !menu) return;
      // Sous 640 px, un menu ancré déborde de toute façon : feuille du bas.
      if (window.innerWidth < 640) {
        setSheet(true);
        return;
      }
      setSheet(false);
      const r = btn.getBoundingClientRect();
      const h = menu.offsetHeight;
      const w = menu.offsetWidth;
      const below = window.innerHeight - r.bottom;
      const top = below >= h + 12 ? r.bottom + 6 : Math.max(8, r.top - h - 6);
      const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    // La table défile horizontalement : sans ça le menu resterait en arrière.
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

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
        ref={btnRef}
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

      {open ? createPortal(
        <>
          {/* Voile : sur mobile il matérialise la feuille, sur bureau il ferme
              au clic sans intercepter le scroll. */}
          {sheet ? (
            <button
              type="button"
              aria-label={tx("Fermer")}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]"
            />
          ) : null}
          <div
            ref={menuRef}
            role="menu"
            style={sheet ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className={
              sheet
                ? "fixed inset-x-0 bottom-0 z-[71] max-h-[70dvh] overflow-y-auto rounded-t-card border-t border-line bg-surface pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-18px_50px_-20px_rgba(23,25,27,.35)]"
                : "fixed z-[71] w-[240px] overflow-hidden rounded-card border border-line bg-surface py-1 shadow-[0_18px_50px_-20px_rgba(23,25,27,.35)]"
            }
          >
          {sheet ? (
            <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-line-4" aria-hidden />
          ) : null}
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
              {supply.current === "platform_credits"
                ? tx("Repasser en clé perso")
                : supply.kind === "coach"
                  ? tx("Remettre sous ton IA")
                  : tx("Passer en crédits IA")}
            </button>
          ) : null}
          {plans.length > 0 ? (
            <button type="button" className={`${item} text-ink`} onClick={() => { setOpen(false); setDialog("plan"); }}>
              <Icon d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />{" "}
              {currentPlanId ? tx("Changer son palier") : tx("Offrir un palier")}
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
        </>,
        document.body,
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
            ) : dialog === "plan" ? (
              <>
                <input type="hidden" name="op" value="plan" />
                <h2 className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-ink">{tx("Palier de")} {name}</h2>
                <p className="text-[14px] leading-relaxed text-body">
                  {tx("Le palier que tu poses ici est offert : il fixe la capacité du compte sans rien facturer. Un abonnement payant en cours chez toi est résilié au passage.")}</p>
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{tx("Palier")}</span>
                  <select
                    name="plan_id"
                    defaultValue={currentPlanId ?? "gratuit"}
                    className="h-11 rounded-control border border-line-4 bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink"
                  >
                    <option value="gratuit">
                      {tx("Palier gratuit")} ({capacityUnit === "comptes" ? tx("1 compte") : tx("1 client")})
                    </option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({capaciteLabel(p.clientLimit, capacityUnit, tx)})
                      </option>
                    ))}
                  </select>
                </label>
                {currentPlanId && !planGranted ? (
                  <Alert>{tx("Ce compte a un abonnement payant en cours. Poser un palier ici le résilie : il ne sera plus prélevé.")}</Alert>
                ) : null}
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
                disabled={dialog === "supply" && supply?.kind === "reseller" && supply.current === "byok" && !supply.supplierKeyReady}
                className="h-11"
              >
                {dialog === "gift"
                  ? "Créditer"
                  : dialog === "plan"
                    ? "Appliquer le palier"
                  : dialog === "supply"
                    ? supply?.current === "platform_credits"
                      ? "Repasser en clé perso"
                      : supply?.kind === "coach"
                        ? "Remettre sous ton IA"
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

  // Un coach n'a pas de fourniture à lui : ce qu'on règle sur lui est une
  // DISPENSE, et lui parler de « crédits » ou de « ses coachs » n'aurait
  // aucun sens. Le dialogue change donc entièrement de texte.
  if (supply.kind === "coach") return <CoachSupplyDialog name={name} supply={supply} next={next} />;

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

/**
 * Dispenser un coach, ou le remettre sous l'IA du revendeur.
 *
 * Ce que ce dialogue doit faire comprendre en trois lignes : la dispense ne
 * touche NI son abonnement, NI ses offres, NI ses clients. Seule la source de
 * son IA change, et donc qui la paie. Sans cette précision, un revendeur
 * n'ose pas cliquer, ou clique en croyant résilier quelque chose.
 */
function CoachSupplyDialog({
  name,
  supply,
  next,
}: {
  name: string;
  supply: SupplyInfo;
  next: string;
}) {
  const tx = usePhrase();
  const dispenser = supply.current === "platform_credits";

  return (
    <>
      <input type="hidden" name="op" value="supply" />
      <input type="hidden" name="supply" value={next} />
      <h2 className="font-archivo text-[20px] font-extrabold tracking-[-0.02em] text-ink">
        {dispenser ? `Laisser ${name} sur sa propre clé ?` : `Remettre ${name} sous ton IA ?`}
      </h2>

      {dispenser ? (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            {tx("Il cesse de consommer ton IA et règle Anthropic directement, avec sa propre clé. Tu ne le factures plus pour l'IA.")}
          </p>
          <ul className="flex flex-col gap-1.5 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.55] text-body">
            <li>{tx("Son abonnement, ses offres et ses clients ne changent pas. Seule la source de son IA change.")}</li>
            <li>{tx("Tu peux le remettre sous ton IA à tout moment, depuis ce même menu.")}</li>
            {supply.targetHasKey ? null : (
              <li className="text-[#C4471A]">
                {tx("Il n'a aucune clé Anthropic branchée : le dispenser couperait son IA immédiatement. L'enregistrement sera refusé.")}
              </li>
            )}
          </ul>
        </>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-body">
            {tx("Il repasse sur ta chaîne d'approvisionnement : son IA tourne sur ton contrat, et chaque action est facturée comme pour tes autres coachs.")}
          </p>
          <ul className="flex flex-col gap-1.5 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3 text-[13px] leading-[1.55] text-body">
            <li>{tx("Sa propre clé reste enregistrée mais n'est plus utilisée. Rien n'est supprimé.")}</li>
            <li>{tx("Son abonnement, ses offres et ses clients ne changent pas.")}</li>
          </ul>
        </>
      )}
    </>
  );
}
