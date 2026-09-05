"use client";

import { useActionState, useState } from "react";
import { usePhrase } from "@/components/locale-provider";
import { editOffer, toggleOffer, removeOffer, type OfferState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import { programDaysForMonths, formatEuros, planMaxCostEur } from "@/lib/config";
import type { Offer } from "@/lib/offers";

/**
 * Une ligne de la liste des plans, repliée en lecture et dépliée en édition.
 *
 * Le coach fixait ses réglages à la création et ne pouvait plus y revenir :
 * pour passer un quota de 30 à 20 messages, il devait supprimer le plan et le
 * recréer, ce qui coupait l'accès des clients déjà inscrits dessus. Le
 * formulaire est donc ici, dans la carte, sur le plan qu'il regarde.
 *
 * Deux champs restent absents, et c'est voulu : la durée et le mode de
 * paiement. Ils ne décrivent pas un réglage mais ce qui a été vendu (voir
 * updateOffer dans lib/offers.ts).
 */
export function OfferEditor({ offer, defaultQuota }: { offer: Offer; defaultQuota: number }) {
  const tx = usePhrase();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(editOffer, {} as OfferState);

  const [coachAi, setCoachAi] = useState(offer.coach_ai);
  const [quota, setQuota] = useState(
    offer.coach_ai_daily_limit == null ? String(defaultQuota) : String(offer.coach_ai_daily_limit),
  );

  const isSub = offer.billing_type === "subscription";
  const quotaN = Math.max(0, Math.trunc(Number(quota) || 0));
  const days = isSub ? programDaysForMonths(12) : programDaysForMonths(offer.duration_months);
  // Ce que ce quota peut coûter au pire, relu en direct pendant que le coach
  // tape : c'est la seule raison de changer ce nombre, autant le voir bouger.
  const maxEur = planMaxCostEur({ programDays: days, dailyQuota: quotaN });
  const parMois =
    maxEur.totalEur == null ? null : Math.round((maxEur.totalEur * 100) / (isSub ? 12 : offer.duration_months));

  const euros = (cents: number | null) => (cents == null ? "" : String(cents / 100).replace(".", ","));

  const durationLabel = isSub
    ? tx("Sans durée fixe")
    : `${offer.duration_months === 12 ? "1 an" : `${offer.duration_months} mois`} · ${programDaysForMonths(offer.duration_months)} ${tx("jours")}`;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line-2 bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-archivo font-bold text-[16px] text-ink">{offer.name}</span>
            <Pill>{isSub ? tx("Abonnement") : tx("Paiement unique")}</Pill>
            {!offer.is_active ? <Pill>{tx("Inactif")}</Pill> : null}
            {offer.coach_ai ? (
              <Pill tone="brand">
                {tx("Coach IA")}
                {offer.coach_ai_daily_limit != null
                  ? ` · ${offer.coach_ai_daily_limit === 0 ? tx("illimité") : `${offer.coach_ai_daily_limit}/${tx("jour")}`}`
                  : ""}
              </Pill>
            ) : null}
            {offer.vip_chat ? <Pill tone="brand">{tx("Chat VIP")}</Pill> : null}
          </div>
          <span className="text-[13px] text-muted">
            {durationLabel}
            {" · "}
            <span className="text-body">{priceLabel(offer)}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`tap rounded-btn px-3.5 py-2 text-[13px] font-semibold ${
              open
                ? "border border-ink bg-surface text-ink"
                : "border border-line-4 text-body hover:border-ink"
            }`}
          >
            {open ? tx("Fermer") : tx("Modifier")}
          </button>
          <form action={toggleOffer}>
            <input type="hidden" name="id" value={offer.id} />
            <input type="hidden" name="active" value={offer.is_active ? "" : "on"} />
            <button type="submit" className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink">
              {offer.is_active ? tx("Désactiver") : tx("Activer")}
            </button>
          </form>
          <form action={removeOffer}>
            <input type="hidden" name="id" value={offer.id} />
            <button type="submit" className="tap rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink hover:border-brand">
              {tx("Supprimer")}
            </button>
          </form>
        </div>
      </div>

      {open ? (
        <form action={action} className="flex flex-col gap-4 border-t border-line-2 pt-4">
          <input type="hidden" name="id" value={offer.id} />

          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Nom du plan")}</MonoLabel>
            <input
              name="name"
              defaultValue={offer.name}
              maxLength={80}
              required
              className="w-full max-w-[360px] rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
            />
          </label>

          {isSub ? (
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1.5">
                <MonoLabel>{tx("Prix par mois (€)")}</MonoLabel>
                <input
                  name="price_month_euros"
                  defaultValue={euros(offer.price_month_cents)}
                  inputMode="decimal"
                  className="w-full max-w-[160px] rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <MonoLabel>{tx("Prix par an (€)")}</MonoLabel>
                <input
                  name="price_year_euros"
                  defaultValue={euros(offer.price_year_cents)}
                  inputMode="decimal"
                  className="w-full max-w-[160px] rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
                />
              </label>
            </div>
          ) : (
            <label className="flex flex-col gap-1.5">
              <MonoLabel>{tx("Prix (€)")}</MonoLabel>
              <input
                name="price_euros"
                defaultValue={euros(offer.price_cents)}
                inputMode="decimal"
                className="w-full max-w-[160px] rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
              />
            </label>
          )}

          {/* Un prix modifié ne rattrape pas les ventes passées. Le dire ici
              évite au coach de croire qu'il vient d'augmenter tout le monde. */}
          <span className="-mt-1 text-[12px] leading-relaxed text-muted-2">
            {isSub
              ? tx("Le nouveau prix vaut pour les prochains abonnés. Les abonnements déjà en cours gardent le prix auquel ils ont souscrit, c'est Stripe qui le porte.")
              : tx("Le nouveau prix vaut pour les prochains acheteurs. Les paiements déjà encaissés ne bougent pas.")}
          </span>

          <div className="flex flex-col gap-2">
            <MonoLabel>{tx("Inclusions")}</MonoLabel>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface p-3.5">
              <input
                type="checkbox"
                name="coach_ai"
                checked={coachAi}
                onChange={(e) => setCoachAi(e.target.checked)}
                className="mt-0.5 size-4 accent-brand"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-[14px] text-ink">{tx("Coach IA inclus")}</span>
                <span className="text-[12px] text-muted-2">
                  {tx("Décoché, les clients de ce plan perdent l'accès au Coach IA dès l'enregistrement.")}
                </span>
              </span>
            </label>

            {coachAi ? (
              <div className="ml-3 flex flex-col gap-3 rounded-control border border-brand/30 bg-surface p-3.5">
                <label className="flex flex-col gap-1.5">
                  <MonoLabel>{tx("Échanges avec le Coach IA par jour et par client (0 = illimité)")}</MonoLabel>
                  <input
                    name="coach_ai_daily_limit"
                    type="number"
                    min={0}
                    max={1000}
                    inputMode="numeric"
                    value={quota}
                    onChange={(e) => setQuota(e.target.value)}
                    className="w-full max-w-[160px] rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
                  />
                  <span className="text-[12px] leading-relaxed text-muted-2">
                    {tx("Ce quota s'applique dès l'enregistrement, y compris aux clients déjà inscrits sur ce plan : il est relu à chaque message. Il se remet à zéro chaque jour à minuit, rien ne s'accumule.")}
                  </span>
                </label>
                <div className="flex flex-col gap-1 rounded-control border border-line-4 bg-surface-2 p-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                    {tx("Coût maximum de ce plan")}
                  </span>
                  {parMois != null ? (
                    <span className="font-archivo text-[20px] font-extrabold leading-none text-ink">
                      ≈ {formatEuros(parMois)}
                      <span className="ml-1 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-2">
                        {tx("par mois et par client")}
                      </span>
                    </span>
                  ) : (
                    <span className="font-archivo text-[20px] font-extrabold leading-none text-ink">
                      {tx("Non borné")}
                    </span>
                  )}
                  <span className="text-[12px] leading-relaxed text-muted-2">
                    {parMois != null
                      ? tx("Si le client saturait son quota tous les jours, ce qu'aucun ne fait. La dépense observée tourne autour du dixième.")
                      : tx("Un quota à 0 veut dire illimité : rien ne borne alors la dépense de ce plan.")}
                  </span>
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface p-3.5">
              <input
                type="checkbox"
                name="vip_chat"
                defaultChecked={offer.vip_chat}
                className="mt-0.5 size-4 accent-brand"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-[14px] text-ink">{tx("Chat VIP inclus")}</span>
                <span className="text-[12px] text-muted-2">
                  {tx("La messagerie directe avec toi, en plus du Coach IA.")}
                </span>
              </span>
            </label>
          </div>

          {/* Ce que ce formulaire ne fait PAS, dit avant que le coach le cherche. */}
          <span className="text-[12px] leading-relaxed text-muted-2">
            {tx("La durée et le mode de paiement ne se modifient pas : ils décrivent ce que tes clients ont déjà acheté. Pour en changer, crée un nouveau plan, les clients en cours gardent le leur.")}
          </span>

          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.ok ? <Alert tone="info">{tx("Plan mis à jour.")}</Alert> : null}

          <Button type="submit" loading={pending} className="self-start h-11">
            {tx("Enregistrer les modifications")}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "brand" }) {
  const cls = tone === "brand" ? "bg-brand/10 text-brand" : "border border-line-4 text-muted-2";
  return (
    <span className={`rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${cls}`}>
      {children}
    </span>
  );
}

function priceLabel(o: Offer): string {
  if (o.billing_type === "subscription") {
    const parts: string[] = [];
    if (o.price_month_cents != null) parts.push(`${formatEuros(o.price_month_cents)}/mois`);
    if (o.price_year_cents != null) parts.push(`${formatEuros(o.price_year_cents)}/an`);
    return parts.join(" ou ") || "Sans prix";
  }
  return formatEuros(o.price_cents);
}
