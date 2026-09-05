import { getAdminOrNull } from "@/lib/admin";
import { tenantNode } from "@/lib/hierarchy";
import { tx } from "@/lib/i18n/request";
import { listPlans, MAX_PLANS_PER_TENANT, type Plan } from "@/lib/plans";
import { formatEuros } from "@/lib/config";
import { PlanForm } from "@/components/plan-form";
import { togglePlan, togglePlanSite, removePlan } from "@/app/admin/actions";
import { Alert, Card } from "@/components/ui";

export const metadata = { title: "Paliers, Admin My Fitness App" };

function priceLabel(p: Plan): string {
  const parts: string[] = [];
  if (p.price_month_cents != null) parts.push(`${formatEuros(p.price_month_cents)}/mois`);
  if (p.price_year_cents != null) parts.push(`${formatEuros(p.price_year_cents)}/an`);
  return parts.join(" ou ") || "Sans prix";
}

function clientsLabel(p: Plan, unite: "client" | "compte"): string {
  if (p.client_limit == null) return unite === "compte" ? "Comptes illimités" : "Clients illimités";
  return `${p.client_limit} ${unite}${p.client_limit > 1 ? "s" : ""} inclus`;
}

export default async function AdminPlansPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  const plans = tenantId ? await listPlans(tenantId) : [];
  // La plateforme vend à des revendeurs : son palier plafonne des comptes de
  // réseau, pas des clients. Un revendeur vend à des coachs : des clients.
  const node = tenantId ? await tenantNode(tenantId) : null;
  const unite: "client" | "compte" = node?.kind === "platform" ? "compte" : "client";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Paliers")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {unite === "compte"
            ? tx("Les formules d'abonnement que tu proposes à tes revendeurs. Chaque palier fixe un prix récurrent et le nombre de comptes coach ou salle qu'ils pourront ouvrir sous leur marque ; le 1er reste offert pour démarrer. Des frais de mise en place one-shot peuvent s'ajouter.")
            : tx("Les formules d'abonnement que tu proposes aux comptes que tu héberges (coachs ou salles). Chaque palier fixe un prix récurrent et un nombre de clients inclus ; le 1er client reste offert pour démarrer. Des frais de mise en place one-shot peuvent s'ajouter pour les salles.")}</p>
      </div>

      {!tenantId ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Mes paliers")}</div>
          {plans.length === 0 ? (
            <Alert tone="info">{tx("Aucun palier pour l'instant. Crée ta première formule ci-dessous.")}</Alert>
          ) : (
            plans.map((p) => (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-archivo font-bold text-[16px] text-ink">{p.name}</span>
                    {!p.is_active ? (
                      <span className="rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2">
                        {tx("Inactif")}</span>
                    ) : null}
                    <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                      {clientsLabel(p, unite)}
                    </span>
                    {p.site_included ? (
                      <span className="rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand">
                        {tx("Mon site")}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[13px] text-body">
                    {priceLabel(p)}
                    {p.setup_fee_cents > 0 ? ` · setup ${formatEuros(p.setup_fee_cents)}` : ""}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* La seule chose qu'on ait de bonnes raisons de changer sur
                      un palier déjà vendu : le prix et la capacité, eux,
                      décrivent ce que les abonnés ont acheté. */}
                  {unite === "client" ? (
                    <form action={togglePlanSite}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="included" value={p.site_included ? "" : "on"} />
                      <button
                        type="submit"
                        className={`tap rounded-btn px-3.5 py-2 text-[13px] font-semibold ${
                          p.site_included
                            ? "border border-brand/40 bg-brand/[0.06] text-brand"
                            : "border border-line-4 text-body hover:border-ink"
                        }`}
                        title={
                          p.site_included
                            ? tx("Retirer « Mon site » de ce palier")
                            : tx("Inclure « Mon site » dans ce palier, sans supplément")
                        }
                      >
                        {p.site_included ? tx("Mon site inclus") : tx("Inclure Mon site")}
                      </button>
                    </form>
                  ) : null}
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
                      {tx("Supprimer")}</button>
                  </form>
                </div>
              </Card>
            ))
          )}
          <PlanForm atLimit={plans.length >= MAX_PLANS_PER_TENANT} unit={unite === "compte" ? "comptes" : "clients"} />
        </div>
      )}
    </div>
  );
}
