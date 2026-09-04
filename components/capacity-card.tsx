import Link from "next/link";
import { tx } from "@/lib/i18n/request";
import { Card, MonoLabel } from "@/components/ui";
import type { TenantCapacity } from "@/lib/entitlements";

/**
 * Jauge de capacité d'un compte.
 *
 * La même colonne plafonne deux choses différentes selon l'étage : les clients
 * d'un coach, les comptes d'un revendeur. La jauge, elle, se lit pareil, d'où
 * ce composant partagé. Seuls changent les mots et la page où l'on va prendre
 * un palier plus large.
 *
 * Elle vire à l'alerte quand la limite est atteinte, parce que c'est le moment
 * où quelque chose est en train d'être refusé à quelqu'un : un client qui ne
 * peut plus s'inscrire chez son coach, un coach qui ne peut plus rejoindre son
 * revendeur. Le titulaire doit le savoir avant de l'apprendre par une plainte.
 */

export interface CapacityWording {
  /** Titre de la carte. */
  titre: string;
  /** Ce qui est compté, au singulier. */
  unite: string;
  /** Ce qui libère une place. */
  liberation: string;
  /** Page où prendre un palier plus large. */
  upgradeHref: string;
  upgradeLabel: string;
}

/** Les mots d'un coach : il compte des clients. */
export const CAPACITE_CLIENTS: CapacityWording = {
  titre: "Capacité clients",
  unite: "membre",
  liberation: "Une place se libère en supprimant un compte client.",
  upgradeHref: "/admin/abonnement",
  upgradeLabel: "passe à l'offre supérieure",
};

/** Les mots d'un revendeur : il compte des comptes, pas des clients. */
export const CAPACITE_COMPTES: CapacityWording = {
  titre: "Capacité du réseau",
  unite: "compte",
  liberation: "Une place se libère en supprimant un compte de ton réseau.",
  upgradeHref: "/admin/abonnement",
  upgradeLabel: "passe au palier supérieur",
};

export function CapacityCard({
  cap,
  wording = CAPACITE_CLIENTS,
}: {
  cap: TenantCapacity;
  wording?: CapacityWording;
}) {
  if (cap.unlimited) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <MonoLabel>{tx(wording.titre)}</MonoLabel>
          <span className="text-[14px] text-body">
            <span className="font-semibold text-ink">{tx("Illimité")}</span> · {cap.used} {tx(wording.unite)}
            {cap.used > 1 ? "s" : ""}
          </span>
        </div>
        <span className="rounded-pill border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[12px] font-medium text-brand">
          {tx("Sans limite")}
        </span>
      </Card>
    );
  }

  const limit = cap.limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((cap.used / limit) * 100)) : 100;
  const left = cap.remaining ?? 0;
  return (
    <Card className={`flex flex-col gap-2 ${cap.full ? "border-alert-line bg-alert" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <MonoLabel>{tx(wording.titre)}</MonoLabel>
        <span
          className={`font-archivo font-extrabold text-[18px] leading-none tracking-[-0.02em] tabular-nums ${
            cap.full ? "text-alert-ink" : "text-ink"
          }`}
        >
          {cap.used} / {limit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-2">
        <div className={`h-full rounded-pill ${cap.full ? "bg-alert-ink" : "bg-brand"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-[12.5px] leading-[1.6] ${cap.full ? "text-alert-ink" : "text-muted-2"}`}>
        {cap.full ? (
          <>
            {tx("Tu as atteint la capacité de ton palier.")} {tx(wording.liberation)}{" "}
            <Link href={wording.upgradeHref} className="font-semibold underline underline-offset-2">
              {tx(wording.upgradeLabel)}
            </Link>
            .
          </>
        ) : (
          <>
            {left} {tx("place")}
            {left > 1 ? "s" : ""} {tx("restante")}
            {left > 1 ? "s" : ""}. {tx(wording.liberation)}
          </>
        )}
      </p>
    </Card>
  );
}
