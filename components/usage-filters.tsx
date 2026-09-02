"use client";

import { usePhrase } from "@/components/locale-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, MonoLabel } from "@/components/ui";

// Filtres de l'historique de consommation. Ils vivent dans l'URL : un filtre
// posé se partage et se recharge, et la page reste un composant serveur.

interface Props {
  days: number;
  action: string;
  accountId: string;
  periods: number[];
  actions: { value: string; label: string }[];
  accounts: { id: string; name: string; kind: string }[];
}

const FIELD =
  "h-10 w-full rounded-control border border-line-4 bg-surface px-2.5 text-[14px] text-ink outline-none focus:border-ink";

export function UsageFilters({ days, action, accountId, periods, actions, accounts }: Props) {
  const tx = usePhrase();
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  return (
    <Card as="section" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <MonoLabel>{tx("Période")}</MonoLabel>
        <div className="flex flex-wrap gap-1.5">
          {periods.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setParam("jours", String(d))}
              aria-pressed={d === days}
              className={[
                "tap rounded-pill border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                d === days ? "border-brand bg-brand/10 text-brand" : "border-line-4 text-body hover:border-ink",
              ].join(" ")}
            >
              {d} {tx("jours")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <MonoLabel>{tx("Action")}</MonoLabel>
          <select value={action} onChange={(e) => setParam("action", e.target.value)} className={FIELD}>
            <option value="">{tx("Toutes les actions")}</option>
            {actions.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </label>

        {/* Un coach n'a qu'un compte : le filtre n'aurait rien à proposer. */}
        {accounts.length > 1 ? (
          <label className="flex flex-col gap-1.5">
            <MonoLabel>{tx("Compte")}</MonoLabel>
            <select value={accountId} onChange={(e) => setParam("compte", e.target.value)} className={FIELD}>
              <option value="">{tx("Tout le réseau")}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.kind === "platform" ? "plateforme" : a.kind === "reseller" ? "revendeur" : "coach"})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </Card>
  );
}
