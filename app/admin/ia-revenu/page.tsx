import { redirect } from "next/navigation";
import { getAdminOrNull } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { tenantNode } from "@/lib/hierarchy";
import { tenantKeyStatus } from "@/lib/tenant";
import { resellerMonthlyAiUsage } from "@/lib/ai-cost";
import { listCreditPacks } from "@/lib/credits";
import { ResellerModelForm } from "@/components/reseller-model-form";
import { WhitelabelPriceForm } from "@/components/whitelabel-price-form";
import { ResellerAiModeForm } from "@/components/reseller-ai-mode-form";
import { ResellerCreditPricingForm } from "@/components/reseller-credit-pricing-form";
import { ByokForm } from "@/components/byok-form";
import { Alert, Card, MonoLabel } from "@/components/ui";
import { DEFAULT_AI_CREDIT_PRICE_CENTS, DEFAULT_AI_PROGRAM_CREDIT_PRICE_CENTS } from "@/lib/config";

export const metadata = { title: "Revenu IA, Admin FitMe90" };

export default async function AdminResellerAiPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  // Réservé aux revendeurs / plateforme (un coach n'a pas de coachs enfants).
  const node = tenantId ? await tenantNode(tenantId) : null;
  if (!node || node.kind === "coach") redirect("/admin");

  const admin = createAdminClient();
  const { data: t } = await admin
    .from("tenants")
    .select("ai_mode, reseller_model, ai_client_daily_limit, ai_credit_price_cents, ai_program_credit_price_cents, whitelabel_addon_price_cents")
    .eq("id", tenantId)
    .maybeSingle<{
      ai_mode: string | null;
      reseller_model: string | null;
      ai_client_daily_limit: number | null;
      ai_credit_price_cents: number | null;
      ai_program_credit_price_cents: number | null;
      whitelabel_addon_price_cents: number | null;
    }>();
  const mode = t?.ai_mode === "provider" ? "provider" : "byok";
  const resellerModel = t?.reseller_model === "credits" ? "credits" : "subscription";
  const limit = t?.ai_client_daily_limit == null ? 60 : Math.max(0, t.ai_client_daily_limit);
  const creditPrice = t?.ai_credit_price_cents == null ? DEFAULT_AI_CREDIT_PRICE_CENTS : Math.max(0, t.ai_credit_price_cents);
  const programPrice =
    t?.ai_program_credit_price_cents == null ? DEFAULT_AI_PROGRAM_CREDIT_PRICE_CENTS : Math.max(0, t.ai_program_credit_price_cents);

  const [key, usage, packs] = await Promise.all([
    tenantKeyStatus(tenantId!),
    resellerMonthlyAiUsage(tenantId),
    listCreditPacks(tenantId!),
  ]);

  const cost = `$${usage.costUsd.toFixed(2)}`;
  const perCoach = usage.coachCount > 0 ? usage.costUsd / usage.coachCount : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Revenu IA
        </h1>
        <p className="max-w-[72ch] text-[15px] leading-[1.6] text-muted">
          Décide comment l&apos;IA est fournie à ton réseau de coachs. Soit chaque coach paie sa
          consommation (tu ne factures que les abonnements), soit tu deviens{" "}
          <span className="text-body">revendeur d&apos;IA</span> : tu fournis ta clé, tu plafonnes la
          consommation par client et tu la refactures dans tes paliers.
        </p>
      </div>

      <ResellerModelForm initialModel={resellerModel} keyConfigured={key.configured} packs={packs} />

      <WhitelabelPriceForm initialCents={t?.whitelabel_addon_price_cents ?? null} />

      <ResellerAiModeForm initialMode={mode} initialLimit={limit} keyConfigured={key.configured} />

      {/* Tarification en crédits : toujours visible (elle s'applique quand tu es
          en mode revendeur d'IA), pour qu'on puisse la régler sans avoir à
          d'abord enregistrer le mode. */}
      <ResellerCreditPricingForm initialActionPriceCents={creditPrice} initialProgramPriceCents={programPrice} />

      {/* Aperçu du coût réellement consommé ce mois-ci par le réseau (mode provider). */}
      <Card as="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="font-archivo font-bold text-[17px] text-ink">
            Coût IA de ton réseau {mode === "provider" ? "(à ta charge)" : "(à titre indicatif)"}
          </div>
          <p className="max-w-[72ch] text-[13px] leading-[1.6] text-muted">
            Estimation cumulée depuis le 1er du mois, sur la consommation de tous les comptes de tes
            coachs. En mode revendeur d&apos;IA, c&apos;est la dépense que tes paliers doivent couvrir.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metric label="Coût IA · ce mois" value={cost} />
          <Metric label="Appels IA" value={usage.calls.toLocaleString("fr-FR")} />
          <Metric label="Coachs du réseau" value={String(usage.coachCount)} />
          <Metric label="Coût moyen / coach" value={`$${perCoach.toFixed(2)}`} />
        </div>
        <p className="text-[12px] leading-[1.6] text-muted-2">
          Chiffres d&apos;exemple : estimation à partir des tarifs publics Anthropic (le modèle réel
          peut varier). Ils servent au pilotage du budget, pas à la facturation.
        </p>
      </Card>

      {/* Clé Anthropic du revendeur : requise en mode revendeur d'IA. */}
      {mode === "provider" && !key.configured ? (
        <Alert>
          Mode revendeur d&apos;IA activé mais aucune clé Anthropic n&apos;est enregistrée. Branche ta
          clé ci-dessous pour que tes coachs puissent utiliser l&apos;IA.
        </Alert>
      ) : null}
      <ByokForm configured={key.configured} hint={key.hint} encryptionReady={key.encryptionReady} />
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
