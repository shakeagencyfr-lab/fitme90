import Link from "next/link";
import type { ReactNode } from "react";
import { tx } from "@/lib/i18n/request";
import { trendPct } from "@/lib/dashboard-math";
import type { CoachDashboard, ResellerDashboard } from "@/lib/dashboard";
import { formatEuros, usdToEur } from "@/lib/config";
import { Card, MonoLabel } from "@/components/ui";
import { KeyFigure, MonthBars, RankList, FillBar } from "@/components/dashboard-cards";

/**
 * Les deux lectures du tableau de bord. Elles ne vont pas chercher leurs
 * données : la page s'en charge et les leur passe. Séparer ainsi permet de les
 * afficher avec des chiffres fictifs pour travailler la mise en page, sans
 * ouvrir de session ni toucher à la base.
 */

/** Titre et sous-titre de l'écran, identiques pour les deux métiers. */
function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-archivo text-[26px] font-extrabold tracking-[-0.03em] text-ink sm:text-[30px]">{title}</h1>
      <p className="text-[14px] leading-[1.6] text-muted">{sub}</p>
    </div>
  );
}

const euros = (cents: number) => formatEuros(cents);
/** Format court pour les étiquettes de barres : « 1,2 k€ » plutôt que « 1 240 € ». */
const shortEuros = (cents: number) => {
  const e = cents / 100;
  return e >= 1000 ? `${(e / 1000).toFixed(1).replace(".", ",")} k€` : `${Math.round(e)} €`;
};

// ───────────────────────────── Coach et salles ─────────────────────────────

export function CoachView({ d }: { d: CoachDashboard }) {
  const aiEur = usdToEur(d.ai.byokUsd);

  return (
    <div className="flex flex-col gap-5">
      <Head title={tx("Tableau de bord")} sub={tx("Tes ventes, tes clients et ta consommation IA, sur les six derniers mois.")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KeyFigure
          label={tx("Encaissé ce mois")}
          value={euros(d.revenue.thisMonthCents)}
          trend={trendPct(d.revenue.thisMonthCents, d.revenue.prevMonthCents)}
          accent
          hint={
            d.revenue.mrrCents > 0
              ? `${tx("dont")} ${euros(d.revenue.mrrCents)} ${tx("d'abonnements récurrents")}`
              : tx("Ventes uniques du mois.")
          }
        />
        <KeyFigure
          label={tx("Revenu récurrent")}
          value={euros(d.revenue.mrrCents)}
          hint={
            d.subs.live > 0
              ? `${d.subs.live} ${d.subs.live > 1 ? tx("abonnements actifs") : tx("abonnement actif")}`
              : tx("Aucun abonnement en cours.")
          }
        />
        <KeyFigure
          label={tx("Clients payants")}
          value={d.clients.paid}
          trend={trendPct(d.clients.newThisMonth, d.clients.newPrevMonth)}
          hint={
            <>
              {d.clients.newThisMonth} {tx("ce mois")}
              {d.clients.pending > 0 ? ` · ${d.clients.pending} ${tx("en attente de paiement")}` : ""}
              <FillBar used={d.capacity.used} limit={d.capacity.limit} />
              {d.capacity.unlimited
                ? null
                : `${d.capacity.used} / ${d.capacity.limit} ${tx("places utilisées")}`}
            </>
          }
        />
        <KeyFigure
          label={tx("Encaissé depuis le début")}
          value={euros(d.revenue.lifetimeCents)}
          hint={
            <>
              {tx("Ventes uniques, hors abonnements.")}
              {d.revenue.refundedCents > 0 ? (
                <>
                  {" "}
                  {euros(d.revenue.refundedCents)} {tx("remboursés, déjà déduits.")}
                </>
              ) : null}
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MonthBars
          points={d.months}
          metric="oneTimeCents"
          title={tx("Ventes uniques par mois")}
          format={shortEuros}
        />
        <MonthBars
          points={d.months}
          metric="clients"
          title={tx("Nouveaux clients par mois")}
          format={(n) => String(n)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RankList
          title={tx("Ce que rapporte chaque plan")}
          rows={d.offers.map((o) => ({
            name: o.name,
            note: `${o.sales} ${o.sales > 1 ? tx("ventes") : tx("vente")} · ${euros(o.cents)}`,
            value: o.cents,
          }))}
          empty={tx("Aucune vente pour l'instant. Crée un plan et partage ta page publique.")}
        />

        <Card className="flex flex-col gap-4">
          <MonoLabel>{tx("Prospects et conversion")}</MonoLabel>
          <div className="grid grid-cols-3 gap-3">
            <Figure value={d.prospects.total} label={tx("prospects")} />
            <Figure value={d.prospects.thisMonth} label={tx("ce mois")} />
            <Figure value={`${d.prospects.conversionPct} %`} label={tx("convertis")} />
          </div>
          <p className="text-[12.5px] leading-[1.6] text-muted">
            {tx("Un prospect est quelqu'un qui a demandé le mini-programme gratuit. Le taux compare tes clients payants à ce total.")}</p>
          <Link href="/admin/prospects" className="w-fit text-[13.5px] font-semibold text-brand hover:underline">
            {tx("Voir mes prospects")} →
          </Link>
        </Card>
      </div>

      {/* Trois lectures, une par façon d'obtenir l'IA. Un coach qui achète
          des crédits ne voit jamais de dollars : il y lirait la marge de son
          revendeur. */}
      <Card className="flex flex-col gap-4">
        <MonoLabel>{tx("Consommation IA du mois")}</MonoLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {d.ai.view === "credits" ? (
            <Figure value={(d.ai.credits ?? 0).toLocaleString("fr-FR")} label={tx("crédits restants")} />
          ) : d.ai.view === "included" ? (
            <Figure value={tx("Comprise")} label={tx("dans ton abonnement")} />
          ) : (
            <Figure value={`≈ ${euros(Math.round(aiEur * 100))}`} label={tx("sur ta clé Anthropic")} />
          )}
          <Figure value={d.ai.calls.toLocaleString("fr-FR")} label={tx("appels IA")} />
          {d.ai.view === "credits" ? (
            <Figure value={d.ai.creditsSpent.toLocaleString("fr-FR")} label={tx("crédits débités ce mois")} />
          ) : d.ai.view === "usd" ? (
            <Figure
              value={d.clients.paid > 0 ? `≈ ${euros(Math.round((aiEur * 100) / d.clients.paid))}` : "·"}
              label={tx("par client payant")}
            />
          ) : (
            <Figure
              value={d.clients.paid > 0 ? Math.round(d.ai.calls / d.clients.paid).toLocaleString("fr-FR") : "·"}
              label={tx("appels par client payant")}
            />
          )}
        </div>
        <p className="text-[12.5px] leading-[1.6] text-muted">
          {d.ai.view === "credits"
            ? tx("Les crédits débités depuis le 1er du mois, action par action. Le détail par client est dans Consommation.")
            : d.ai.view === "included"
              ? tx("L'IA de tes clients est comprise dans ton abonnement : rien ne t'est débité par action. Le détail des appels est dans Consommation.")
              : tx("Estimation à partir des tokens réellement consommés depuis le 1er du mois. Le détail par client est dans Consommation.")}</p>
        <Link href="/admin/consommation" className="w-fit text-[13.5px] font-semibold text-brand hover:underline">
          {tx("Voir le détail")} →
        </Link>
      </Card>
    </div>
  );
}

// ─────────────────────────── Revendeurs et plateforme ───────────────────────────

export function NetworkView({ d }: { d: ResellerDashboard }) {
  const aiEur = usdToEur(d.ai.byokUsd);

  return (
    <div className="flex flex-col gap-5">
      <Head
        title={tx("Tableau de bord")}
        sub={tx("Ton réseau, son revenu récurrent et les comptes qui demandent une action.")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KeyFigure
          label={tx("Revenu récurrent")}
          value={euros(d.revenue.mrrCents)}
          trend={trendPct(d.revenue.mrrCents, d.revenue.prevMrrCents)}
          accent
          hint={`${d.accounts.live} ${d.accounts.live > 1 ? tx("comptes qui facturent") : tx("compte qui facture")}`}
        />
        <KeyFigure
          label={tx("Comptes du réseau")}
          value={d.accounts.total}
          hint={
            <>
              {d.accounts.coaches} {tx("coachs ou salles")}
              {d.accounts.resellers > 0 ? ` · ${d.accounts.resellers} ${tx("revendeurs")}` : ""}
              {d.accounts.suspended > 0 ? ` · ${d.accounts.suspended} ${tx("gelés")}` : ""}
            </>
          }
        />
        <KeyFigure
          label={tx("Clients finaux")}
          value={d.endClients}
          hint={tx("Servis par l'ensemble de ton réseau.")}
        />
        <KeyFigure
          label={tx("Revenu annualisé")}
          value={euros(d.revenue.mrrCents * 12)}
          hint={tx("Le récurrent d'aujourd'hui, projeté sur douze mois.")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MonthBars
          points={d.months}
          metric="clients"
          title={tx("Comptes ouverts par mois")}
          format={(n) => String(n)}
        />
        <RankList
          title={tx("Répartition par palier")}
          rows={d.plans.map((p) => ({
            name: p.name,
            note: `${p.count} ${p.count > 1 ? tx("comptes") : tx("compte")} · ${euros(p.mrrCents)}${tx("/mois")}`,
            value: p.mrrCents,
          }))}
          empty={tx("Aucun compte rattaché pour l'instant.")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3.5">
          <MonoLabel>{tx("À traiter")}</MonoLabel>
          {d.attention.length === 0 ? (
            <p className="text-[13.5px] leading-[1.6] text-muted">
              {tx("Rien à signaler : aucun compte gelé, impayé, saturé ou sans client.")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.attention.map((a) => (
                <li key={`${a.name}-${a.reason}`} className="flex items-center justify-between gap-3 border-b border-line-2 pb-2 last:border-0 last:pb-0">
                  <span className="truncate text-[14px] font-semibold text-ink">{a.name}</span>
                  <span className="shrink-0 rounded-pill bg-alert px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-alert-ink">
                    {reasonLabel(a.reason)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/reseau" className="w-fit text-[13.5px] font-semibold text-brand hover:underline">
            {tx("Ouvrir mon réseau")} →
          </Link>
        </Card>

        <Card className="flex flex-col gap-4">
          <MonoLabel>{tx("IA fournie au réseau ce mois")}</MonoLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Un revendeur en crédits plateforme lit ce que la plateforme lui
                a débité, jamais un coût Anthropic : ce chiffre contiendrait la
                marge de la plateforme. */}
            {d.ai.view === "credits" ? (
              <Figure value={d.ai.creditsSpent.toLocaleString("fr-FR")} label={tx("crédits débités")} />
            ) : (
              <Figure value={`≈ ${euros(Math.round(aiEur * 100))}`} label={tx("coût réel")} />
            )}
            <Figure value={d.ai.calls.toLocaleString("fr-FR")} label={tx("appels")} />
            <Figure
              value={d.ai.credits != null ? d.ai.credits.toLocaleString("fr-FR") : "·"}
              label={tx("crédits en stock")}
            />
          </div>
          <p className="text-[12.5px] leading-[1.6] text-muted">
            {d.ai.view === "credits"
              ? tx("Ce que la plateforme t'a débité pour l'IA de tes coachs depuis le 1er du mois. Les comptes dispensés paient leur propre clé et ne comptent pas ici.")
              : tx("Ce que tu absorbes pour les comptes auxquels tu fournis l'IA. Les comptes en BYOK paient leur propre clé et ne comptent pas ici.")}</p>
          <Link href="/admin/ia-revenu" className="w-fit text-[13.5px] font-semibold text-brand hover:underline">
            {tx("Voir mon revenu IA")} →
          </Link>
        </Card>
      </div>
    </div>
  );
}

function reasonLabel(r: "suspended" | "unpaid" | "full" | "empty"): string {
  switch (r) {
    case "suspended":
      return tx("Gelé");
    case "unpaid":
      return tx("Impayé");
    case "full":
      return tx("Saturé");
    default:
      return tx("Sans client");
  }
}

function Figure({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-archivo text-[22px] font-extrabold leading-none tracking-[-0.03em] text-ink">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">{label}</span>
    </div>
  );
}
