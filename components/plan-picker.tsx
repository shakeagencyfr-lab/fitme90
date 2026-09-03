"use client";

import { usePhrase } from "@/components/locale-provider";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Card, Button } from "@/components/ui";
import { formatEuros } from "@/lib/config";
import type { Plan } from "@/lib/plans";
import {
  type Interval,
  annualSaving,
  availableIn,
  capacityLabel,
  monthlyEquivalentCents,
  perClientMonthlyCents,
  priceFor,
  sortByCapacity,
  suggestedPlanId,
} from "@/lib/plan-view";

// Choix du palier d'abonnement.
//
// L'écran affichait pour chaque offre les deux prix en une ligne
// (« 49 €/mois · 490 €/an ») puis les répétait sur deux boutons, sans dire ce
// que l'annuel fait gagner, ce qu'une place coûte, ni quelle offre débloque la
// situation. Ici : une bascule Mensuel/Annuel, UN prix par carte, et les
// chiffres qui permettent de comparer.

interface Props {
  plans: Plan[];
  currentPlanId: string | null;
  hasActiveSub: boolean;
  /** Capacité en cours (null = illimitée), pour repérer l'offre qui débloque. */
  currentLimit: number | null;
  /** Places déjà occupées, pour dire si une offre suffit encore. */
  used: number;
  sellerName: string | null;
}

export function PlanPicker({ plans, currentPlanId, hasActiveSub, currentLimit, used, sellerName }: Props) {
  const tx = usePhrase();
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const ordered = useMemo(() => sortByCapacity(plans), [plans]);
  const shown = ordered.filter((p) => availableIn(p, interval));
  const suggested = useMemo(
    () => suggestedPlanId(plans, currentLimit, currentPlanId, interval),
    [plans, currentLimit, currentPlanId, interval],
  );
  // La bascule n'a de sens que si au moins une offre est vendue à l'année.
  const hasYearly = ordered.some((p) => availableIn(p, "year"));

  async function choose(planId: string) {
    setBusy(planId);
    setError("");
    try {
      const res = await fetch("/api/coach/plan-choose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action indisponible.");
      if (data.url) {
        // assign() plutôt qu'une affectation de window.location.href : le
        // compilateur React refuse l'écriture sur une valeur externe.
        window.location.assign(data.url);
        return;
      }
      if (data.switched) {
        setDone(true);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action indisponible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-archivo font-bold text-[17px] text-ink">
          {sellerName ? `Les offres de ${sellerName}` : "Les offres disponibles"}
        </div>
        {hasYearly ? (
          <div
            role="group"
            aria-label={tx("Périodicité de facturation")}
            className="inline-flex items-center gap-0.5 rounded-control border border-line-3 bg-surface-2 p-0.5"
          >
            {(["month", "year"] as const).map((i) => (
              <button
                key={i}
                type="button"
                aria-pressed={interval === i}
                onClick={() => setInterval(i)}
                className={[
                  "tap rounded-[7px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  interval === i ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.18)]" : "text-muted-2 hover:text-ink",
                ].join(" ")}
              >
                {i === "month" ? tx("Mensuel") : tx("Annuel")}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <Alert>{error}</Alert> : null}
      {done ? <Alert tone="info">{tx("Offre mise à jour. Le prorata est appliqué sur ta prochaine facture.")}</Alert> : null}

      {shown.length === 0 ? (
        <Alert tone="info">{tx("Aucune offre n'est proposée à cette périodicité. Reviens au mensuel.")}</Alert>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((p) => {
            const current = p.id === currentPlanId && hasActiveSub;
            const price = priceFor(p, interval)!;
            const monthly = monthlyEquivalentCents(p, interval);
            const perClient = perClientMonthlyCents(p, interval);
            const saving = interval === "year" ? annualSaving(p) : null;
            const isSuggested = !current && p.id === suggested;
            // Offre plus petite que le nombre de clients déjà inscrits. On le
            // signale sans l'interdire : le serveur l'accepte, les clients
            // existants gardent leur accès, et un coach peut vouloir
            // redescendre avant de supprimer des comptes.
            const tooSmall = p.client_limit != null && p.client_limit < used;

            return (
              <Card
                key={p.id}
                className={[
                  "lift flex flex-col gap-3.5",
                  current ? "border-brand/50" : isSuggested ? "border-brand/30" : "",
                ].join(" ")}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-archivo font-bold text-[17px] text-ink">{p.name}</span>
                    {current ? (
                      <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                        {tx("Ton offre")}</span>
                    ) : isSuggested ? (
                      <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                        {tx("Le plus petit pas")}</span>
                    ) : null}
                  </div>
                  <span className="font-archivo font-semibold text-[14px] text-body">{capacityLabel(p.client_limit)}</span>
                </div>

                {/* Prix : un seul chiffre mis en avant, celui de la périodicité choisie. */}
                <div className="flex flex-col gap-1 border-y border-line py-3">
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    <span className="font-archivo font-extrabold text-[30px] leading-none tracking-[-0.03em] text-ink">
                      {formatEuros(price)}
                    </span>
                    <span className="text-[13px] text-muted">{interval === "month" ? tx("par mois") : tx("par an")}</span>
                  </div>
                  {interval === "year" && monthly != null ? (
                    <span className="text-[12.5px] text-muted-2">
                      {tx("soit")} {formatEuros(monthly)} {tx("par mois")}
                      {saving ? `, ${formatEuros(saving.cents)} ${tx("économisés par an")} (${saving.percent} %)` : ""}
                    </span>
                  ) : null}
                  {interval === "month" && annualSaving(p) ? (
                    <span className="text-[12.5px] text-muted-2">
                      {tx("À l'année :")} {formatEuros(p.price_year_cents!)}, {tx("soit")}{" "}
                      {formatEuros(annualSaving(p)!.cents)} {tx("de moins")}
                    </span>
                  ) : null}
                </div>

                <ul className="flex flex-col gap-1.5 text-[13px] text-body">
                  {perClient != null ? (
                    <li className="flex items-baseline gap-2">
                      <span className="text-muted-2">{tx("Par client")}</span>
                      <span className="flex-1 border-b border-dashed border-line" aria-hidden />
                      <span className="font-medium text-ink">{formatEuros(perClient)}{tx("/mois")}</span>
                    </li>
                  ) : null}
                  <li className="flex items-baseline gap-2">
                    <span className="text-muted-2">{tx("Frais de mise en place")}</span>
                    <span className="flex-1 border-b border-dashed border-line" aria-hidden />
                    <span className="font-medium text-ink">
                      {p.setup_fee_cents > 0 ? `${formatEuros(p.setup_fee_cents)} ${tx("une fois")}` : tx("Aucun")}
                    </span>
                  </li>
                </ul>

                {tooSmall ? (
                  <p className="rounded-control border border-alert-line bg-alert/40 px-3 py-2 text-[12.5px] leading-[1.55] text-alert-ink">
                    {tx("Tu as déjà")} {used} {tx("clients. Avec cette offre tu serais au-delà de la limite : tes clients actuels gardent leur accès, mais aucun nouveau ne pourra s'inscrire.")}</p>
                ) : null}

                {current ? (
                  <p className="text-[12.5px] leading-[1.55] text-muted-2">
                    {tx("C'est ton offre en cours. Choisis-en une autre pour monter ou descendre, le prorata est automatique.")}</p>
                ) : (
                  <Button
                    onClick={() => choose(p.id)}
                    loading={busy === p.id}
                    variant={isSuggested ? "primary" : "outline"}
                    full
                    className="h-11"
                  >
                    {hasActiveSub ? tx("Passer à cette offre") : tx("Choisir cette offre")}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[12.5px] leading-[1.6] text-muted-2">
        {tx("Paiement sécurisé par Stripe. La facturation est gérée par le compte qui héberge le tien. Un changement d'offre ajuste ton abonnement en cours (prorata), sans nouveau paiement complet.")}</p>
    </div>
  );
}
