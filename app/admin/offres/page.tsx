import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { listOffers } from "@/lib/offers";
import { tenantBranding } from "@/lib/branding";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_OFFERS_PER_TENANT, programDaysForMonths, formatEuros, ROOT_DOMAIN, SITE_HOST } from "@/lib/config";
import { OfferForm } from "@/components/offer-form";
import { BrandingForm } from "@/components/branding-form";
import { SubdomainForm } from "@/components/subdomain-form";
import { CustomDomainCard } from "@/components/custom-domain-card";
import { EmbedSnippet } from "@/components/embed-snippet";
import { toggleOffer, removeOffer } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Ma page publique, Admin FitMe90" };

function durationLabel(months: number): string {
  const total = months === 12 ? "1 an" : `${months} mois`;
  return `${total} · ${programDaysForMonths(months)} jours`;
}

function priceLabel(o: {
  billing_type: string;
  price_cents: number | null;
  price_month_cents: number | null;
  price_year_cents: number | null;
}): string {
  if (o.billing_type === "subscription") {
    const parts: string[] = [];
    if (o.price_month_cents != null) parts.push(`${formatEuros(o.price_month_cents)}/mois`);
    if (o.price_year_cents != null) parts.push(`${formatEuros(o.price_year_cents)}/an`);
    return parts.join(" ou ") || "Sans prix";
  }
  return formatEuros(o.price_cents);
}

export default async function AdminPublicPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const allOffers = tenantId ? await listOffers(tenantId) : [];
  const offers = allOffers.filter((o) => o.billing_type !== "subscription");
  const branding = tenantId ? await tenantBranding(tenantId) : null;

  let slug: string | null = null;
  let subdomain: string | null = null;
  let customDomain: string | null = null;
  let tenantName = "Mon coaching";
  if (tenantId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tenants")
      .select("slug, name, subdomain, custom_domain")
      .eq("id", tenantId)
      .maybeSingle<{ slug: string; name: string; subdomain: string | null; custom_domain: string | null }>();
    slug = data?.slug ?? null;
    subdomain = data?.subdomain ?? null;
    customDomain = data?.custom_domain ?? null;
    tenantName = data?.name ?? tenantName;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
            Ma page publique
          </h1>
          <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
            Ta vitrine et tes offres à paiement unique, mises à jour automatiquement. Les formules en
            abonnement se gèrent dans l&apos;onglet Abonnements. Jusqu&apos;à {MAX_OFFERS_PER_TENANT} offres
            au total.
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
          {branding ? <BrandingForm branding={branding} namePlaceholder={tenantName} /> : null}

          <SubdomainForm current={subdomain} slug={slug} siteHost={SITE_HOST} rootDomain={ROOT_DOMAIN} />

          <CustomDomainCard domain={customDomain} />

          <div className="flex flex-col gap-3">
            <div className="font-archivo font-bold text-[17px] text-ink">Mes offres à paiement unique</div>
            {offers.length === 0 ? (
              <Alert tone="info">Aucune offre à paiement unique pour l&apos;instant. Crée ta première formule ci-dessous.</Alert>
            ) : (
              offers.map((o) => (
                <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-archivo font-bold text-[16px] text-ink">{o.name}</span>
                      {!o.is_active ? (
                        <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                          Inactive
                        </span>
                      ) : null}
                      {o.vip_chat ? (
                        <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                          Chat VIP
                        </span>
                      ) : null}
                      {o.billing_type === "subscription" ? (
                        <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-body-2">
                          Abonnement
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[13px] text-muted">
                      {durationLabel(o.duration_months)}
                      {" · "}
                      <span className="text-body">{priceLabel(o)}</span>
                    </span>
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
            <OfferForm atLimit={allOffers.length >= MAX_OFFERS_PER_TENANT} mode="one_time" />
          </div>

          {slug ? <EmbedSnippet embedUrl={`${site}/c/${slug}/embed`} /> : null}
        </>
      )}
    </div>
  );
}
