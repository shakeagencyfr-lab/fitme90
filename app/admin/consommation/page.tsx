import { redirect } from "next/navigation";
import { tx } from "@/lib/i18n/request";
import { getAdminOrNull } from "@/lib/admin";
import { tenantNode } from "@/lib/hierarchy";
import { usageHistory, scopeAccounts, modelLabel, driverLabel, type UsageRow } from "@/lib/ai-usage-log";
import { formatUsd } from "@/lib/ai-cost";
import { usdToEur, formatEurPrecise } from "@/lib/config";
import { Card, MonoLabel } from "@/components/ui";
import { UsageFilters } from "@/components/usage-filters";

export const metadata = { title: "Consommation IA" };
export const dynamic = "force-dynamic";

const PERIODS = [7, 30, 90];

const ACTIONS: { value: string; label: string }[] = [
  { value: "message", label: "Message coach IA" },
  { value: "recette", label: "Génération de recettes" },
  { value: "recette-photo", label: "Photo vers recette" },
  { value: "alternative", label: "Alternative d'exercice" },
  { value: "fiche-exercice", label: "Fiche exercice" },
  { value: "generation", label: "Génération de programme" },
  { value: "bloc", label: "Bloc suivant" },
  { value: "analyse-salle", label: "Analyse photo de la salle" },
  { value: "memoire", label: "Résumé de mémoire" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ jours?: string; action?: string; compte?: string }>;
}) {
  const ctx = await getAdminOrNull();
  const tenantId = ctx?.profile?.tenant_id ?? null;
  if (!tenantId) redirect("/admin");
  const sp = await searchParams;

  const node = await tenantNode(tenantId);
  const kind = node?.kind ?? "coach";
  // Un coach voit ses propres appels ; un revendeur ou la plateforme voient
  // tout ce qui se consomme sous eux, quel que soit le mode de fourniture.
  const scope = kind === "coach" ? "self" : "network";

  const days = PERIODS.includes(Number(sp.jours)) ? Number(sp.jours) : 30;
  const action = ACTIONS.some((a) => a.value === sp.action) ? sp.action! : "";
  const accountId = sp.compte ?? "";

  const [page, accounts] = await Promise.all([
    usageHistory(tenantId, scope, { days, action, accountId }),
    scopeAccounts(tenantId, scope),
  ]);
  const { rows, totals, truncated } = page;
  const usesCredits = totals.credits > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-archivo font-extrabold text-[clamp(26px,5vw,36px)] leading-[1.05] tracking-[-0.03em] text-ink">
          {tx("Consommation IA")}</h1>
        <p className="max-w-[74ch] text-[15px] leading-[1.6] text-muted">
          {scope === "network"
            ? "Chaque appel à l'IA passé sous ton réseau, détaillé : qui, quoi, quel modèle, combien de tokens, ce que ça a coûté et les crédits débités. Les comptes en clé personnelle y figurent comme ceux en crédits."
            : "Chaque appel à l'IA de tes clients, détaillé : qui, quoi, quel modèle, combien de tokens et ce que ça a coûté. Affiché que tu utilises ta propre clé ou des crédits."}
        </p>
      </div>

      <UsageFilters
        days={days}
        action={action}
        accountId={accountId}
        periods={PERIODS}
        actions={ACTIONS}
        accounts={accounts}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={tx("Appels IA")} value={totals.calls.toLocaleString("fr-FR")} />
        <Metric label={tx("Coût Anthropic")} value={formatUsd(totals.costUsd)} sub={formatEurPrecise(usdToEur(totals.costUsd))} />
        <Metric
          label={tx("Tokens")}
          value={`${((totals.inputTokens + totals.outputTokens) / 1000).toFixed(1)} k`}
          sub={`${(totals.cachedTokens / 1000).toFixed(1)} k en cache`}
        />
        <Metric
          label={tx("Crédits débités")}
          value={usesCredits ? totals.credits.toLocaleString("fr-FR") : "0"}
          sub={usesCredits ? undefined : "clé personnelle"}
        />
      </div>

      <Card as="section" className="flex flex-col gap-3 p-0">
        <div className="flex flex-col gap-0.5 px-5 pt-5">
          <div className="font-archivo font-bold text-[16px] text-ink">{tx("Historique d'utilisation")}</div>
          <p className="text-[13px] text-muted">
            {truncated
              ? `Les ${rows.length} appels les plus récents sur la période. Affine avec les filtres pour voir le reste.`
              : `${rows.length} appel${rows.length > 1 ? "s" : ""} sur la période, du plus récent au plus ancien.`}
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-muted-2">
            {tx("Aucun appel IA sur cette période avec ces filtres.")}</p>
        ) : (
          <>
            {/* Bureau : le tableau complet. */}
            <div className="hidden overflow-x-auto border-t border-line md:block">
              <table className="w-full min-w-[860px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-left text-muted-2">
                    {["Date", scope === "network" ? "Compte" : "Client", "Action", "Modèle", "Tokens", "Coût", "Crédits"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.07em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} title={driverLabel(r.driver, r.parts)} className="border-b border-line-2 last:border-0 hover:bg-surface-2">
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted">{fmtDate(r.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-ink">{scope === "network" ? r.accountName : r.personName ?? "·"}</div>
                        <div className="text-[11.5px] text-muted-2">
                          {scope === "network" ? r.personName ?? r.personEmail ?? "·" : r.personEmail ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-body">
                        {r.action}
                        {r.continuation ? <Suite /> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-muted">{modelLabel(r.model)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-muted">
                        {r.inputTokens.toLocaleString("fr-FR")} / {r.outputTokens.toLocaleString("fr-FR")}
                        <CacheBadges read={r.cacheReadTokens} write={r.cacheWriteTokens} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="tabular-nums text-ink">{formatEurPrecise(usdToEur(r.costUsd))}</div>
                        <div className="text-[11px] text-muted-2">{DRIVER_SHORT[r.driver]}</div>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums font-semibold text-ink">
                        {r.credits > 0 ? r.credits : <span className="font-normal text-muted-2">·</span>}
                        <RequestId id={r.requestId} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile : une carte par appel, le tableau à 7 colonnes n'y tient pas. */}
            <div className="flex flex-col border-t border-line md:hidden">
              {rows.map((r) => (
                <MobileRow key={r.id} row={r} showAccount={scope === "network"} />
              ))}
            </div>
          </>
        )}
      </Card>

      <p className="text-[12px] leading-[1.6] text-muted-2">
        {tx("Coût estimé d'après les tarifs publics Anthropic et les tokens réellement consommés. Deux ratios expliquent l'essentiel des écarts entre deux lignes : une sortie coûte 5 fois une entrée, et une écriture de cache 12,5 fois une lecture (125 % contre 10 % du prix d'entrée). Le cache s'écrit au premier échange d'une conversation puis se relit pendant 5 minutes. Ce coût sert au pilotage, pas à la facturation ; les crédits, eux, sont le débit réel du portefeuille.")}</p>
    </div>
  );
}

function MobileRow({ row, showAccount }: { row: UsageRow; showAccount: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line-2 px-5 py-3 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-[14px] text-ink">
          {row.action}
          {row.continuation ? <Suite /> : null}
        </span>
        <span className="whitespace-nowrap tabular-nums text-[13px] text-ink">{formatEurPrecise(usdToEur(row.costUsd))}</span>
      </div>
      <div className="text-[12.5px] text-body">
        {showAccount ? `${row.accountName} · ` : ""}
        {row.personName ?? row.personEmail ?? "·"}
      </div>
      <div className="text-[11.5px] text-muted-2">{driverLabel(row.driver, row.parts)}</div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-muted-2">
        <span className="tabular-nums">{fmtDate(row.createdAt)}</span>
        <span aria-hidden>·</span>
        <span>{modelLabel(row.model)}</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{row.inputTokens.toLocaleString("fr-FR")} / {row.outputTokens.toLocaleString("fr-FR")} tokens</span>
        <CacheBadges read={row.cacheReadTokens} write={row.cacheWriteTokens} />
        {row.credits > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span className="font-semibold text-brand tabular-nums">{row.credits} crédit{row.credits > 1 ? "s" : ""}</span>
          </>
        ) : null}
      </div>
      <RequestId id={row.requestId} />
    </div>
  );
}

/**
 * Marque un appel qui prolonge l'action de la ligne précédente : le second tour
 * d'outils d'un message, la relance d'une génération. Sans elle, on lirait deux
 * messages là où le client n'en a envoyé qu'un.
 */
function Suite() {
  return (
    <span
      title="Appel supplémentaire de la même action : il coûte, mais il ne compte pas comme une action de plus."
      className="ml-1.5 rounded-pill bg-surface-2 px-1.5 py-0.5 align-middle font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted-2"
    >
      suite
    </span>
  );
}

/**
 * L'identifiant de requête Anthropic. C'est lui qui rend le journal
 * vérifiable : la même chaîne se retrouve dans la console Anthropic, en face
 * du même montant. Discret par défaut, il ne sert qu'au moment où l'on doute.
 */
function RequestId({ id }: { id: string | null }) {
  if (!id) return null;
  return (
    <div className="font-mono text-[10px] leading-[1.4] text-muted-2" title={id}>
      {id.length > 16 ? `${id.slice(0, 16)}…` : id}
    </div>
  );
}

const DRIVER_SHORT: Record<UsageRow["driver"], string> = {
  sortie: "réponse longue",
  "cache-ecrit": "cache écrit",
  "cache-lu": "cache lu",
  entree: "contexte",
};

/**
 * Lecture et écriture de cache ne se confondent pas : l'écriture est facturée
 * 125 % d'un token d'entrée, la lecture 10 %. Les fondre en un seul « cache »
 * rendait inexplicable un écart de prix de 4x entre deux lignes voisines.
 */
function CacheBadges({ read, write }: { read: number; write: number }) {
  if (read + write === 0) return null;
  return (
    <>
      {write > 0 ? (
        <span className="ml-1.5 rounded-pill bg-[#C4471A]/10 px-1.5 py-0.5 text-[11px] text-[#C4471A]">
          {(write / 1000).toFixed(1)}k écrit
        </span>
      ) : null}
      {read > 0 ? (
        <span className="ml-1.5 rounded-pill bg-brand/10 px-1.5 py-0.5 text-[11px] text-brand">
          {(read / 1000).toFixed(1)}k lu
        </span>
      ) : null}
    </>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <MonoLabel>{label}</MonoLabel>
      <div className="font-archivo font-extrabold text-[22px] leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</div>
      {sub ? <div className="text-[11.5px] text-muted-2">{sub}</div> : null}
    </Card>
  );
}
