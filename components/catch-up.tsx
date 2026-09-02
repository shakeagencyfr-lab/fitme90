import Link from "next/link";
import { Card, MonoLabel } from "@/components/ui";
import { getT } from "@/lib/i18n/server";

// Bloc « séances à rattraper » : liste les entraînements passés non validés,
// avec un lien direct vers chaque séance. Modèle « calendrier fixe » : les
// dates ne bougent pas, on rattrape quand on veut pendant ton programme.
export async function CatchUp({ items }: { items: { day: number; date: string }[] }) {
  if (!items.length) return null;
  const { t } = await getT();
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  return (
    <Card className="flex flex-col gap-3 border-[#C4471A]/30">
      <div className="flex items-center justify-between gap-2">
        <MonoLabel className="text-[#C4471A]">{t("regularity.catchUp")}</MonoLabel>
        <span className="font-mono text-[11px] text-muted-2">{t("regularity.sessionsCount", { n: items.length })}</span>
      </div>
      <p className="text-[13px] leading-[1.6] text-muted">{t("regularity.catchUpBody")}</p>
      <div className="flex flex-col gap-2">
        {shown.map((it) => (
          <Link
            key={it.day}
            href={`/app/seance?jour=${it.day}`}
            className="tap flex items-center justify-between gap-3 rounded-control border border-line px-3.5 py-3 transition-colors hover:border-ink"
          >
            <span className="text-[14px] text-ink">
              {t("common.day")} {it.day} <span className="text-muted-2">· {it.date}</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-brand">{t("regularity.catchUpCta")}</span>
          </Link>
        ))}
      </div>
      {extra > 0 ? (
        <div className="text-[12px] text-muted-2">
          {t("regularity.moreInAgenda", { n: extra })}
        </div>
      ) : null}
    </Card>
  );
}
