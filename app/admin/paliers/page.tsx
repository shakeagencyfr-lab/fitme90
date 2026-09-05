import { getAdminOrNull } from "@/lib/admin";
import { tenantNode } from "@/lib/hierarchy";
import { tx } from "@/lib/i18n/request";
import { listPlans, freePlanOf, MAX_PLANS_PER_TENANT, type Plan } from "@/lib/plans";
import { resellerRights } from "@/lib/cost-view";
import { formatEuros } from "@/lib/config";
import { PlanForm } from "@/components/plan-form";
import { FreePlanForm } from "@/components/free-plan-form";
import { togglePlan, togglePlanWhitelabel, removePlan } from "@/app/admin/actions";
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

function Pill({ children, tone = "brand" }: { children: React.ReactNode; tone?: "brand" | "muted" }) {
  return (
    <span
      className={
        tone === "brand"
          ? "rounded-pill bg-brand/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-brand"
          : "rounded-pill border border-line-4 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-2"
      }
    >
      {children}
    </span>
  );
}

/**
 * Les paliers d'un vendeur.
 *
 * Le palier gratuit d'abord, comme une carte à part : il n'a ni prix ni
 * bouton Supprimer, il s'ouvre ou se ferme. Puis les paliers payants, avec ce
 * que chacun porte : capacité, fourniture d'IA, marque blanche, et pour la
 * plateforme les droits qu'il ouvre au revendeur.
 */
export default async function AdminPlansPage() {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  // La plateforme vend à des revendeurs : son palier plafonne des comptes de
  // réseau, pas des clients. Un revendeur vend à des coachs : des clients.
  const node = tenantId ? await tenantNode(tenantId) : null;
  const unite: "client" | "compte" = node?.kind === "platform" ? "compte" : "client";
  const sells: "resellers" | "coaches" = node?.kind === "platform" ? "resellers" : "coaches";

  // Un revendeur ne vend que ce que son propre palier lui ouvre.
  const [plans, free, rights] = tenantId
    ? await Promise.all([listPlans(tenantId), freePlanOf(tenantId), resellerRights(tenantId)])
    : [[], null, { byok: true, credits: true }];
  const payants = plans.filter((p) => !p.is_free);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Paliers")}</h1>
        <p className="max-w-[70ch] text-[15px] leading-[1.6] text-muted">
          {unite === "compte"
            ? tx("Les formules que tu proposes à tes revendeurs. Chaque palier fixe un prix, le nombre de comptes coach ou salle qu'ils pourront ouvrir, comment l'IA leur est fournie, et ce qu'ils auront le droit de proposer à leurs coachs. Des frais de mise en place, facturés une fois sur la première échéance, peuvent s'ajouter.")
            : tx("Les formules que tu proposes aux coachs et salles que tu héberges. Chaque palier fixe un prix, un nombre de clients inclus, comment l'IA est fournie, et si le pack marque blanche est compris. Des frais de mise en place, facturés une fois sur la première échéance, peuvent s'ajouter.")}</p>
      </div>

      {!tenantId || !free ? (
        <Alert>{tx("Aucun compte (tenant) n'est rattaché à ton profil.")}</Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="font-archivo font-bold text-[17px] text-ink">{tx("Palier gratuit")}</div>
          <FreePlanForm plan={free} sells={sells} byokAllowed={rights.byok} />

          <div className="mt-2 font-archivo font-bold text-[17px] text-ink">{tx("Paliers payants")}</div>
          {payants.length === 0 ? (
            <Alert tone="info">{tx("Aucun palier payant pour l'instant. Crée ta première formule ci-dessous.")}</Alert>
          ) : (
            payants.map((p) => (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-archivo font-bold text-[16px] text-ink">{p.name}</span>
                    {!p.is_active ? <Pill tone="muted">{tx("Inactif")}</Pill> : null}
                    <Pill>{clientsLabel(p, unite)}</Pill>
                    <Pill>{p.ai_supply === "credits" ? tx("IA en crédits") : tx("IA en clé personnelle")}</Pill>
                    {p.whitelabel_included ? <Pill>{tx("Marque blanche incluse")}</Pill> : null}
                    {sells === "resellers" ? (
                      <>
                        {p.coach_byok_allowed ? <Pill tone="muted">{tx("Coachs en clé perso")}</Pill> : null}
                        {p.coach_credits_allowed ? <Pill tone="muted">{tx("Revente de crédits")}</Pill> : null}
                      </>
                    ) : null}
                  </div>
                  <span className="text-[13px] text-body">
                    {priceLabel(p)}
                    {p.setup_fee_cents > 0 ? ` · ${tx("mise en place")} ${formatEuros(p.setup_fee_cents)} ${tx("sur la première échéance")}` : ""}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* La seule chose qu'on ait de bonnes raisons de changer sur
                      un palier déjà vendu : le prix et la capacité, eux,
                      décrivent ce que les abonnés ont acheté. */}
                  <form action={togglePlanWhitelabel}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="included" value={p.whitelabel_included ? "" : "on"} />
                    <button
                      type="submit"
                      className={`tap rounded-btn px-3.5 py-2 text-[13px] font-semibold ${
                        p.whitelabel_included
                          ? "border border-brand/40 bg-brand/[0.06] text-brand"
                          : "border border-line-4 text-body hover:border-ink"
                      }`}
                      title={
                        p.whitelabel_included
                          ? tx("Retirer la marque blanche de ce palier")
                          : tx("Inclure la marque blanche dans ce palier, sans supplément")
                      }
                    >
                      {p.whitelabel_included ? tx("Marque blanche incluse") : tx("Inclure la marque blanche")}
                    </button>
                  </form>
                  <form action={togglePlan}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={p.is_active ? "" : "on"} />
                    <button
                      type="submit"
                      className="tap rounded-btn border border-line-4 px-3.5 py-2 text-[13px] font-semibold text-body hover:border-ink"
                    >
                      {p.is_active ? tx("Désactiver") : tx("Activer")}
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
          <PlanForm atLimit={payants.length >= MAX_PLANS_PER_TENANT} unit={unite === "compte" ? "comptes" : "clients"} byokAllowed={rights.byok} />
        </div>
      )}
    </div>
  );
}
