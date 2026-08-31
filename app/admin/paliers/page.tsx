import { getAdminOrNull } from "@/lib/admin";
import { listPlans, MAX_PLANS_PER_TENANT, type Plan } from "@/lib/plans";
import { formatEuros } from "@/lib/config";
import { PlanForm } from "@/components/plan-form";
import { togglePlan, removePlan } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Paliers, Admin My Fitness App" };

function priceLabel(p: Plan): string {
  const parts: string[] = [];
  if (p.price_month_cents != null) parts.push(`${formatEuros(p.price_month_cents)}/mois`);
  if (p.price_year_cents != null) parts.push(`${formatEuros(p.price_year_cents)}/an`);
  return parts.join(" ou ") || "Sans prix";
}

function clientsLabel(p: Plan): string {
  return p.client_limit == null ? "Clients illimités" : `${p.client_limit} client${p.client_limit > 1 ? "s" : ""} inclus`;
}

export default async function AdminPlansPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const plans = tenantId ? await listPlans(tenantId) : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          Paliers
        </h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          Les formules d&apos;abonnement que tu proposes aux comptes que tu héberges (revendeurs, coachs
          ou salles selon ton niveau). Chaque palier fixe un prix récurrent et un nombre de clients
          inclus ; le 1er client reste offert pour démarrer. Des frais de mise en place one-shot peuvent
          s&apos;ajouter pour les salles.
        </p>
      </div>

      {!tenantId ? (
        <Alert>Aucun compte (tenant) n&apos;est rattaché à ton profil.</Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="font-archivo font-bold text-[17px] text-ink">Mes paliers</div>
          {plans.length === 0 ? (
            <Alert tone="info">Aucun palier pour l&apos;instant. Crée ta première formule ci-dessous.</Alert>
          ) : (
            plans.map((p) => (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-archivo font-bold text-[16px] text-ink">{p.name}</span>
                    {!p.is_active ? (
                      <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                        Inactif
                      </span>
                    ) : null}
                    <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                      {clientsLabel(p)}
                    </span>
                  </div>
                  <span className="text-[13px] text-body">
                    {priceLabel(p)}
                    {p.setup_fee_cents > 0 ? ` · setup ${formatEuros(p.setup_fee_cents)}` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <form action={togglePlan}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={p.is_active ? "" : "on"} />
                    <button
                      type="submit"
                      className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink"
                    >
                      {p.is_active ? "Désactiver" : "Activer"}
                    </button>
                  </form>
                  <form action={removePlan}>
                    <input type="hidden" name="id" value={p.id} />
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
          <PlanForm atLimit={plans.length >= MAX_PLANS_PER_TENANT} />
        </div>
      )}
    </div>
  );
}
