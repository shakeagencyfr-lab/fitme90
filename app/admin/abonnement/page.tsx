import { getAdminOrNull } from "@/lib/admin";
import { billingParentId, tenantNode } from "@/lib/hierarchy";
import { listPlans, type Plan } from "@/lib/plans";
import { tenantCapacity } from "@/lib/entitlements";
import { tenantBillingState, verifyPlanCheckout } from "@/lib/tenant-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatEuros } from "@/lib/config";
import { FROZEN_STATUSES } from "@/lib/freeze";
import { PlanChangeButton } from "@/components/plan-change-button";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { cancelMyPlan, reactivateMyPlan, refreshMyBilling } from "@/app/admin/actions";
import { Alert, Card, MonoLabel } from "@/components/ui";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : null;

export const metadata = { title: "Mon abonnement, Admin FitMe90" };

function monthLabel(p: Plan): string | null {
  return p.price_month_cents != null ? `${formatEuros(p.price_month_cents)}/mois` : null;
}
function yearLabel(p: Plan): string | null {
  return p.price_year_cents != null ? `${formatEuros(p.price_year_cents)}/an` : null;
}
function capacityText(limit: number | null): string {
  return limit == null ? "clients illimités" : `${limit} client${limit > 1 ? "s" : ""}`;
}

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
  const frozen = !!(billing?.status && FROZEN_STATUSES.has(billing.status));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Mon abonnement
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Ton offre détermine le nombre de clients actifs que tu peux gérer. Le 1er client est
          offert ; au-delà, choisis une offre. Tu peux changer d&apos;offre (upgrade ou downgrade)
          à tout moment, ou résilier.
        </p>
      </div>

      {justPaid ? <Alert tone="info">Paiement confirmé, ta capacité est débloquée. Merci !</Alert> : null}
      {sp.annule ? <Alert>Paiement annulé. Tu peux réessayer quand tu veux.</Alert> : null}

      {frozen ? (
        <Card className="flex flex-col gap-3 border-alert-line bg-alert/40">
          <div className="flex flex-col gap-1">
            <div className="font-archivo font-bold text-[16px] text-alert-ink">Paiement en échec — compte suspendu</div>
            <p className="text-[13.5px] leading-[1.6] text-body">
              Ton dernier paiement n&apos;a pas abouti. Tes clients n&apos;ont plus accès à leur espace tant que
              la situation n&apos;est pas régularisée (tes données et les leurs sont conservées).
            </p>
            <p className="text-[13px] leading-[1.6] text-muted">
              Pour régulariser : reprends ci-dessous l&apos;offre de ton choix (nouveau paiement), puis
              vérifie ton statut. Si tu viens de payer, actualise pour réactiver immédiatement.
            </p>
          </div>
          <form action={refreshMyBilling}>
            <button
              type="submit"
              className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-btn border border-line-4 bg-surface px-4 text-[13.5px] font-semibold text-ink hover:border-ink"
            >
              Actualiser mon statut de paiement
            </button>
          </form>
        </Card>
      ) : null}

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <>
          {/* État actuel */}
          <Card className="flex flex-col gap-2">
            <MonoLabel>Offre actuelle</MonoLabel>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-archivo font-extrabold text-[22px] leading-none tracking-[-0.02em] text-ink">
                {billing?.planName ?? "Palier gratuit"}
              </span>
              {hasActiveSub ? (
                <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                  Actif
                </span>
              ) : (
                <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                  Offert
                </span>
              )}
            </div>
            {cap ? (
              <p className="text-[13px] text-body">
                {cap.unlimited
                  ? `Clients illimités · ${cap.used} inscrit${cap.used > 1 ? "s" : ""}`
                  : `${cap.used} / ${cap.limit} client${(cap.limit ?? 0) > 1 ? "s" : ""}`}
              </p>
            ) : null}
            {!hasActiveSub ? (
              <p className="text-[12.5px] text-muted-2">
                Tu es sur le palier gratuit (1er client offert). Choisis une offre ci-dessous pour accueillir plus de clients.
              </p>
            ) : billing?.cancelAtPeriodEnd ? (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="text-[12.5px] text-muted-2">
                  Résiliation prévue{fmtDate(billing.currentPeriodEnd) ? ` le ${fmtDate(billing.currentPeriodEnd)}` : ""}.
                  Tu gardes ta capacité jusque-là.
                </span>
                <form action={reactivateMyPlan}>
                  <button type="submit" className="tap text-[12.5px] font-semibold text-brand underline underline-offset-2 hover:opacity-80">
                    Réactiver
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap items-center gap-3">
                {fmtDate(billing?.currentPeriodEnd ?? null) ? (
                  <span className="text-[12.5px] text-muted-2">Prochaine échéance : {fmtDate(billing?.currentPeriodEnd ?? null)}</span>
                ) : null}
                <form action={cancelMyPlan}>
                  <button type="submit" className="tap text-[12.5px] font-semibold text-muted-2 underline underline-offset-2 hover:text-ink">
                    Résilier (repasser au palier gratuit)
                  </button>
                </form>
              </div>
            )}
          </Card>

          {/* Offres du revendeur */}
          {!parentId ? (
            <Alert tone="info">Ton compte est au niveau plateforme : aucun abonnement à souscrire.</Alert>
          ) : sellable.length === 0 ? (
            <Alert tone="info">
              {parentName ? `${parentName} ne propose` : "Aucune offre proposée"} pas encore de formule payante.
              Reviens plus tard.
            </Alert>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="font-archivo font-bold text-[17px] text-ink">
                {parentName ? `Les offres de ${parentName}` : "Les offres disponibles"}
              </div>
              {sellable.map((p) => {
                const current = billing?.planId === p.id && hasActiveSub;
                return (
                  <Card key={p.id} className={`flex flex-col gap-3 ${current ? "border-brand/40" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-archivo font-bold text-[16px] text-ink">{p.name}</span>
                          {current ? (
                            <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                              Ton offre
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[13px] text-body">
                          {capacityText(p.client_limit)}
                          {p.setup_fee_cents > 0 ? ` · setup ${formatEuros(p.setup_fee_cents)} une fois` : ""}
                        </span>
                        <span className="text-[13px] text-muted">
                          {[monthLabel(p), yearLabel(p)].filter(Boolean).join(" · ") || "Sur mesure"}
                        </span>
                      </div>
                    </div>
                    {current ? (
                      <p className="text-[12.5px] text-muted-2">
                        C&apos;est ton offre en cours. Choisis une autre offre pour l&apos;upgrader ou la downgrader (prorata automatique).
                      </p>
                    ) : (
                      <PlanChangeButton
                        planId={p.id}
                        monthLabel={monthLabel(p)}
                        yearLabel={yearLabel(p)}
                        hasActiveSub={hasActiveSub}
                      />
                    )}
                  </Card>
                );
              })}
              <p className="text-[12.5px] text-muted-2">
                Paiement sécurisé par Stripe. La facturation est gérée par le compte qui héberge le tien.
                Un changement d&apos;offre ajuste ton abonnement en cours (prorata), sans nouveau paiement complet.
              </p>
            </div>
          )}

          {/* Zone dangereuse : résiliation totale (coach uniquement) */}
          {kind === "coach" ? (
            <div className="mt-2 flex flex-col gap-2">
              <div className="font-archivo font-bold text-[17px] text-alert-ink">Zone sensible</div>
              <DeleteAccountCard />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
