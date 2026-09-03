import { tx } from "@/lib/i18n/request";
import { capacityView } from "@/lib/plan-view";

// Jauge de places clients. L'écran écrivait « 1 / 1 client » en petit gris :
// impossible de voir qu'on est AU COMPLET, alors que c'est le fait qui décide
// s'il faut changer d'offre ou non.
export function CapacityGauge({
  used,
  limit,
  unlimited,
}: {
  used: number;
  limit: number | null;
  unlimited: boolean;
}) {
  const v = capacityView({ used, limit, unlimited });

  if (v.unlimited) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="font-archivo font-extrabold text-[20px] leading-none tracking-[-0.02em] text-ink">
            {v.used}
          </span>
          <span className="text-[13.5px] text-body">
            {v.used > 1 ? tx("clients inscrits") : tx("client inscrit")}</span>
        </div>
        <p className="text-[12.5px] text-muted-2">{tx("Places illimitées : tu peux accueillir autant de clients que tu veux.")}</p>
      </div>
    );
  }

  // Mêmes couleurs que la carte « Capacité clients » du tableau de bord : la
  // marque tant qu'il reste des places, l'alerte quand il n'y en a plus.
  const bar = v.tone === "full" ? "bg-alert-ink" : "bg-brand";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-archivo font-extrabold text-[20px] leading-none tracking-[-0.02em] text-ink">
            {v.used} / {v.limit}
          </span>
          <span className="text-[13.5px] text-body">
            {(v.limit ?? 0) > 1 ? tx("places clients occupées") : tx("place client occupée")}</span>
        </div>
        {v.tone === "full" ? (
          <span className="rounded-pill border border-alert-line bg-alert px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-alert-ink">
            {tx("Complet")}</span>
        ) : (
          <span className="text-[12.5px] font-semibold text-muted">
            {v.remaining} {(v.remaining ?? 0) > 1 ? tx("places libres") : tx("place libre")}</span>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuenow={v.used}
        aria-valuemin={0}
        aria-valuemax={v.limit ?? 0}
        aria-label={tx("Places clients occupées")}
        className="h-2 w-full overflow-hidden rounded-pill bg-surface-2"
      >
        <div className={`h-full rounded-pill transition-[width] duration-500 ${bar}`} style={{ width: `${v.ratio * 100}%` }} />
      </div>

      {v.tone === "full" ? (
        <p className="text-[12.5px] leading-[1.55] text-alert-ink">
          {tx("Toutes tes places sont prises : un nouveau client ne pourra pas s'inscrire tant que tu n'auras pas pris une offre plus grande.")}</p>
      ) : v.tone === "tight" ? (
        <p className="text-[12.5px] leading-[1.55] text-muted">
          {tx("Tu approches de ta limite. Pense à passer à l'offre supérieure avant d'être au complet.")}</p>
      ) : null}
    </div>
  );
}
