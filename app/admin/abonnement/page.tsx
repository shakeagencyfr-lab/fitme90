import { getAdminOrNull } from "@/lib/admin";
import { billingParentId } from "@/lib/hierarchy";
import { listPlans, type Plan } from "@/lib/plans";
import { tenantCapacity } from "@/lib/entitlements";
import { tenantBillingState, verifyPlanCheckout } from "@/lib/tenant-billing";
import { formatEuros } from "@/lib/config";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { Alert, Card, MonoLabel } from "@/components/ui";

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
  const [plans, cap, billing] = await Promise.all([
    parentId ? listPlans(parentId) : Promise.resolve([] as Plan[]),
    tenantId ? tenantCapacity(tenantId) : Promise.resolve(null),
    tenantId ? tenantBillingState(tenantId) : Promise.resolve(null),
  ]);
  // Paliers vendables : actifs et avec au moins un prix.
  const sellable = plans.filter((p) => p.is_active && (p.price_month_cents != null || p.price_year_cents != null));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Mon abonnement
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Ton offre détermine le nombre de clients actifs que tu peux gérer. Le 1er client est
          offert ; au-delà, choisis un palier. Une place se libère en supprimant un compte client.
        </p>
      </div>

      {justPaid ? <Alert tone="info">Paiement confirmé, ta capacité est débloquée. Merci !</Alert> : null}
      {sp.annule ? <Alert>Paiement annulé. Tu peux réessayer quand tu veux.</Alert> : null}

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
              {billing?.active ? (
                <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                  Actif
                </span>
              ) : null}
            </div>
            {cap ? (
              <p className="text-[13px] text-body">
                {cap.unlimited
                  ? `Clients illimités · ${cap.used} inscrit${cap.used > 1 ? "s" : ""}`
                  : `${cap.used} / ${cap.limit} client${(cap.limit ?? 0) > 1 ? "s" : ""}`}
              </p>
            ) : null}
          </Card>

          {/* Paliers disponibles */}
          {!parentId ? (
            <Alert tone="info">
              Ton compte est au niveau plateforme : aucun abonnement à souscrire.
            </Alert>
          ) : sellable.length === 0 ? (
            <Alert tone="info">
              Aucun palier proposé pour l&apos;instant. Reviens plus tard ou contacte ton contact commercial.
            </Alert>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="font-archivo font-bold text-[17px] text-ink">Choisir un palier</div>
              {sellable.map((p) => {
                const current = billing?.planId === p.id && billing?.active;
                return (
                  <Card key={p.id} className="flex flex-col gap-3">
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
                      </div>
                    </div>
                    {current ? (
                      <p className="text-[12.5px] text-muted-2">
                        C&apos;est ton offre en cours. Pour en changer, choisis un autre palier.
                      </p>
                    ) : (
                      <PlanCheckoutButton planId={p.id} monthLabel={monthLabel(p)} yearLabel={yearLabel(p)} />
                    )}
                  </Card>
                );
              })}
              <p className="text-[12.5px] text-muted-2">
                Paiement sécurisé par Stripe. La facturation est gérée par le compte qui héberge le tien.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
