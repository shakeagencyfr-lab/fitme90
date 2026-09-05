import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { listOffers } from "@/lib/offers";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_OFFERS_PER_TENANT } from "@/lib/config";
import { OfferForm } from "@/components/offer-form";
import { OfferEditor } from "@/components/offer-editor";
import { EmbedSnippet } from "@/components/embed-snippet";
import { bestSupplierPack, clientUsesCredits, programCreditCost, creditPriceToday } from "@/lib/credits";
import { CreditScale, CreditScaleNote } from "@/components/credit-scale";
import { readCoachConfig } from "@/lib/methodology";
import { resellerClientDailyCap } from "@/lib/coach-ai-budget";
import { costViewOf } from "@/lib/cost-view";
import { Alert } from "@/components/ui";

export const metadata = { title: "Plans" };

export default async function AdminPlansPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const [offers, creditMode, programCredits, cfg, unitCents, meilleurPack, resellerCap, costView] = tenantId
    ? await Promise.all([
        listOffers(tenantId),
        clientUsesCredits(tenantId),
        programCreditCost(tenantId),
        readCoachConfig(tenantId),
        creditPriceToday(tenantId),
        // Le forfait le plus avantageux du revendeur : c'est lui qui chiffre
        // en euros le plafond en crédits d'un plan.
        bestSupplierPack(tenantId),
        // Le plafond que le revendeur impose aux clients : sans lui à l'écran,
        // un quota relevé au-delà ne change rien et personne ne sait pourquoi.
        resellerClientDailyCap(tenantId),
        costViewOf(tenantId),
      ])
    : [[], false, 10, null, null, null, 0, "usd" as const];
  // L'IA comprise dans l'abonnement : le coach ne règle rien par action, la
  // simulation de coût n'a rien à lui dire.
  const aiIncluded = costView === "included";

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
            {tx("Plans")}</h1>
          <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
            {tx("Tes formules vendues aux clients, au même endroit : paiement unique OU abonnement, au choix. Active des options par plan (Coach IA, Chat VIP). Jusqu'à")} {MAX_OFFERS_PER_TENANT} {tx("plans au total.")}</p>
        </div>
        {slug ? (
          <Link
            href={`/c/${slug}`}
            target="_blank"
            className="tap inline-flex h-11 items-center rounded-btn border border-line-4 bg-surface px-5 font-plex font-semibold text-[14px] text-ink hover:border-ink"
          >
            {tx("Voir ma page ↗")}</Link>
        ) : null}
      </div>

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="font-archivo font-bold text-[17px] text-ink">{tx("Mes plans")}</div>
            {offers.length === 0 ? (
              <Alert tone="info">{tx("Aucun plan pour l'instant. Crée ton premier plan ci-dessous.")}</Alert>
            ) : (
              offers.map((o) => (
                <OfferEditor
                  key={o.id}
                  offer={o}
                  defaultQuota={cfg?.coach_ai_daily_limit ?? 60}
                  creditMode={creditMode}
                  programCredits={programCredits}
                  bestPack={meilleurPack}
                  unitCents={unitCents}
                  resellerCap={resellerCap}
                  aiIncluded={aiIncluded}
                />
              ))
            )}
            {/* Le barème AVANT le formulaire : le coach s'apprête à décider
                combien de messages il inclut dans un plan, il doit savoir ce
                que chacun lui coûte au moment où il choisit. */}
            {creditMode ? (
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
                  {tx("Ce que consomme chaque action")}
                </span>
                <CreditScale programCredits={programCredits} unitCents={unitCents} />
                <CreditScaleNote programCredits={programCredits} unitCents={unitCents} />
              </div>
            ) : null}
            <OfferForm
              atLimit={offers.length >= MAX_OFFERS_PER_TENANT}
              programCredits={programCredits}
              creditMode={creditMode}
              defaultQuota={cfg?.coach_ai_daily_limit ?? 60}
              bestPack={meilleurPack}
              resellerCap={resellerCap}
              aiIncluded={aiIncluded}
            />
          </div>

          {slug ? <EmbedSnippet embedUrl={`${site}/c/${slug}/embed`} /> : null}
        </>
      )}
    </div>
  );
}
