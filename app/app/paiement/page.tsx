import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/guard";
import { Card, MonoLabel } from "@/components/ui";
import { CheckoutButton } from "@/components/checkout-button";
import { CoachCheckoutButton } from "@/components/coach-checkout-button";
import { RedeemForm } from "@/components/redeem-form";
import { clientOffer, subscriptionPrice } from "@/lib/offers";
import { createClient } from "@/lib/supabase/server";
import { PRICE_EUR, COACH_CREDENTIAL, GRACE_DAYS, formatEuros, programDaysForMonths, monthlyEquivalentCents } from "@/lib/config";
import { getT, userLocale } from "@/lib/i18n/server";
import { productCopy, durationLabel as durLabel } from "@/lib/i18n/products";

export const metadata = { title: "Débloquer mon programme" };

export default async function PaiementPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/connexion?suite=/app/paiement");
  // Déjà payé : inutile de repasser à la caisse.
  if (ctx.access.phase !== "not_paid") redirect("/app");

  // Achat via une offre coach : prix et durée de l'offre, paiement chez le coach.
  const offer = await clientOffer(ctx.userId);
  const { t } = await getT(await userLocale(ctx.userId));

  // Offre en ABONNEMENT (mensuel / annuel).
  if (offer && offer.billing_type === "subscription") {
    const supabase = await createClient();
    const { data: prof } = await supabase
      .from("profiles")
      .select("selected_interval")
      .eq("id", ctx.userId)
      .maybeSingle<{ selected_interval: string | null }>();
    const interval: "month" | "year" =
      prof?.selected_interval === "year" && offer.price_year_cents != null
        ? "year"
        : offer.price_month_cents != null
          ? "month"
          : "year";
    const cents = subscriptionPrice(offer, interval);
    if (cents != null && cents > 0) {
      const suffix = interval === "year" ? t("payment.perYear") : t("payment.perMonth");
      return (
        <div className="mx-auto flex max-w-[520px] flex-col gap-6 py-4">
          <header className="flex flex-col gap-2">
            <MonoLabel className="text-brand">{offer.name}</MonoLabel>
            <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
              {formatEuros(cents)}{suffix}
            </h1>
            <p className="text-[15px] leading-[1.6] text-muted">
              {interval === "year" ? t("payment.subYearly") : t("payment.subMonthly")}
            </p>
          </header>
          <CoachCheckoutButton priceLabel={`${formatEuros(cents)}${suffix}`} />
          <p className="text-[12px] text-muted-2 leading-relaxed">{t("payment.subNote")}</p>
        </div>
      );
    }
  }

  // Offre à PAIEMENT UNIQUE.
  if (offer && offer.price_cents != null && offer.price_cents > 0) {
    const durationLabel = durLabel(offer.duration_months, t);
    const product = productCopy(offer.duration_months, t);
    const perMonth = monthlyEquivalentCents(offer.price_cents, offer.duration_months);
    return (
      <div className="mx-auto flex max-w-[520px] flex-col gap-6 py-4">
        <header className="flex flex-col gap-2">
          <MonoLabel className="text-brand">{product ? `${offer.name} · ${product.promise}` : offer.name}</MonoLabel>
          <h1 className="font-archivo font-extrabold text-[clamp(28px,6vw,40px)] leading-[1.05] tracking-[-0.03em] text-ink">
            {t("payment.once", { price: formatEuros(offer.price_cents) })}
          </h1>
          {perMonth > 0 && offer.duration_months > 1 ? (
            <p className="text-[14px] text-muted-2">
              {t("payment.perMonthEq", { amount: formatEuros(perMonth), duration: durationLabel })}
            </p>
          ) : null}
          <p className="text-[15px] leading-[1.6] text-muted">
            {product
              ? product.pitch
              : t("payment.genericPitch", { duration: durationLabel, days: programDaysForMonths(offer.duration_months) })}
          </p>
        </header>
        {product ? (
          <Card className="flex flex-col gap-3">
            {product.bullets.map((t) => (
              <div key={t} className="flex items-start gap-2.5 text-[14.5px] text-body">
                <span className="text-brand mt-0.5" aria-hidden>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </Card>
        ) : null}
        <CoachCheckoutButton priceLabel={formatEuros(offer.price_cents)} allowPromo />
        <p className="text-[12px] text-muted-2 leading-relaxed">{t("payment.legalNote")}</p>
      </div>
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">{t("common.or")}</span>
          <div className="h-px flex-1 bg-line" />
        </div>
        <RedeemForm />
      </div>

      <p className="text-[12px] text-muted-2 leading-relaxed">{t("payment.legalNote")}</p>
    </div>
  );
}
