import { getAdminOrNull } from "@/lib/admin";
import { tx } from "@/lib/i18n/request";
import { billingParentId, tenantNode } from "@/lib/hierarchy";
import { listPlans, type Plan } from "@/lib/plans";
import { tenantCapacity } from "@/lib/entitlements";
import { tenantBillingState, verifyPlanCheckout } from "@/lib/tenant-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { FROZEN_STATUSES } from "@/lib/freeze";
import { PlanPicker } from "@/components/plan-picker";
import { CapacityGauge } from "@/components/capacity-gauge";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { cancelMyPlan, reactivateMyPlan, refreshMyBilling } from "@/app/admin/actions";
import { Alert, Card, MonoLabel } from "@/components/ui";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : null;

export const metadata = { title: "Mon abonnement, Admin My Fitness App" };

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; annule?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;

  // Retour de paiement : on vérifie la session (clé du parent) et on débloque.
  let justPaid = false;
  if (tenantId && sp.session_id) {
    justPaid = await verifyPlanCheckout(tenantId, sp.session_id);
  }

  const parentId = tenantId ? await billingParentId(tenantId) : null;
  const [plans, cap, billing, node] = await Promise.all([
    parentId ? listPlans(parentId) : Promise.resolve([] as Plan[]),
    tenantId ? tenantCapacity(tenantId) : Promise.resolve(null),
    tenantId ? tenantBillingState(tenantId) : Promise.resolve(null),
    tenantId ? tenantNode(tenantId) : Promise.resolve(null),
  ]);
  const kind = node?.kind ?? "coach";

  // Nom du revendeur (parent) pour titrer la liste des offres.
  let parentName: string | null = null;
  if (parentId) {
    const admin = createAdminClient();
    const { data } = await admin.from("tenants").select("name").eq("id", parentId).maybeSingle<{ name: string }>();
    parentName = data?.name ?? null;
  }

  // Paliers vendables : actifs et avec au moins un prix.
  const sellable = plans.filter((p) => p.is_active && (p.price_month_cents != null || p.price_year_cents != null));
  const hasActiveSub = !!(billing?.active && billing.planId);
  // Palier OFFERT par le parent : actif, mais sans abonnement Stripe. Il n'y a
  // ni échéance à annoncer ni résiliation à proposer, et le proposer donnerait
  // un bouton qui ne peut rien faire.
  const offert = !!billing?.granted;
  const frozen = !!(billing?.status && FROZEN_STATUSES.has(billing.status));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Mon abonnement")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {tx("Ton offre détermine le nombre de clients actifs que tu peux gérer. Le 1er client est offert ; au-delà, choisis une offre. Tu peux changer d'offre (upgrade ou downgrade) à tout moment, ou résilier.")}</p>
      </div>

      {justPaid ? <Alert tone="info">{tx("Paiement confirmé, ta capacité est débloquée. Merci !")}</Alert> : null}
      {sp.annule ? <Alert>{tx("Paiement annulé. Tu peux réessayer quand tu veux.")}</Alert> : null}

      {frozen ? (
        <Card className="flex flex-col gap-3 border-alert-line bg-alert/40">
          <div className="flex flex-col gap-1">
            <div className="font-archivo font-bold text-[16px] text-alert-ink">{tx("Paiement en échec — compte suspendu")}</div>
            <p className="text-[13.5px] leading-[1.6] text-body">
              {tx("Ton dernier paiement n'a pas abouti. Tes clients n'ont plus accès à leur espace tant que la situation n'est pas régularisée (tes données et les leurs sont conservées).")}</p>
            <p className="text-[13px] leading-[1.6] text-muted">
              {tx("Pour régulariser : reprends ci-dessous l'offre de ton choix (nouveau paiement), puis vérifie ton statut. Si tu viens de payer, actualise pour réactiver immédiatement.")}</p>
          </div>
          <form action={refreshMyBilling}>
            <button
              type="submit"
              className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-line-4 bg-surface px-4 text-[13.5px] font-semibold text-ink hover:border-ink"
            >
              {tx("Actualiser mon statut de paiement")}</button>
          </form>
        </Card>
      ) : null}

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <>
          {/* État actuel */}
          <Card className="flex flex-col gap-2">
            <MonoLabel>{tx("Offre actuelle")}</MonoLabel>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-archivo font-extrabold text-[22px] leading-none tracking-[-0.02em] text-ink">
                {billing?.planName ?? "Palier gratuit"}
              </span>
              {offert ? (
                <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                  {tx("Offert")}</span>
              ) : hasActiveSub ? (
                <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                  {tx("Actif")}</span>
              ) : (
                <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                  {tx("Offert")}</span>
              )}
            </div>
            {cap ? (
              <div className="mt-1.5">
                <CapacityGauge used={cap.used} limit={cap.limit} unlimited={cap.unlimited} />
              </div>
            ) : null}
            {offert ? (
              <p className="text-[12.5px] leading-[1.55] text-muted-2">
                {tx("Ce palier t'a été offert : tu en as toute la capacité, sans rien payer et sans échéance. Celui qui te l'a posé peut le changer à tout moment.")}</p>
            ) : !hasActiveSub ? (
              <p className="text-[12.5px] leading-[1.55] text-muted-2">
                {tx("Tu es sur le palier gratuit : une seule place client, offerte. Les offres ci-dessous ouvrent des places supplémentaires.")}</p>
            ) : billing?.cancelAtPeriodEnd ? (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="text-[12.5px] text-muted-2">
                  {tx("Résiliation prévue")}{fmtDate(billing.currentPeriodEnd) ? ` le ${fmtDate(billing.currentPeriodEnd)}` : ""}{tx(". Tu gardes ta capacité jusque-là.")}</span>
                <form action={reactivateMyPlan}>
                  <button type="submit" className="tap text-[12.5px] font-semibold text-brand underline underline-offset-2 hover:opacity-80">
                    {tx("Réactiver")}</button>
                </form>
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {fmtDate(billing?.currentPeriodEnd ?? null) ? (
                  <span className="text-[12.5px] text-muted-2">{tx("Prochaine échéance :")} {fmtDate(billing?.currentPeriodEnd ?? null)}</span>
                ) : null}
                <form action={cancelMyPlan}>
                  <button type="submit" className="tap text-[12.5px] font-semibold text-muted-2 underline underline-offset-2 hover:text-ink">
                    {tx("Résilier (repasser au palier gratuit)")}</button>
                </form>
              </div>
            )}
          </Card>

          {/* Offres du revendeur */}
          {!parentId ? (
            <Alert tone="info">{tx("Ton compte est au niveau plateforme : aucun abonnement à souscrire.")}</Alert>
          ) : sellable.length === 0 ? (
            <Alert tone="info">
              {parentName ? `${parentName} ne propose` : "Aucune offre proposée"} {tx("pas encore de formule payante. Reviens plus tard.")}</Alert>
          ) : (
            <PlanPicker
              plans={sellable}
              currentPlanId={billing?.planId ?? null}
              hasActiveSub={hasActiveSub}
              currentLimit={cap?.unlimited ? null : (cap?.limit ?? null)}
              used={cap?.used ?? 0}
              sellerName={parentName}
            />
          )}

          {/* Zone dangereuse : résiliation totale (coach uniquement) */}
          {kind === "coach" ? (
            <div className="mt-2 flex flex-col gap-2">
              <div className="font-archivo font-bold text-[17px] text-alert-ink">{tx("Zone sensible")}</div>
              <DeleteAccountCard />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
