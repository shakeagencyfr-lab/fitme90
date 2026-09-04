import { tx } from "@/lib/i18n/request";
import { Card, MonoLabel } from "@/components/ui";
import { revenueReport, type RevenueLine } from "@/lib/platform-revenue";
import { formatEurPrecise, formatEuros, usdToEur } from "@/lib/config";

/**
 * Ce que la revente d'IA a rapporté ce mois-ci.
 *
 * L'écran « Revenu IA » réglait le prix du crédit et le mode de fourniture,
 * sans jamais dire ce que ça donne. On voyait les leviers, pas le résultat.
 * Ce bloc arrive donc en tête : le résultat d'abord, les réglages ensuite.
 *
 * La carte la moins évidente est la troisième, et c'est la plus utile : ce
 * qu'un crédit consommé a RÉELLEMENT coûté, en face de son prix de vente. Un
 * crédit ne coûte pas la même chose selon qu'il paie un message du Coach IA ou
 * une part de génération de programme ; tant que les deux nombres s'éloignent,
 * la marge suit ce que le réseau consomme plutôt que ce qui a été décidé.
 */
export async function AiRevenueSummary({
  tenantId,
  creditPriceCents,
}: {
  tenantId: string;
  /** Prix auquel CE compte vend le crédit, pour la comparaison. */
  creditPriceCents: number;
}) {
  const { lines, totals, sinceIso } = await revenueReport(tenantId);
  if (lines.length === 0) return null;

  const depuis = new Date(sinceIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const prix = Math.max(0, creditPriceCents) / 100;
  const surCredits = lines.filter((l) => l.onCredits);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <MonoLabel>{tx("Crédits vendus")}</MonoLabel>
          <Chiffre>{totals.creditsSold.toLocaleString("fr-FR")}</Chiffre>
          <Sous>
            {formatEuros(totals.revenueCents)} {tx("encaissés depuis le")} {depuis}
          </Sous>
        </Card>
        <Card className="flex flex-col gap-1">
          <MonoLabel>{tx("Coût IA réel")}</MonoLabel>
          <Chiffre>{formatEurPrecise(usdToEur(totals.costUsd))}</Chiffre>
          <Sous>
            {totals.creditsSpent.toLocaleString("fr-FR")} {tx("crédits consommés par le réseau")}
          </Sous>
        </Card>
        <Card className={`flex flex-col gap-1 ${totals.marginEur < 0 ? "border-alert-line bg-alert" : ""}`}>
          <MonoLabel>{tx("Marge du mois")}</MonoLabel>
          <Chiffre alerte={totals.marginEur < 0}>{formatEurPrecise(totals.marginEur)}</Chiffre>
          <Sous>
            {surCredits.length} {surCredits.length > 1 ? tx("comptes en crédits") : tx("compte en crédits")}
            {lines.length > surCredits.length ? ` · ${lines.length - surCredits.length} ${tx("en clé perso")}` : ""}
          </Sous>
        </Card>
      </div>

      {totals.costPerCreditEur != null ? (
        <Card className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <MonoLabel>{tx("Ce qu'un crédit te coûte vraiment")}</MonoLabel>
            {prix > 0 ? (
              <span className="font-archivo text-[15px] font-bold text-brand">
                ×{(prix / totals.costPerCreditEur).toFixed(1)} {tx("de marge")}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <span className="flex items-baseline gap-2">
              <span className="font-archivo text-[22px] font-extrabold tabular-nums text-ink">
                {formatEurPrecise(totals.costPerCreditEur)}
              </span>
              <span className="text-[13px] text-muted">{tx("coût réel")}</span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-archivo text-[22px] font-extrabold tabular-nums text-ink">
                {formatEurPrecise(prix)}
              </span>
              <span className="text-[13px] text-muted">{tx("prix de vente")}</span>
            </span>
          </div>
          <p className="text-[12.5px] leading-[1.6] text-muted-2">
            {tx("Un crédit ne coûte pas la même chose selon ce qu'il paie : un message du Coach IA revient bien moins cher qu'une part de génération de programme. Si ce coût réel s'éloigne du prix de vente, ta marge dépend de ce que ton réseau consomme plutôt que de ce que tu as décidé.")}
          </p>
        </Card>
      ) : null}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-muted-2">
                {["Compte", "Crédits vendus", "Encaissé", "Consommés", "Coût IA", "Marge"].map((h) => (
                  <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.08em]">
                    {tx(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <Ligne key={l.tenantId} l={l} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[12.5px] leading-[1.6] text-muted-2">
        {tx("Un compte en clé perso règle son IA directement à Anthropic : il n'apparaît ni en recette ni en coût. Les crédits offerts ne comptent pas en recette non plus.")}
      </p>
    </div>
  );
}

function Ligne({ l }: { l: RevenueLine }) {
  const marge = l.revenueCents / 100 - usdToEur(l.costUsd);
  const tiret = <span className="text-muted-2">{"—"}</span>;
  return (
    <tr className="border-b border-line-2 last:border-0">
      <td className="px-4 py-3">
        <span className="flex flex-col leading-tight">
          <span className="font-semibold text-ink">{l.name}</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-2">
            {l.onCredits ? tx("crédits") : tx("clé perso")}
          </span>
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-body">{l.creditsSold.toLocaleString("fr-FR")}</td>
      <td className="px-4 py-3 tabular-nums text-body">{formatEuros(l.revenueCents)}</td>
      <td className="px-4 py-3 tabular-nums text-body">{l.creditsSpent.toLocaleString("fr-FR")}</td>
      <td className="px-4 py-3 tabular-nums text-body">
        {l.onCredits ? formatEurPrecise(usdToEur(l.costUsd)) : tiret}
      </td>
      <td className={`px-4 py-3 tabular-nums font-semibold ${marge < 0 ? "text-alert-ink" : "text-ink"}`}>
        {l.onCredits ? formatEurPrecise(marge) : <span className="font-normal">{tiret}</span>}
      </td>
    </tr>
  );
}

function Chiffre({ children, alerte = false }: { children: React.ReactNode; alerte?: boolean }) {
  return (
    <span
      className={`font-archivo text-[26px] font-extrabold leading-none tracking-[-0.02em] tabular-nums ${
        alerte ? "text-alert-ink" : "text-ink"
      }`}
    >
      {children}
    </span>
  );
}

function Sous({ children }: { children: React.ReactNode }) {
  return <span className="text-[12.5px] leading-[1.45] text-muted-2">{children}</span>;
}
