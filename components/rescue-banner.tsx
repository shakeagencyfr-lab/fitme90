"use client";

import Link from "next/link";
import { useT } from "@/components/locale-provider";
import type { RescueKind } from "@/lib/rescue-circuit";

/**
 * Le bandeau d'une séance de dépannage : ce que le client regarde, ce qui a
 * dû sauter, et le retour à sa séance normale. Il dit trois choses qu'on ne
 * peut pas laisser deviner : que ce n'est PAS le programme (il n'est pas
 * modifié), que certains mouvements n'ont pas d'équivalent ici, et que la
 * séance compte quand même quand on la valide.
 */
export function RescueBanner({
  day,
  kind,
  dropped,
  playable,
  canLog,
}: {
  day: number;
  kind: RescueKind;
  /** Mouvements sans équivalent avec ce matériel, sous leur nom de fiche. */
  dropped: string[];
  /** Faux quand rien n'a pu être remplacé : il n'y a pas de circuit à faire. */
  playable: boolean;
  canLog: boolean;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-2 rounded-card border border-brand/40 bg-alert p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-archivo font-bold text-[16px] text-ink">
          {t("rescue.title")} · {t(`rescue.${kind}.label`).toLowerCase()}
        </span>
        <Link href={`/app/seance?jour=${day}`} className="text-[13px] font-semibold text-brand hover:underline">
          {t("rescue.back")}
        </Link>
      </div>
      <p className="text-[13.5px] leading-[1.6] text-alert-ink">{t("rescue.intro")}</p>
      {dropped.length ? (
        <p className="text-[13px] leading-[1.6] text-alert-ink">
          {t("rescue.dropped")} <span className="font-semibold">{dropped.join(", ")}</span>. {t("rescue.droppedAfter")}
        </p>
      ) : null}
      {!playable ? <p className="text-[13px] font-semibold text-alert-ink">{t("rescue.empty")}</p> : null}
      {playable && canLog ? <p className="text-[12.5px] text-alert-ink/80">{t("rescue.validates")}</p> : null}
    </div>
  );
}
