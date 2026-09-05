import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { redirect } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantNode, platformTenantId } from "@/lib/hierarchy";
import { tenantKeyStatus } from "@/lib/tenant";
import { resellerMonthlyAiUsage } from "@/lib/ai-cost";
import { listCreditPacks, getWallet, programCreditCost, creditPriceToday } from "@/lib/credits";
import { ResellerModelForm } from "@/components/reseller-model-form";
import { ResellerAiModeForm } from "@/components/reseller-ai-mode-form";
import { ResellerCreditPricingForm } from "@/components/reseller-credit-pricing-form";
import { ByokForm } from "@/components/byok-form";
import { AiRevenueSummary } from "@/components/ai-revenue-summary";
import { Alert, Card, MonoLabel } from "@/components/ui";
import { DEFAULT_AI_CREDIT_PRICE_CENTS, DEFAULT_PROGRAM_CREDITS, formatEuros } from "@/lib/config";

export const metadata = { title: "Revenu IA" };

interface TenantAiRow {
  ai_mode: string | null;
  ai_supply: string | null;
  reseller_model: string | null;
  ai_client_daily_limit: number | null;
  ai_credit_price_cents: number | null;
  ai_program_credits: number | null;
  coach_byok_allowed: boolean | null;
  coach_credits_allowed: boolean | null;
}

const AI_COLS =
  "ai_mode, ai_supply, reseller_model, ai_client_daily_limit, ai_credit_price_cents, ai_program_credits, coach_byok_allowed, coach_credits_allowed";

/**
 * Revenu IA. Deux visages :
 *  - PLATEFORME : vend des crédits IA à ses revendeurs (prix, crédits par
 *    génération, packs) et branche sa clé Anthropic.
 *  - REVENDEUR : choisit son modèle (abonnement ou crédits) et revend l'IA à ses
 *    coachs. S'il achète ses crédits à la plateforme, il voit le prix d'achat,
 *    son solde, et fixe son prix de revente ; sinon il branche sa propre clé.
 */
export default async function AdminResellerAiPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const node = tenantId ? await tenantNode(tenantId) : null;
  if (!node || node.kind === "coach") redirect("/admin");
  const isPlatform = node.kind === "platform";

  const admin = createAdminClient();
  const { data: t } = await admin.from("tenants").select(AI_COLS).eq("id", tenantId).maybeSingle<TenantAiRow>();
  const creditPrice = t?.ai_credit_price_cents == null ? DEFAULT_AI_CREDIT_PRICE_CENTS : Math.max(0, t.ai_credit_price_cents);
  const programCredits =
    t?.ai_program_credits == null || t.ai_program_credits < 1 ? DEFAULT_PROGRAM_CREDITS : t.ai_program_credits;

  const [key, packs] = await Promise.all([tenantKeyStatus(tenantId!), listCreditPacks(tenantId!)]);

  // ─────────────────────────────── PLATEFORME
  if (isPlatform) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
            {tx("Revenu IA")}</h1>
          <p className="max-w-[72ch] text-[15px] leading-[1.6] text-muted">
            {tx("Tu vends des crédits IA à tes revendeurs en « crédits plateforme » (choix fait à la création de leur compte). L'IA tourne sur ta clé Anthropic, chaque action de leurs coachs débite leur solde, et ils revendent le crédit à leurs coachs avec leur marge.")}</p>
        </div>

        {/* Le résultat d'abord, les réglages ensuite : on vient ici pour
            savoir ce que ça rapporte, pas pour relire son prix. */}
        <AiRevenueSummary tenantId={tenantId!} creditPriceCents={creditPrice} />

        <ResellerCreditPricingForm
          initialPriceCents={creditPrice}
          initialProgramCredits={programCredits}
          buyerLabel="tes revendeurs"
        />

        <ResellerModelForm
          initialModel="credits"
          keyConfigured={key.configured}
          packs={packs}
          unitCents={creditPrice}
          buyerLabel="tes revendeurs"
          packsOnly
        />

        {!key.configured ? (
          <Alert>
            {tx("Aucune clé Anthropic enregistrée : tes revendeurs en crédits plateforme ne peuvent pas faire tourner l'IA. Branche ta clé ci-dessous.")}</Alert>
        ) : null}
        <ByokForm configured={key.configured} hint={key.hint} encryptionReady={key.encryptionReady} />
      </div>
    );
  }

  // ─────────────────────────────── REVENDEUR
  const buysFromPlatform = t?.ai_supply === "platform_credits";
  const mode = buysFromPlatform || t?.ai_mode === "provider" ? "provider" : "byok";
  const resellerModel = t?.reseller_model === "credits" ? "credits" : "subscription";
  const limit = t?.ai_client_daily_limit == null ? 60 : Math.max(0, t.ai_client_daily_limit);

  const [usage, wallet, platformId] = await Promise.all([
    resellerMonthlyAiUsage(tenantId),
    buysFromPlatform ? getWallet(tenantId) : Promise.resolve(null),
    platformTenantId(),
  ]);
  let buyPriceCents: number | null = null;
  let platformProgramCredits: number | null = null;
  if (buysFromPlatform && platformId) {
    const { data: p } = await admin
      .from("tenants")
      .select("ai_credit_price_cents")
      .eq("id", platformId)
      .maybeSingle<{ ai_credit_price_cents: number | null }>();
    // Coût RÉEL du crédit : moyenne de ce qui a été payé, sinon meilleur tarif
    // des packs actifs. Le prix unitaire affiché par la plateforme n'est qu'un
    // prix conseillé, les packs pouvant être remisés au volume : simuler dessus
    // faussait la marge.
    const real = await creditPriceToday(tenantId);
    buyPriceCents = real ?? p?.ai_credit_price_cents ?? DEFAULT_AI_CREDIT_PRICE_CENTS;
    platformProgramCredits = await programCreditCost(tenantId);
  }
  // Une source d'IA existe : sa clé, ou les crédits de la plateforme.
  const aiSourceReady = key.configured || buysFromPlatform;

  const cost = `$${usage.costUsd.toFixed(2)}`;
  const perCoach = usage.coachCount > 0 ? usage.costUsd / usage.coachCount : 0;
  const creditsPerCoach = usage.coachCount > 0 ? Math.round(usage.supplierCredits / usage.coachCount) : 0;
  // Ce que le palier de ce revendeur lui permet de proposer à ses coachs
  // (lib/supply-rights.ts). Sans la revente de crédits, il ne fournit pas
  // l'IA et n'a pas de revenu IA : cet écran n'a rien à lui montrer, et le
  // menu ne le lui propose pas (app/admin/layout.tsx). Un revendeur en
  // crédits plateforme fournit quoi qu'il arrive (il n'a pas de clé à lui) :
  // son solde et le plafond par client restent à régler ici.
  const byokAllowed = t?.coach_byok_allowed !== false;
  const creditsAllowed = t?.coach_credits_allowed !== false;
  if (!creditsAllowed && !buysFromPlatform) redirect("/admin/paliers");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Revenu IA")}</h1>
        <p className="max-w-[72ch] text-[15px] leading-[1.6] text-muted">
          {buysFromPlatform ? (
            <>
              {tx("Tu achètes tes crédits IA à la plateforme et tu les revends à tes coachs avec ta marge. L'IA tourne sur la clé de la plateforme : chaque action de tes coachs débite ton solde, et ton prix de revente fait ta marge.")}</>
          ) : (
            <>
              {tx("Décide comment l'IA est fournie à ton réseau de coachs. Soit chaque coach paie sa consommation (tu ne factures que les abonnements), soit tu deviens")}{" "}
              <span className="text-body">{tx("revendeur d'IA")}</span> {tx(": tu fournis ta clé et tu revends des crédits à tes coachs.")}</>
          )}
        </p>
      </div>

      {/* Ce que la revente rapporte, avant le solde et les réglages. */}
      {resellerModel === "credits" ? (
        <AiRevenueSummary
          tenantId={tenantId!}
          creditPriceCents={creditPrice}
          purchaseCentsPerCredit={buysFromPlatform ? buyPriceCents : null}
        />
      ) : null}

      {buysFromPlatform && wallet ? (
        <Card as="section" className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <MonoLabel>{tx("Ton solde de crédits plateforme")}</MonoLabel>
            <div className="flex items-baseline gap-2">
              <span className={`font-archivo text-[30px] font-extrabold leading-none tracking-[-0.02em] tabular-nums ${wallet.credits <= 0 ? "text-[#C4471A]" : "text-ink"}`}>
                {wallet.credits}
              </span>
              <span className="text-[13px] text-muted">{tx("crédit")}{wallet.credits > 1 ? "s" : ""} IA</span>
            </div>
            <span className="text-[12.5px] text-muted-2">
              {tx("Achetés")} {formatEuros(buyPriceCents ?? 0)} {tx("le crédit ; une génération de programme t'en débite")} {platformProgramCredits ?? DEFAULT_PROGRAM_CREDITS}.
            </span>
          </div>
          <Link
            href="/admin/credits"
            className="tap inline-flex h-11 items-center rounded-btn bg-brand px-5 text-[14px] font-semibold text-white hover:bg-brand-hover"
          >
            {tx("Recharger et voir le détail")}</Link>
        </Card>
      ) : null}

      {creditsAllowed ? (
        <ResellerModelForm
          initialModel={resellerModel}
          keyConfigured={aiSourceReady}
          packs={packs}
          unitCents={creditPrice}
          buyPriceCents={buyPriceCents}
          creditsAllowed={creditsAllowed}
        />
      ) : null}

      {/* En crédits plateforme, la fourniture est fixée (pas de choix BYOK /
          provider) mais le plafond par client reste à régler, et son coût se
          lit en crédits au prix d'achat : jamais en dollars. */}
      <ResellerAiModeForm
        initialMode={mode}
        initialLimit={limit}
        keyConfigured={key.configured}
        absorbsCost={resellerModel === "subscription"}
        byokAllowed={byokAllowed}
        fixedProvider={buysFromPlatform}
        creditCents={buysFromPlatform ? buyPriceCents : null}
      />

      {/* Un revendeur qui achète ses crédits est débité dans l'unité de son
          fournisseur : c'est celle-là qu'on lui montre, pas la sienne. Afficher
          la sienne lui annonçait une marge positive sur une génération qui lui
          coûtait en réalité davantage qu'elle ne lui rapportait. */}
      {creditsAllowed ? (
        <ResellerCreditPricingForm
          initialPriceCents={creditPrice}
          initialProgramCredits={buysFromPlatform ? platformProgramCredits ?? DEFAULT_PROGRAM_CREDITS : programCredits}
          buyPriceCents={buyPriceCents}
          canSetCredits={!buysFromPlatform}
        />
      ) : null}

      {/* Un revendeur en crédits plateforme lit sa dépense en crédits, jamais
          en dollars : le montant Anthropic contiendrait la marge de la
          plateforme. Sur sa propre clé, il lit ses dollars comme la plateforme. */}
      {buysFromPlatform ? (
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="font-archivo font-bold text-[17px] text-ink">{tx("Crédits consommés par ton réseau")}</div>
            <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
              {tx("Ce que la plateforme t'a débité depuis le 1er du mois pour l'IA de tous les comptes de tes coachs.")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label={tx("Crédits · ce mois")} value={usage.supplierCredits.toLocaleString("fr-FR")} />
            <Metric label={tx("Appels IA")} value={usage.calls.toLocaleString("fr-FR")} />
            <Metric label={tx("Coachs du réseau")} value={String(usage.coachCount)} />
            <Metric label={tx("Crédits moyens / coach")} value={creditsPerCoach.toLocaleString("fr-FR")} />
          </div>
          <p className="text-[12px] leading-[1.6] text-muted-2">
            {tx("Débit réel de ton portefeuille, action par action. Le détail est dans Consommation.")}</p>
        </Card>
      ) : (
        <Card as="section" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="font-archivo font-bold text-[17px] text-ink">
              {tx("Coût IA de ton réseau")} {mode === "provider" ? "(à ta charge)" : "(à titre indicatif)"}
            </div>
            <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
              {tx("Estimation cumulée depuis le 1er du mois, sur la consommation de tous les comptes de tes coachs.")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric label={tx("Coût IA · ce mois")} value={cost} />
            <Metric label={tx("Appels IA")} value={usage.calls.toLocaleString("fr-FR")} />
            <Metric label={tx("Coachs du réseau")} value={String(usage.coachCount)} />
            <Metric label={tx("Coût moyen / coach")} value={`$${perCoach.toFixed(2)}`} />
          </div>
          <p className="text-[12px] leading-[1.6] text-muted-2">
            {tx("Estimation à partir des tarifs publics Anthropic. Elle sert au pilotage, pas à la facturation.")}</p>
        </Card>
      )}

      {/* Sa clé ne sert ici qu'à fournir l'IA à son réseau : sans le droit de
          la fournir, elle se règle dans Intégrations, pour lui seul. */}
      {!buysFromPlatform && creditsAllowed ? (
        <>
          {mode === "provider" && !key.configured ? (
            <Alert>
              {tx("Mode revendeur d'IA activé mais aucune clé Anthropic n'est enregistrée. Branche ta clé ci-dessous pour que tes coachs puissent utiliser l'IA.")}</Alert>
          ) : null}
          <ByokForm configured={key.configured} hint={key.hint} encryptionReady={key.encryptionReady} />
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-control border border-line-4 bg-surface-2 px-3.5 py-3">
      <MonoLabel>{label}</MonoLabel>
      <div className="font-archivo font-extrabold text-[22px] leading-none tracking-[-0.02em] text-ink tabular-nums">
        {value}
      </div>
    </div>
  );
}
