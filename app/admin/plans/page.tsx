import Link from "next/link";
import { getAdminOrNull } from "@/lib/admin";
import { listOffers, type Offer } from "@/lib/offers";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_OFFERS_PER_TENANT, programDaysForMonths, formatEuros } from "@/lib/config";
import { OfferForm } from "@/components/offer-form";
import { EmbedSnippet } from "@/components/embed-snippet";
import { toggleOffer, removeOffer } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Plans, Admin FitMe90" };

function durationLabel(months: number): string {
  const total = months === 12 ? "1 an" : `${months} mois`;
  return `${total} · ${programDaysForMonths(months)} jours`;
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

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "brand" }) {
  const cls = tone === "brand"
    ? "bg-brand/10 text-brand"
    : "border border-line-4 text-muted-2";
  return (
    <span className={`rounded-pill px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${cls}`}>
      {children}
    </span>
  );
}

export default async function AdminPlansPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const offers = tenantId ? await listOffers(tenantId) : [];

  let slug: string | null = null;
  if (tenantId) {
    const admin = createAdminClient();
    const { data } = await admin.from("tenants").select("slug").eq("id", tenantId).maybeSingle<{ slug: string }>();
    slug = data?.slug ?? null;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
            Plans
          </h1>
          <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
            Tes formules vendues aux clients, au même endroit : paiement unique OU abonnement, au
            choix. Active des options par plan (Coach IA, Chat VIP). Jusqu&apos;à {MAX_OFFERS_PER_TENANT} plans
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
          <div className="flex flex-col gap-3">
            <div className="font-archivo font-bold text-[17px] text-ink">Mes plans</div>
            {offers.length === 0 ? (
              <Alert tone="info">Aucun plan pour l&apos;instant. Crée ton premier plan ci-dessous.</Alert>
            ) : (
              offers.map((o) => (
                <Card key={o.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-archivo font-bold text-[16px] text-ink">{o.name}</span>
                      <Pill>{o.billing_type === "subscription" ? "Abonnement" : "Paiement unique"}</Pill>
                      {!o.is_active ? <Pill>Inactif</Pill> : null}
                      {o.coach_ai ? <Pill tone="brand">Coach IA</Pill> : null}
                      {o.vip_chat ? <Pill tone="brand">Chat VIP</Pill> : null}
                    </div>
                    <span className="text-[13px] text-muted">
                      {o.billing_type === "subscription" ? "Sans durée fixe" : durationLabel(o.duration_months)}
                      {" · "}
                      <span className="text-body">{priceLabel(o)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <form action={toggleOffer}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="active" value={o.is_active ? "" : "on"} />
                      <button type="submit" className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink">
                        {o.is_active ? "Désactiver" : "Activer"}
                      </button>
                    </form>
                    <form action={removeOffer}>
                      <input type="hidden" name="id" value={o.id} />
                      <button type="submit" className="tap rounded-btn border border-alert-line bg-alert px-3.5 py-2 text-[13px] font-semibold text-alert-ink hover:border-brand">
                        Supprimer
                      </button>
                    </form>
                  </div>
                </Card>
              ))
            )}
            <OfferForm atLimit={offers.length >= MAX_OFFERS_PER_TENANT} />
          </div>

          {slug ? <EmbedSnippet embedUrl={`${site}/c/${slug}/embed`} /> : null}
        </>
      )}
    </div>
  );
}
