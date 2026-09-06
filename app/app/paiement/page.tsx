import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { Card, MonoLabel } from "@/components/ui";
import { CheckoutButton } from "@/components/checkout-button";
import { PaymentChoice } from "@/components/payment-choice";
import { RedeemForm } from "@/components/redeem-form";
import { clientOffer, chooseableOffers, assignOfferToClient } from "@/lib/offers";
import { tenantNode } from "@/lib/hierarchy";
import { OfferPicker } from "@/components/offer-picker";
import { paymentModes } from "@/lib/installments";
import { createClient } from "@/lib/supabase/server";
import { PRICE_EUR, COACH_CREDENTIAL, GRACE_DAYS, formatEuros, programDaysForMonths, monthlyEquivalentCents } from "@/lib/config";
import { getT, userLocale } from "@/lib/i18n/server";
import { productCopy, durationLabel as durLabel } from "@/lib/i18n/products";

export const metadata = { title: "Débloquer mon programme" };

/**
 * Séparateur « ou » + saisie de carte cadeau. Présent sur les TROIS parcours de
 * paiement : sans cette reprise, un client venant d'une offre coach (le cas
 * courant) n'avait aucun endroit où saisir sa carte, alors que /api/redeem
 * savait déjà la traiter.
 */
function GiftBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{label}</span>
        <div className="h-px flex-1 bg-line" />
      </div>
      <RedeemForm />
    </div>
  );
}

export default async function PaiementPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/paiement");
  // Déjà payé : inutile de repasser à la caisse.
  if (ctx.access.phase !== "not_paid") redirect("/app");

  // Achat via une offre coach : prix et durée de l'offre, paiement chez le coach.
  let offer = await clientOffer(ctx.userId);
  const { t } = await getT(await userLocale(ctx.userId));

  // Client d'un coach SANS offre choisie (lien de parrainage, inscription
  // directe sur la page du coach) : il choisit parmi les programmes en
  // vitrine, ou hérite du seul qui existe. Jamais le tarif générique de la
  // plateforme, qui n'est pas celui de son coach.
  const tenantId = ctx.profile?.tenant_id ?? null;
  const node = tenantId ? await tenantNode(tenantId) : null;
  const chezUnCoach = !!node && node.kind !== "platform";
  if (!offer && chezUnCoach && tenantId) {
    const choix = await chooseableOffers(tenantId);
    if (choix.length === 1) {
      const res = await assignOfferToClient(ctx.userId, choix[0].id);
      if (res.ok) offer = choix[0];
    } else if (choix.length > 1) {
      return (
        <OfferPicker
          offers={choix.map((o) => {
            const copy = productCopy(o.duration_months, t);
            return {
              id: o.id,
              name: o.name,
              durationLabel: durLabel(o.duration_months, t),
              pitch: copy ? copy.pitch : null,
              onceCents: o.price_cents,
              monthlyCents: o.price_month_cents,
              months: o.duration_months,
            };
          })}
        />
      );
    }
    if (!offer) {
      return (
        <div className="mx-auto flex max-w-[520px] flex-col gap-6 py-4">
          <header className="flex flex-col gap-2">
            <MonoLabel className="text-brand">{t("payment.noPlanEyebrow")}</MonoLabel>
            <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
              {t("payment.noPlanTitle")}
            </h1>
            <p className="text-[15px] leading-[1.6] text-muted">{t("payment.noPlanBody")}</p>
          </header>
          <GiftBlock label={t("common.or")} />
        </div>
      );
    }
  }

  // Offre d'un coach : en une fois, ou en N mensualités qui s'arrêtent
  // d'elles-mêmes. Le client a choisi sur la page de vente ; il peut encore
  // changer ici, au moment de sortir sa carte.
  if (offer && paymentModes(offer).length > 0) {
    const supabase = await createClient();
    const { data: prof } = await supabase
      .from("profiles")
      .select("selected_interval")
      .eq("id", ctx.userId)
      .maybeSingle<{ selected_interval: string | null }>();
    const durationLabel = durLabel(offer.duration_months, t);
    const product = productCopy(offer.duration_months, t);
    const perMonth = offer.price_cents != null ? monthlyEquivalentCents(offer.price_cents, offer.duration_months) : 0;
    return (
      <>
        <PaymentChoice
          offerName={offer.name}
          eyebrow={product ? `${offer.name} · ${product.promise}` : offer.name}
          pitch={product ? product.pitch : t("payment.genericPitch", { duration: durationLabel, days: programDaysForMonths(offer.duration_months) })}
          // Même règle que la page de vente : le Coach IA n'est annoncé que si
          // la formule du plan l'inclut.
          bullets={product ? [...product.bullets, ...(offer.coach_ai ? [product.aiBullet] : [])] : []}
          onceCents={offer.price_cents}
          monthlyCents={offer.price_month_cents}
          months={offer.duration_months}
          initialMode={prof?.selected_interval === "month" || prof?.selected_interval === "year" ? "month" : "once"}
          perMonthEq={perMonth > 0 && offer.duration_months > 1 ? t("payment.perMonthEq", { amount: formatEuros(perMonth), duration: durationLabel }) : null}
        />
        <div className="mx-auto flex max-w-[520px] flex-col gap-6">
          <GiftBlock label={t("common.or")} />
          <p className="text-[12px] text-muted-2 leading-relaxed">{t("payment.legalNote")} {t("payment.subNote")}</p>
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-6 py-4">
      <header className="flex flex-col gap-2">
        <MonoLabel className="text-brand">{t("payment.fullProgram")}</MonoLabel>
        <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {t("payment.once", { price: `${PRICE_EUR} €` })}
        </h1>
        <p className="text-[15px] leading-[1.6] text-muted">
          {t("payment.fullProgramBody", { credential: COACH_CREDENTIAL.toLowerCase() })}
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        {[
          t("payment.bullets.periodized"),
          t("payment.bullets.nutrition"),
          t("payment.bullets.ai"),
          t("payment.bullets.grace", { days: GRACE_DAYS }),
          t("payment.bullets.pdf"),
        ].map((line) => (
          <div key={line} className="flex items-start gap-2.5 text-[14.5px] text-body">
            <span className="text-brand mt-0.5" aria-hidden>✓</span>
            <span>{line}</span>
          </div>
        ))}
      </Card>

      <CheckoutButton />

      <GiftBlock label={t("common.or")} />

      <p className="text-[12px] text-muted-2 leading-relaxed">{t("payment.legalNote")}</p>
    </div>
  );
}
