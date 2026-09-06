"use client";

import { useActionState, useState } from "react";
import { useLocale, usePhrase } from "@/components/locale-provider";
import { editOffer, toggleOffer, toggleOfferListed, removeOffer, type OfferState } from "@/app/admin/actions";
import { Button, Alert, MonoLabel } from "@/components/ui";
import {
  programDaysForMonths,
  formatEuros,
  formatCentsPrecise,
  planMaxCredits,
  planMaxCostEur,
} from "@/lib/config";
import type { Offer } from "@/lib/offers";
import type { BestPack } from "@/lib/credits";
import { coachAiOf, formulaOf, formulaCopy, type OfferFormula } from "@/lib/offer-formulas";
import { OfferFormulaPicker } from "@/components/offer-formula-picker";
import { OfferMiniCost } from "@/components/offer-mini-cost";

/**
 * Une ligne de la liste des plans, repliée en lecture et dépliée en édition.
 *
 * CE QU'ON PEUT CHANGER, ET CE QU'ON NE PEUT PAS. Les réglages qui n'engagent
 * personne se modifient ici : le nom, la formule (Mini ou Max) et son quota. Le PRIX, la
 * durée et le mode de paiement non : ils décrivent ce que les clients inscrits
 * ont acheté, et les réécrire après coup change le contrat d'une vente conclue
 * sans que personne ne le sache. Pour vendre autrement, on crée un plan et on
 * masque l'ancien de la vitrine.
 *
 * MASQUER N'EST PAS DÉSACTIVER. Un plan masqué disparaît de la page publique
 * mais continue de vivre : ses clients gardent l'accès et le coach peut encore
 * y inscrire du monde à la main. C'est ce qui rend possible un plan sur mesure
 * réservé à quelques suivis en direct.
 */
export function OfferEditor({
  offer,
  defaultQuota,
  creditMode,
  programCredits,
  bestPack,
  unitCents,
  resellerCap,
  aiIncluded = false,
}: {
  offer: Offer;
  /** L'IA est comprise dans l'abonnement du coach : aucun coût par action à simuler. */
  aiIncluded?: boolean;
  defaultQuota: number;
  /** Le coach achète ses crédits : son coût se lit en crédits, pas en dollars. */
  creditMode: boolean;
  /** Crédits consommés par une génération de programme. */
  programCredits: number;
  /** Meilleur forfait du fournisseur, pour convertir les crédits en euros. */
  bestPack: BestPack | null;
  /** Prix unitaire du crédit en vigueur chez son fournisseur (centimes). */
  unitCents: number | null;
  /** Plafond imposé par le revendeur fournisseur d'IA (0 = aucun). */
  resellerCap: number;
}) {
  const tx = usePhrase();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(editOffer, {} as OfferState);

  // La formule d'un plan existant est celle qu'il porte déjà : ici, à la
  // différence de la création, il y en a toujours une de choisie.
  const [formule, setFormule] = useState<OfferFormula>(formulaOf(offer));
  const coachAi = coachAiOf(formule);
  const [quota, setQuota] = useState(
    offer.coach_ai_daily_limit == null ? String(defaultQuota) : String(offer.coach_ai_daily_limit),
  );

  const months = offer.duration_months;
  const quotaN = Math.max(0, Math.trunc(Number(quota) || 0));

  /**
   * LE QUOTA RÉELLEMENT SERVI AU CLIENT.
   *
   * Ce n'est pas toujours celui qu'on tape. Quand le revendeur fournit l'IA, il
   * pose son propre plafond et le client obtient le plus petit des deux. Sans
   * cette ligne à l'écran, un coach qui monte son quota de 15 à 30 constate que
   * rien ne change chez son client et n'a aucun moyen de comprendre pourquoi.
   */
  const sousPlafond = (n: number) =>
    resellerCap > 0 ? (n <= 0 ? resellerCap : Math.min(n, resellerCap)) : n;

  // Ce que produirait la valeur en cours de saisie, pour l'avertissement.
  const effectif = sousPlafond(quotaN);
  const bride = resellerCap > 0 && effectif !== quotaN;

  // Ce que produit la valeur DÉJÀ ENREGISTRÉE, pour la pastille de la ligne.
  const enregistre = offer.coach_ai_daily_limit;
  const enregistreEffectif = enregistre == null ? null : sousPlafond(enregistre);
  const enregistreBride = enregistre != null && enregistreEffectif !== enregistre;

  const days = programDaysForMonths(months);
  // Le coût se calcule sur ce que le client peut RÉELLEMENT consommer.
  const max = planMaxCredits({ programDays: days, dailyQuota: effectif, programCredits });
  const creditsParMois = Math.round(max.total / months);
  const coutParMois = unitCents != null ? Math.round((max.total * unitCents) / months) : null;
  const maxEur = planMaxCostEur({ programDays: days, dailyQuota: effectif });
  const eurParMois = maxEur.totalEur == null ? null : Math.round((maxEur.totalEur * 100) / months);

  const illimite = effectif <= 0;

  const durationLabel = `${offer.duration_months === 12 ? "1 an" : `${offer.duration_months} mois`} · ${programDaysForMonths(offer.duration_months)} ${tx("jours")}`;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line-2 bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-archivo font-bold text-[16px] text-ink">{offer.name}</span>
            <Pill>{paymentPill(offer, tx)}</Pill>
            {!offer.is_active ? <Pill>{tx("Inactif")}</Pill> : null}
            {offer.is_active && !offer.is_listed ? <Pill>{tx("Masqué")}</Pill> : null}
            {/* La pastille annonce ce que le client REÇOIT, pas ce qui est
                enregistré : c'est elle qu'on lit en diagonale, et elle a fait
                croire à un quota de 30 là où le revendeur en servait 15. */}
            {offer.coach_ai ? (
              <Pill tone="brand">
                {formulaCopy("max", locale).name}
                {enregistreEffectif != null
                  ? ` · ${enregistreEffectif === 0 ? tx("illimité") : `${enregistreEffectif}/${tx("jour")}`}`
                  : ""}
              </Pill>
            ) : (
              <Pill>{formulaCopy("mini", locale).name}</Pill>
            )}
            {enregistreBride ? (
              <Pill>{tx("plafonné par ton revendeur")}</Pill>
            ) : null}
            {offer.vip_chat ? <Pill tone="brand">{tx("Coach réel")}</Pill> : null}
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
              open ? "border border-ink bg-surface text-ink" : "border border-line-4 text-body hover:border-ink"
            }`}
          >
            {open ? tx("Fermer") : tx("Modifier")}
          </button>
          <form action={toggleOfferListed}>
            <input type="hidden" name="id" value={offer.id} />
            <input type="hidden" name="listed" value={offer.is_listed ? "" : "on"} />
            <button
              type="submit"
              title={
                offer.is_listed
                  ? tx("Retirer ce plan de ta page publique, sans couper l'accès de ses clients")
                  : tx("Remettre ce plan en vente sur ta page publique")
              }
              className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink"
            >
              {offer.is_listed ? tx("Masquer") : tx("Afficher")}
            </button>
          </form>
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

      {/* Un plan masqué : on dit ce que ça veut dire là où on le voit, sinon la
          pastille « Masqué » se confond avec « Inactif ». */}
      {offer.is_active && !offer.is_listed ? (
        <p className="text-[12.5px] leading-[1.55] text-muted-2">
          {tx("Hors vitrine : il n'apparaît pas sur ta page publique, mais ses clients gardent l'accès et tu peux encore y inscrire quelqu'un toi-même.")}
        </p>
      ) : null}

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

          {/* Le prix se LIT, il ne se modifie plus. Dit ici, à la place exacte
              où le champ se trouvait, avec la marche à suivre. */}
          <div className="flex flex-col gap-1.5 rounded-control border border-line-4 bg-surface p-3.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{tx("Prix")}</span>
              <span className="font-archivo text-[16px] font-bold text-ink">{priceLabel(offer)}</span>
              <span className="text-[12.5px] text-muted-2">· {durationLabel}</span>
            </div>
            <p className="text-[12.5px] leading-[1.6] text-muted">
              {tx("Le prix, la durée et le mode de paiement ne se modifient pas : ils décrivent ce que tes clients inscrits ont acheté. Pour vendre à un autre tarif, crée un nouveau plan et")}{" "}
              <span className="text-body">{tx("masque celui-ci")}</span>
              {tx(" : il disparaît de ta page publique, ses clients gardent tout, et tu peux continuer à y inscrire quelqu'un à la main.")}
            </p>
          </div>

          <OfferFormulaPicker value={formule} onChange={setFormule} />

          <div className="flex flex-col gap-2">
            {formule === "mini" ? (
              <OfferMiniCost months={months} creditMode={creditMode} programCredits={programCredits} bestPack={bestPack} unitCents={unitCents} aiIncluded={aiIncluded} />
            ) : null}
            {coachAi ? (
              <div className="ml-3 flex flex-col gap-3 rounded-control border border-brand/30 bg-surface p-3.5">
                <label className="flex flex-col gap-1.5">
                  <MonoLabel>
                    {resellerCap > 0
                      ? `${tx("Échanges avec le Coach IA par jour et par client")} (${tx("maximum")} ${resellerCap})`
                      : tx("Échanges avec le Coach IA par jour et par client (0 = illimité)")}
                  </MonoLabel>
                  {/* Le champ est borné au plafond du revendeur : on ne peut
                      plus saisir un nombre que le client n'obtiendra jamais.
                      Le serveur re-tranche quand même, un champ borné étant un
                      confort et non une garantie. */}
                  <input
                    name="coach_ai_daily_limit"
                    type="number"
                    min={resellerCap > 0 ? 1 : 0}
                    max={resellerCap > 0 ? resellerCap : 1000}
                    inputMode="numeric"
                    value={quota}
                    onChange={(e) => setQuota(e.target.value)}
                    className="w-full max-w-[160px] rounded-control border border-line-4 bg-surface px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-ink"
                  />
                  <span className="text-[12px] leading-relaxed text-muted-2">
                    {tx("Ce quota s'applique dès l'enregistrement, y compris aux clients déjà inscrits sur ce plan : il est relu à chaque message. Il se remet à zéro chaque jour à minuit, rien ne s'accumule.")}
                  </span>
                </label>

                {/* Le plafond du revendeur, dit en clair. C'est l'explication du
                    « j'ai augmenté et rien n'a changé ». */}
                {bride ? (
                  <div className="flex flex-col gap-1 rounded-control border border-[#C4471A]/40 bg-[#C4471A]/[0.06] p-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#C4471A]">
                      {tx("Ton revendeur plafonne à")} {resellerCap}/{tx("jour")}
                    </span>
                    <span className="text-[12.5px] leading-[1.55] text-body">
                      {tx("Tes clients reçoivent donc")} <span className="font-semibold">{effectif} {tx("échanges par jour")}</span>
                      {tx(", pas les")} {quotaN <= 0 ? tx("illimités") : quotaN} {tx("réglés ici. C'est lui qui fournit l'IA, c'est lui qui décide du maximum : monter ce nombre au-delà de son plafond ne changera rien pour eux.")}
                    </span>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1 rounded-control border border-line-4 bg-surface-2 p-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                    {tx("Coût maximum de ce plan")}
                  </span>

                  {aiIncluded ? (
                    <span className="font-archivo text-[20px] font-extrabold leading-none text-ink">
                      {tx("Comprise dans ton abonnement")}
                    </span>
                  ) : illimite ? (
                    <span className="font-archivo text-[20px] font-extrabold leading-none text-ink">
                      {tx("Non borné")}
                    </span>
                  ) : creditMode ? (
                    /* Le coach achète des crédits : c'est dans cette unité qu'il
                       raisonne. Lui montrer des euros Anthropic serait un
                       chiffre juste dans une monnaie qu'il n'utilise pas. */
                    <>
                      <span className="font-archivo text-[20px] font-extrabold leading-none text-ink">
                        {creditsParMois.toLocaleString("fr-FR")}{" "}
                        <span className="font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-2">
                          {tx("crédits / mois / client")}
                        </span>
                      </span>
                      {coutParMois != null ? (
                        <span className="text-[13px] text-body">
                          {tx("soit")} <span className="font-semibold">≈ {formatEuros(coutParMois)}</span>{" "}
                          {tx("par mois et par client")}
                          {unitCents != null ? (
                            <span className="text-muted-2">
                              {" "}({tx("à")} {formatCentsPrecise(unitCents)} {tx("le crédit")}
                              {bestPack ? `, ${tx("forfait")} ${bestPack.name}` : ""})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[12.5px] text-muted-2">
                          {tx("Ton fournisseur ne propose aucun forfait pour l'instant : impossible de convertir ces crédits en euros sans inventer un prix.")}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-archivo text-[20px] font-extrabold leading-none text-ink">
                      ≈ {eurParMois != null ? formatEuros(eurParMois) : "n.c."}
                      <span className="ml-1 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-2">
                        {tx("par mois et par client")}
                      </span>
                    </span>
                  )}

                  <span className="text-[12px] leading-relaxed text-muted-2">
                    {aiIncluded
                      ? tx("Rien ne t'est débité par action : ton revendeur fournit l'IA dans ton abonnement.")
                      : illimite
                        ? tx("Un quota à 0 veut dire illimité : rien ne borne alors la dépense de ce plan.")
                        : tx("Si le client saturait son quota tous les jours, ce qu'aucun ne fait. La dépense observée tourne autour du dixième. Générations de programme comprises.")}
                  </span>
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-control border border-line-4 bg-surface p-3.5">
              <input type="checkbox" name="vip_chat" defaultChecked={offer.vip_chat} className="mt-0.5 size-4 accent-brand" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-[14px] text-ink">{tx("Chat avec un Coach réel")}</span>
                <span className="text-[12px] text-muted-2">
                  {tx("Le client t'écrit directement, messages et photos, et tu réponds depuis ton dashboard. Indépendant de la formule, et sans aucune consommation d'IA.")}</span>
              </span>
            </label>
          </div>

          {state.error ? <Alert>{state.error}</Alert> : null}
          {state.ok ? (
            <Alert tone="info">
              {state.quotaRamene != null
                ? `${tx("Plan mis à jour. Ton revendeur plafonne les échanges à")} ${state.quotaRamene} ${tx("par jour : c'est ce qui a été enregistré, et c'est ce que reçoivent tes clients.")}`
                : tx("Plan mis à jour. Tes clients de ce plan ont le nouveau quota dès maintenant.")}
            </Alert>
          ) : null}

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

/** « 190 € en 1 fois ou 3 × 69 €/mois » : les deux façons de payer, telles que vendues. */
function priceLabel(o: Offer): string {
  const parts: string[] = [];
  if (o.price_cents != null && o.price_cents > 0) parts.push(`${formatEuros(o.price_cents)} en 1 fois`);
  if (o.price_month_cents != null && o.price_month_cents > 0) parts.push(`${o.duration_months} × ${formatEuros(o.price_month_cents)}/mois`);
  // Offre d'avant, à l'année : plus proposée, encore lisible.
  if (o.price_year_cents != null && o.price_year_cents > 0) parts.push(`${formatEuros(o.price_year_cents)}/an`);
  return parts.join(" ou ") || "Sans prix";
}

function paymentPill(o: Offer, tx: (s: string) => string): string {
  const once = o.price_cents != null && o.price_cents > 0;
  const monthly = o.price_month_cents != null && o.price_month_cents > 0;
  if (once && monthly) return tx("En 1 fois ou en mensualités");
  if (monthly) return tx("Mensualités");
  return tx("Paiement unique");
}
