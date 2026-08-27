import Link from "next/link";
import { Card, MonoLabel } from "@/components/ui";

// Bloc « séances à rattraper » : liste les entraînements passés non validés,
// avec un lien direct vers chaque séance. Modèle « calendrier fixe » : les
// dates ne bougent pas, on rattrape quand on veut pendant les 90 jours.
export function CatchUp({ items }: { items: { day: number; date: string }[] }) {
  if (!items.length) return null;
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  return (
    <Card className="flex flex-col gap-3 border-[#C4471A]/30">
      <div className="flex items-center justify-between gap-2">
        <MonoLabel className="text-[#C4471A]">À rattraper</MonoLabel>
        <span className="font-mono text-[11px] text-muted-2">
          {items.length} séance{items.length > 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-[13px] leading-[1.6] text-muted">
        Ces séances d&apos;entraînement sont passées sans être validées. Pas de panique, tu
        peux les rattraper quand tu veux pendant tes 90 jours.
      </p>
      <div className="flex flex-col gap-2">
        {shown.map((it) => (
          <Link
            key={it.day}
            href={`/app/seance?jour=${it.day}`}
            className="tap flex items-center justify-between gap-3 rounded-control border border-line px-3.5 py-3 transition-colors hover:border-ink"
          >
            <span className="text-[14px] text-ink">
              Jour {it.day} <span className="text-muted-2">· {it.date}</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-brand">Rattraper →</span>
          </Link>
        ))}
      </div>
      {extra > 0 ? (
        <div className="text-[12px] text-muted-2">
          et {extra} autre{extra > 1 ? "s" : ""}, visibles dans l&apos;agenda.
        </div>
      ) : null}
    </Card>
  );
}
