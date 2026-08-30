import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { listOffers } from "@/lib/offers";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_OFFERS_PER_TENANT, formatEuros } from "@/lib/config";
import { OfferForm } from "@/components/offer-form";
import { toggleOffer, removeOffer } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Abonnements, Admin FitMe90" };

function subPriceLabel(o: { price_month_cents: number | null; price_year_cents: number | null }): string {
  const parts: string[] = [];
  if (o.price_month_cents != null) parts.push(`${formatEuros(o.price_month_cents)}/mois`);
  if (o.price_year_cents != null) parts.push(`${formatEuros(o.price_year_cents)}/an`);
  return parts.join(" ou ") || "Sans prix";
}

export default async function AdminSubscriptionsPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const allOffers = tenantId ? await listOffers(tenantId) : [];
  const subs = allOffers.filter((o) => o.billing_type === "subscription");

  let slug: string | null = null;
  if (tenantId) {
    const admin = createAdminClient();
    const { data } = await admin.from("tenants").select("slug").eq("id", tenantId).maybeSingle<{ slug: string }>();
    slug = data?.slug ?? null;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
            Abonnements
          </h1>
          <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
            Des formules à l&apos;usage, sans durée fixe. Le programme se régénère et s&apos;adapte à la
            progression du client tous les cycles (~4 semaines) ; tant qu&apos;il paie et ne résilie pas,
            l&apos;accompagnement continue. En cas de défaut de paiement, l&apos;accès passe automatiquement
            en lecture seule.
          </p>
        </div>
        {slug ? (
          <Link
            href={`/c/${slug}`}
            target="_blank"
            className="tap inline-flex h-11 items-center rounded-btn border border-line-4 bg-surface px-5 font-plex font-semibold text-[14px] text-ink hover:border-ink"
          >
            Voir ma page ↗
          </Link>
        ) : null}
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="font-archivo font-bold text-[17px] text-ink">Mes abonnements</div>
            {subs.length === 0 ? (
              <Alert tone="info">Aucun abonnement pour l&apos;instant. Crée ta première formule ci-dessous.</Alert>
            ) : (
              subs.map((o) => (
                <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-archivo font-bold text-[16px] text-ink">{o.name}</span>
                      {!o.is_active ? (
                        <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                          Inactif
                        </span>
                      ) : null}
                      {o.vip_chat ? (
                        <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                          Chat VIP
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[13px] text-body">{subPriceLabel(o)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={toggleOffer}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="active" value={o.is_active ? "" : "on"} />
                      <button
                        type="submit"
                        className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink"
                      >
                        {o.is_active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                    <form action={removeOffer}>
                      <input type="hidden" name="id" value={o.id} />
                      <button
                        type="submit"
                        className="tap rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink hover:border-brand"
                      >
                        Supprimer
                      </button>
                    </form>
                  </div>
                </Card>
              ))
            )}
            <OfferForm atLimit={allOffers.length >= MAX_OFFERS_PER_TENANT} mode="subscription" />
          </div>
        </>
      )}
    </div>
  );
}
